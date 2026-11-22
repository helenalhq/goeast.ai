import { randomUUID, timingSafeEqual } from "node:crypto";
import OpenAI from "openai";
import { DECISION_UUID } from "./decision-config";
import { decisionFingerprint, decisionInput, record } from "./decision-core";
import { generateLiveDecisionReport } from "./decision-generation";
import { decisionLiveCheckoutAllowed, decisionLiveWebhookDestinationMatches, isDecisionLiveProduct } from "./decision-live-policy";
import { buildDecisionLiveCheckout, decisionLiveAmount, decisionLiveTransactionOrder, matchesLiveHostedCheckout,
  normalizeDecisionLiveCheckout, normalizeDecisionLiveWebhook, reconcileDecisionLiveRefund } from "./decision-live-provider";
import { decisionLivePresaleRuntime, decisionLiveRuntime, liveCheckoutConfigured, type LiveRuntime } from "./decision-live-runtime-config";
import { checkLiveDbIsolation, liveCallbackDb, liveOwnerDb, type LiveClaim, type LiveOrder } from "./decision-live-store";
import { DECISION_CENTS, DECISION_CURRENCY } from "./decision-types";
import { createClient } from "./supabase/server";

function reply(data:unknown,status=200) {
  return Response.json(data,{status,headers:{"Cache-Control":"private, no-store, max-age=0","X-Robots-Tag":"noindex, nofollow, noarchive"}});
}
const unavailable=()=>reply({error:"Decision reports are not available here."},404);
const retry=()=>reply({error:"Decision reports are temporarily unavailable. Try again shortly."},503);
const NOTICE_VERSION="p1-live-data-use-v1";
const hold=()=>reply({error:"Checkout is being verified. Do not pay again. Check your decision reports or contact support."},409);
const ignored=()=>reply({received:true,ignored:true});

async function boundedBody(stream:ReadableStream<Uint8Array>|null,max:number) {
  if (!stream) return Buffer.alloc(0);
  const reader=stream.getReader();
  const chunks:Uint8Array[]=[];
  let size=0;
  try {
    for (;;) {
      const item=await reader.read();
      if (item.done) return Buffer.concat(chunks,size);
      size+=item.value.byteLength;
      if (size>max) { void reader.cancel().catch(()=>{}); return null; }
      chunks.push(item.value);
    }
  } finally {reader.releaseLock();}
}

function excessiveLength(value:string|null, max:number) {
  return value!==null && (!/^\d+$/.test(value) || Number(value)>max);
}

async function payload(request:Request, origin:string) {
  if (request.headers.get("origin")!==origin || request.headers.get("sec-fetch-site")==="cross-site"
      || !/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")??"")
      || excessiveLength(request.headers.get("content-length"),10_000)) return null;
  try {
    const raw=await boundedBody(request.body,10_000);
    return raw ? record(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw))) : null;
  } catch {return null;}
}

function fixedDestination(request:Request, origin:string, path:string) {
  const url=new URL(request.url);
  return url.origin===origin && url.pathname===path && !url.search;
}

async function authenticatedOwner(request:Request, path:string, cfg:LiveRuntime|null) {
  if (!cfg?.ownerDsn || !fixedDestination(request,cfg.policy.origin,path)) return {error:unavailable()} as const;
  const auth=await createClient();
  const {data:{user},error}=await auth.auth.getUser();
  if (error || !user || !DECISION_UUID.test(user.id)) return {error:reply({error:"Sign in to access decision reports."},401)} as const;
  return {owner:user.id.toLowerCase(),db:liveOwnerDb(cfg.ownerDsn)} as const;
}

async function provider(cfg:LiveRuntime, path:string, body?:unknown) {
  if (!cfg.creemApiKey) throw new Error("Decision Live Creem credential unavailable");
  const res=await fetch(cfg.policy.apiBase+path,{method:body===undefined?"GET":"POST",cache:"no-store",redirect:"error",
    signal:AbortSignal.timeout(9_000),headers:{"x-api-key":cfg.creemApiKey,"Content-Type":"application/json"},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  if (!res.ok || excessiveLength(res.headers.get("content-length"),128*1024)) throw new Error("Decision Live provider unavailable");
  const raw=await boundedBody(res.body,128*1024);
  if (!raw) throw new Error("Decision Live provider body unavailable");
  return record(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw)));
}

/** Only an operator secret admits this presale, read-only production check. */
export async function liveReadiness(request:Request) {
  const hidden=()=>reply({ok:false},404);
  const failed=()=>reply({ok:false},503);
  if (request.method!=="GET" || process.env.VERCEL_ENV!=="production"
      || process.env.VERCEL_GIT_COMMIT_REF!=="main"
      || !fixedDestination(request,"https://www.goeast.ai","/api/decision-report/readiness")
      || process.env.DECISION_REPORT_LIVE_CHECKOUT_ENABLED==="true"
      || process.env.DECISION_REPORT_LIVE_PUBLIC_ENABLED==="true") return hidden();
  const token=process.env.DECISION_REPORT_LIVE_READINESS_TOKEN;
  const presented=/^Bearer ([0-9a-f]{64})$/.exec(request.headers.get("authorization")??"")?.[1];
  if (!token || !/^[0-9a-f]{64}$/.test(token) || !presented
      || !timingSafeEqual(Buffer.from(token,"hex"),Buffer.from(presented,"hex"))
      || [process.env.DECISION_REPORT_LIVE_CREEM_WEBHOOK_SECRET,process.env.CREEM_WEBHOOK_SECRET,
        process.env.DECISION_REPORT_CREEM_WEBHOOK_SECRET,process.env.AZURE_OPENAI_API_KEY,
        process.env.DECISION_REPORT_LIVE_MODEL_API_KEY].includes(token)) return hidden();
  try {
    const cfg=decisionLivePresaleRuntime();
    if (!cfg?.ownerDsn || !cfg.callbackDsn || !cfg.creemApiKey || !cfg.signingSecret || !cfg.model) return failed();
    const checks=await Promise.allSettled([
      checkLiveDbIsolation(cfg.ownerDsn,"owner"),
      checkLiveDbIsolation(cfg.callbackDsn,"callback"),
      provider(cfg,"/products?product_id="+encodeURIComponent(cfg.policy.productId))
        .then(raw=>isDecisionLiveProduct(cfg.policy,raw)),
    ]);
    return checks.every(check=>check.status==="fulfilled" && check.value===true) ? reply({ok:true}) : failed();
  } catch {return failed();}
}

function resume(row:LiveClaim) {
  if (row.status!=="pending") return reply({orderId:row.id});
  return row.checkout_id && matchesLiveHostedCheckout(row.checkout_url,row.checkout_id)
    ? reply({checkoutUrl:row.checkout_url}) : hold();
}

export async function liveCheckout(request:Request) {
  try {
    const cfg=decisionLiveRuntime();
    if (!cfg || !liveCheckoutConfigured(cfg)) return unavailable();
    const access=await authenticatedOwner(request,"/api/decision-report/checkout",cfg);
    if (access.error) return access.error;
    const {owner,db}=access;
    if (!decisionLiveCheckoutAllowed(cfg.policy,owner,cfg.policy.origin)) return unavailable();
    const body=await payload(request,cfg.policy.origin);
    const input=decisionInput(body);
    if (!input || body?.privacy_ack!==true) return reply({error:"Review the report data notice and provide the original cast."},400);
    // Do not issue or re-display a payable link if the independent settlement
    // identity cannot actually authenticate and pass its catalog boundary.
    if (!await liveCallbackDb(cfg.callbackDsn).ready()) return retry();
    const hash=decisionFingerprint(owner,input);
    const previous=await db.previous(owner,hash);
    if (previous) return resume(previous);
    const id=randomUUID();
    const product=await provider(cfg,"/products?product_id="+encodeURIComponent(cfg.policy.productId));
    const intent=buildDecisionLiveCheckout(cfg.policy,owner,cfg.policy.origin,id,product);
    if (!intent) return retry();
    const row=await db.claim(owner,id,hash,{...input,notice_version:NOTICE_VERSION},cfg.policy.productId,DECISION_CENTS,DECISION_CURRENCY);
    if (!row) return retry();
    if (!row.claimed) return resume(row);
    if (row.id!==id || row.status!=="pending") return hold();
    // Never repeat an outbound create after an ambiguous response or failed attach.
    const response=await provider(cfg,"/checkouts",intent.body);
    const checkout=normalizeDecisionLiveCheckout(cfg.policy,id,response);
    if (!checkout || !await db.attach(owner,id,checkout.checkoutId,checkout.url)) return hold();
    return reply({checkoutUrl:checkout.url});
  } catch {console.warn("[decision-live] checkout_failed");return retry();}
}

function detail(row:LiveOrder) {
  const delivered=row.status==="delivered";
  return {id:row.id,status:row.status,mode:"live",createdAt:row.created_at.toISOString(),
    generationRetryable:row.status==="generating" && row.generation_expires instanceof Date && row.generation_expires.getTime()<Date.now(),
    generationExhausted:row.generation_attempts>=3 && (row.status==="paid" || (row.status==="generating" && row.generation_expires instanceof Date && row.generation_expires.getTime()<Date.now())),
    reportId:delivered?row.report_id:null,report:delivered?row.report:null,actionNote:delivered?row.action_note:null};
}

export async function liveHistory(request:Request) {
  try {
    const access=await authenticatedOwner(request,"/api/decision-report",decisionLiveRuntime());
    if (access.error) return access.error;
    return reply({orders:(await access.db.history(access.owner)).map(row=>({id:row.id,status:row.status,createdAt:row.created_at.toISOString()}))});
  } catch {console.warn("[decision-live] history_unavailable");return retry();}
}

export async function liveOrder(request:Request,id:string,write:boolean) {
  try {
    const cfg=decisionLiveRuntime();
    if (!cfg || !DECISION_UUID.test(id) || id!==id.toLowerCase()) return unavailable();
    const access=await authenticatedOwner(request,"/api/decision-report/"+id,cfg);
    if (access.error) return access.error;
    const {owner,db}=access;
    const row=await db.owned(owner,id);
    if (!row || row.id!==id) return unavailable();
    if (!write) return reply(detail(row));
    const req=await payload(request,cfg.policy.origin);
    if (req?.action==="note") {
      if (typeof req.note!=="string" || req.note.length>500) return reply({error:"Use at most 500 characters."},400);
      if (row.status!=="delivered" || !await db.note(owner,id,req.note.trim()||null)) return reply({error:"A delivered report is required."},409);
    } else if (req?.action==="generate") {
      if (row.status==="delivered") return reply(detail(row));
      if (row.status!=="paid" && row.status!=="generating") return reply({error:"A paid order is required."},409);
      if (!cfg.model) return retry();
      const input=decisionInput(row.capture);
      if (!input || record(row.capture).notice_version!==NOTICE_VERSION) return retry();
      const token=randomUUID();
      if (await db.lease(owner,id,token)) {
        try {
          const model=cfg.model;
          const report=await generateLiveDecisionReport(input,{model:model.model,complete:async (request,signal)=>{
            const client=new OpenAI({apiKey:model.apiKey,baseURL:model.endpoint,timeout:25_000,maxRetries:0,
              fetch:(request,init)=>fetch(request,{...init,redirect:"error"})});
            const result=await client.chat.completions.create(request,{signal});
            return result.choices[0]?.message.content??null;
          }});
          // The lease token and current paid/generating status bar a late
          // completion from restoring a concurrently refunded report.
          if (await db.finish(owner,id,token,report)) console.info("[decision-live] delivery_succeeded");
        } catch {
          await db.finish(owner,id,token,null);
          console.warn("[decision-live] generation_failed");return retry();
        }
      }
    } else return reply({error:"Unsupported report action."},400);
    const current=await db.owned(owner,id);
    return current?.id===id?reply(detail(current)):unavailable();
  } catch {console.warn("[decision-live] order_unavailable");return retry();}
}

export async function liveWebhook(request:Request) {
  try {
    const cfg=decisionLiveRuntime();
    if (!cfg?.callbackDsn || !cfg.signingSecret || !cfg.creemApiKey
        || !decisionLiveWebhookDestinationMatches(cfg.policy,request.url)) return unavailable();
    const signature=request.headers.get("creem-signature")??"";
    if (!/^[0-9a-f]{64}$/i.test(signature)) return reply({received:false},401);
    if (excessiveLength(request.headers.get("content-length"),64*1024)) return reply({received:false},413);
    const raw=await boundedBody(request.body,64*1024);
    if (!raw) return reply({received:false},413);
    const event=normalizeDecisionLiveWebhook(cfg.policy,{url:request.url,raw,signature,secret:cfg.signingSecret});
    if (event.kind==="reject") return reply({received:false},event.status);
    if (event.kind==="ignored") return ignored();
    const db=liveCallbackDb(cfg.callbackDsn);
    async function queue(eventId:string,kind:string,order:string|null,tx:string|null,reason:string) {
      const state=await db.enqueue(eventId,kind,order,tx,reason);
      return state==="queued" || state==="duplicate";
    }
    if (event.kind==="reconcile_payment") {
      return await queue(event.eventId,"payment",event.providerOrderId,event.transactionId,"unlinked_payment") ? ignored():retry();
    }
    if (event.kind==="dispute") {
      const linked=event.providerOrderId && event.transactionId ? await db.linked(event.providerOrderId,event.transactionId):null;
      if (!event.exactSku && linked?.productId!==cfg.policy.productId) return ignored();
      return await queue(event.eventId,"dispute",event.providerOrderId,event.transactionId,"provider_dispute") ? ignored():retry();
    }
    if (event.kind!=="paid" && event.kind!=="refund") return ignored();
    const tx=await provider(cfg,"/transactions?transaction_id="+encodeURIComponent(event.transactionId));
    const providerOrder=decisionLiveTransactionOrder(tx);
    const total=decisionLiveAmount(tx);
    if (tx.id!==event.transactionId || tx.mode!=="prod" || tx.type!=="payment" || tx.subscription!=null || !providerOrder
        || (event.providerOrderId!=null && providerOrder!==event.providerOrderId) || !total) {
      return event.kind==="paid" || event.exactSku ? retry() : ignored();
    }
    const settled=async(state:string|null,kind:"payment"|"refund",allowed:string[]) => {
      if (state==="reconcile") {
        return await queue(event.eventId,kind,providerOrder,event.transactionId,"rpc_reconciliation")?ignored():retry();
      }
      return allowed.includes(state??"") ? reply({received:true}) : retry();
    };
    if (event.kind==="paid") {
      if (event.grossCents!==total.grossCents || event.taxCents!==total.taxCents) return retry();
      if (tx.status==="refunded" && tx.refunded_amount===total.grossCents) {
        // A strong correlated signed payment plus an authenticated full refund
        // may arrive out of order. Establish terminal proof before attempting
        // to bind the paid event. The synthetic key cannot collide with evt_*.
        const full=await db.refund(providerOrder,event.transactionId,"verified_full_"+event.eventId,
          cfg.policy.productId,event.checkoutId,total.grossCents);
        if (full!=="refunded" && full!=="duplicate") return settled(full,"refund",[]);
        return settled(await db.paid(event,DECISION_CURRENCY),"payment",["refund_precedes_payment","duplicate"]);
      }
      if (tx.status!=="paid" && tx.status!=="partialRefund") {
        // Do not grant from a delayed payment if current provider state is already terminal/ambiguous.
        return await queue(event.eventId,"payment",providerOrder,event.transactionId,"provider_payment_state")?ignored():retry();
      }
      const state=await db.paid(event,DECISION_CURRENCY);
      return settled(state,"payment",["paid","duplicate","refund_precedes_payment"]);
    }
    const linked=await db.linked(providerOrder,event.transactionId);
    if (!linked) {
      // No foreign-SKU side effects. Unlinked known P1 goes to reconciliation;
      // delayed paid events independently query current provider transaction state.
      if (!event.exactSku) return ignored();
      const refundTotal=tx.refunded_amount ?? event.refundCents;
      if (event.checkoutId && tx.status==="refunded" && refundTotal===total.grossCents
          && event.refundCents<=total.grossCents) {
        // The database independently requires an existing matching Live P1
        // checkout, otherwise it records reconciliation instead of a tombstone.
        const state=await db.refund(providerOrder,event.transactionId,event.eventId,cfg.policy.productId,
          event.checkoutId,total.grossCents);
        return settled(state,"refund",["refunded","duplicate"]);
      }
      return await queue(event.eventId,"refund",providerOrder,event.transactionId,"unlinked_refund")?ignored():retry();
    }
    const result=reconcileDecisionLiveRefund(cfg.policy,event,tx,linked);
    if (result!=="full") return await queue(event.eventId,"refund",providerOrder,event.transactionId,
      result==="partial"?"partial_refund":"unknown_refund")?ignored():retry();
    const state=await db.refund(providerOrder,event.transactionId,event.eventId,cfg.policy.productId,
      linked.checkoutId,total.grossCents);
    return settled(state,"refund",["refunded","duplicate"]);
  } catch {console.warn("[decision-live] callback_failed");return retry();}
}
