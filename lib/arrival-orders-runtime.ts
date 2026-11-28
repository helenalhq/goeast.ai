import { randomUUID, timingSafeEqual } from "node:crypto";
import { checkServerIdentity } from "node:tls";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { SUPABASE_PROD_ROOT_2021_CA } from "./decision-supabase-ca";
import { createClient } from "./supabase/server";
import { checkoutMetadata, isId, normalizeTrip, OFFER, PRICE_CENTS, providerId, reportTrip, returnUrl, shanghaiDay, signedEvent, validateQuote, verifyCheckout, verifyPacket, verifyPaid } from "./arrival-order-binding.mjs";
import { sql } from "./arrival-order-sql.mjs";

type Phase = "test" | "live";
type Config = {mode:Phase;origin:string;product:string;key:string;secret:string;dsn:URL; operatorId:string; operatorToken:string; testBuyer:string};
type Trip = {date:string;flight:string;hotel:string;airport:"PVG";preferences:string[]};
type Verified = {hotel:string;terminal:string;localTime:string};
type Row = QueryResultRow & {
  id:string;version:number;state:string;trip:Trip;verified:Verified|null;product:string;subtotal:number;currency:string;
  checkout_started_at:Date|null; checkout_id:string|null;checkout_url:string|null;quote_expires:Date|null;due_at:Date|null;
  provider_order:string|null;transaction_id:string|null;
};
const bodyMax = 3_800_000;
const TERMS = "arrival-terms-v1";
const headers={"cache-control":"private, no-store","x-robots-tag":"noindex, nofollow","x-content-type-options":"nosniff"};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers});
const error=(status:number)=>json({ error: ({400:"Invalid request",401:"Sign in required",403:"Not available",404:"Not found",409:"Order is not ready for this action",413:"Request is too large",429:"Too many submissions. Your existing orders are still available.",503:"Temporarily unavailable; try again later"} as Record<number,string>)[status]??"Unavailable"},status);

function config():Config|null {
  const v=process.env, mode=v.VERCEL_ENV==="preview"&&v.ARRIVAL_ORDERS_MODE==="test"?"test":
    v.VERCEL_ENV==="production"&&v.ARRIVAL_ORDERS_MODE==="live"&&v.ARRIVAL_ORDERS_LIVE_APPROVED==="yes"?"live":null;
  if(!mode) return null;
  const origin=v.ARRIVAL_ORDERS_ORIGIN??"", product=v.ARRIVAL_ORDERS_PRODUCT??"", key=v.ARRIVAL_ORDERS_CREEM_KEY??"", secret=v.ARRIVAL_ORDERS_CREEM_SIGNING_SECRET??"";
  const operatorId=v.ARRIVAL_ORDERS_OPERATOR_ID??"",operatorToken=v.ARRIVAL_ORDERS_OPERATOR_TOKEN??"",testBuyer=v.ARRIVAL_ORDERS_TEST_BUYER??"";
  if(!providerId(product,"prod_") || !key.startsWith(mode==="test"?"creem_test_":"creem_") || (mode==="live"&&key.startsWith("creem_test_"))
     || secret.length<24 || !isId(operatorId) || operatorToken.length<32 || (mode==="test"&&!isId(testBuyer))
     || !(mode==="test"?/^https:\/\/(?:preview\.goeast\.ai|go-east-[a-z0-9-]+\.vercel\.app)$/.test(origin):origin==="https://www.goeast.ai")) return null;
  try {
    const dsn=new URL(v.ARRIVAL_ORDERS_DB_URL??"");
    const project=v.ARRIVAL_ORDERS_DB_PROJECT??"";
    if(!/^[a-z0-9]{20}$/.test(project)||dsn.protocol!=="postgresql:"||dsn.username!=="goeast_arrival_orders_runtime."+project||
      !/^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(dsn.hostname)||dsn.port!=="6543"||dsn.pathname!=="/postgres"||
      dsn.search||dsn.hash||!dsn.password) return null;
    // No route for a sandbox adapter to point at the known production project.
    if(mode==="test"&&project==="vdmpcrgpvjeuozbalbpt") return null;
    return {mode,origin,product,key,secret,dsn,operatorId,operatorToken,testBuyer};
  } catch{return null;}
}
export const arrivalOrdersVisible=()=>config()!==null;

let pool:{key:string;value:Pool}|undefined;
function db(cfg:Config){
  if(pool?.key===cfg.dsn.href) return pool.value;
  if(pool) throw new Error("Arrival database configuration changed");
  const value=new Pool({host:cfg.dsn.hostname,port:6543,user:cfg.dsn.username,password:decodeURIComponent(cfg.dsn.password),
    database:"postgres",ssl:{ca:SUPABASE_PROD_ROOT_2021_CA,rejectUnauthorized:true,checkServerIdentity},
    max:2,connectionTimeoutMillis:5000,statement_timeout:5000,query_timeout:7500});
  value.on("error",()=>console.warn("[arrival-orders] idle database connection error"));
  pool={key:cfg.dsn.href,value};
  return value;
}

async function transaction<T>(cfg:Config, run:(client:PoolClient)=>Promise<T>){
  const client=await db(cfg).connect();
  let committed=false;
  try{
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path=pg_catalog");
    await client.query("SET LOCAL lock_timeout='3s'");
    const value=await run(client);
    await client.query("COMMIT");
    committed=true;
    return value;
  }finally{client.release(!committed);}
}
async function one<T extends QueryResultRow>(client:PoolClient,statement:string,values:unknown[]){
  return (await client.query<T>(statement,values)).rows[0]??null;
}

type NoticeStage="quote"|"paid";
function noticeConfig(cfg:Config){
  if(cfg.mode!=="test"||process.env.ARRIVAL_ORDERS_TEST_NOTICES!=="enabled") return null;
  const key=process.env.ARRIVAL_ORDERS_TEST_RESEND_KEY??"";
  const to=process.env.ARRIVAL_ORDERS_TEST_NOTICE_TO??"";
  return key.startsWith("re_")&&/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(to)?{key,to}:null;
}
async function tryNotice(cfg:Config,id:string,stage:NoticeStage){
  const delivery=noticeConfig(cfg);
  if(!delivery) return false;
  try {
    const claim=await transaction(cfg,c=>one<{attempts:number}>(c,sql.claimNotice,[id,stage]));
    if(!claim) return false;
    let receipt:string|null=null;
    try {
      const response=await fetch("https://api.resend.com/emails",{method:"POST",redirect:"error",signal:AbortSignal.timeout(2500),
        headers:{authorization:"Bearer "+delivery.key,"content-type":"application/json","Idempotency-Key":"arrival-orders-test-"+stage+"-"+id},
        body:JSON.stringify({from:"goeast@chinamed.cc",to:[delivery.to],
          subject:"[GoEast Arrival Orders Test] "+(stage==="quote"?"Quote":"Paid")+" "+id,
          text:"Internal GoEast Test notice. Verify the order ID and stage against the protected Test queue."})});
      if(response.ok){
        const value=(await response.json()).id;
        if(isId(value)) receipt=value;
      }
    }catch{/* A retry must use the same provider key; leave the work in the queue. */}
    await transaction(cfg,c=>c.query(sql.noticeReceipt,[id,stage,claim.attempts,receipt]));
    return receipt!==null;
  } catch {
    console.warn("[arrival-orders] test notice pending");
    return false;
  }
}

async function bounded(req:Request,max:number){
  const size=req.headers.get("content-length");
  if(size!==null&&(!/^\d+$/.test(size)||Number(size)>max)) return null;
  const reader=req.body?.getReader();
  if(!reader) return Buffer.alloc(0);
  const parts:Uint8Array[]=[];
  let total=0;
  try {
    while(true){const next=await reader.read();if(next.done)break;total+=next.value.length;if(total>max){await reader.cancel();return null;}parts.push(next.value);}
    return Buffer.concat(parts,total);
  } finally {reader.releaseLock();}
}
async function body(req:Request,max=8192){
  if(req.headers.get("content-type")?.split(";")[0]!=="application/json") return null;
  const bytes=await bounded(req,max);
  if(!bytes) return null;
  try {const v=JSON.parse(bytes.toString("utf8"));return v&&typeof v==="object"&&!Array.isArray(v)?v:null;} catch{return null;}
}
async function buyer(cfg:Config){
  const {data:{user}}=await (await createClient()).auth.getUser();
  return user&&isId(user.id)&&(cfg.mode!=="test"||user.id===cfg.testBuyer)?user.id:null;
}
function operator(req:Request,cfg:Config){
  const token=Buffer.from(req.headers.get("authorization")??"");
  const expected=Buffer.from("Bearer "+cfg.operatorToken);
  return token.length===expected.length&&timingSafeEqual(token,expected);
}
async function provider(cfg:Config,path:string, payload?:object){
  const root=cfg.mode==="test"?"https://test-api.creem.io/v1/":"https://api.creem.io/v1/";
  const result=await fetch(root+path,{method:payload?"POST":"GET",headers:{"x-api-key":cfg.key,"content-type":"application/json"},
    body:payload?JSON.stringify(payload):undefined,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(8000)});
  if(!result.ok) throw new Error("Arrival provider request failed");
  return result.json();
}
function file(input:unknown,max:number){
  return typeof input==="string"&&input.length<=Math.ceil(max/3)*4&& input.length%4===0&&/^[A-Za-z0-9+/]+={0,2}$/.test(input)?Buffer.from(input,"base64"):null;
}

export async function arrivalBuyer(req:Request){
  const cfg=config(); if(!cfg) return error(404);
  try {
    if(req.method==="POST"&&req.headers.get("origin")!==cfg.origin) return error(403);
    const owner=await buyer(cfg); if(!owner) return error(401);
    const url=new URL(req.url);
    if(req.method==="GET"){
      const id=url.searchParams.get("id");
      if(id===null&&!url.searchParams.has("file")) return json({orders:await transaction(cfg,async c=>(await c.query(sql.ownerList,[owner])).rows)});
      if(!isId(id)) return error(404);
      const artifact=url.searchParams.get("file");
      if(artifact!==null){
        if(artifact!=="pdf"&&artifact!=="png") return error(404);
        const result=await transaction(cfg,c=>one<{pdf:Buffer;png:Buffer}>(c,sql.report,[id,owner]));
        if(!result) return error(404);
        return new Response(new Uint8Array(result[artifact]),{headers:{...headers,"content-type":artifact==="pdf"?"application/pdf":"image/png",
          "content-disposition":'attachment; filename="'+(artifact==="pdf"?"GoEast-Arrival-Plan.pdf":"GoEast-Offline-Address.png")+'"'}});
      }
      const order=await transaction(cfg,c=>one(c,sql.owner,[id,owner]));
      return order?json({order}):error(404);
    }
    const input=await body(req); if(!input) return error(400);
    if(url.searchParams.get("action")==="checkout"){
      if(!isId(input.id)|| input.acceptedQuote!==true) return error(400);
      const row=await transaction(cfg,async c=>{
        const found=await one<Row>(c,sql.lock,[input.id]);
        if(!found||found.owner_id!==owner||found.state!=="quoted"||!found.quote_expires||+found.quote_expires<=Date.now()||found.product!==cfg.product) return null;
        if(found.checkout_id&&found.checkout_url) return found;
        return one<Row>(c,sql.startCheckout,[input.id,owner]);
      });
      if(!row) return error(409);
      if(row.checkout_id&&row.checkout_url) return json({url:row.checkout_url});
      // No automatic second Create Checkout after an ambiguous network result.
      const reply=await provider(cfg,"checkouts",{product_id:row.product,request_id:row.id,units:1,
        success_url:returnUrl(row,cfg),metadata:checkoutMetadata(row,cfg)});
      const bound=verifyCheckout(row,reply,cfg);
      if(!bound) return error(503);
      const saved=await transaction(cfg,c=>one(c,sql.bindCheckout,[row.id,bound.id,bound.url]));
      return saved?json({url:bound.url}):error(409);
    }
    const attempt=req.headers.get("idempotency-key");
    if(!isId(attempt)) return error(400);
    const candidate=randomUUID();
    const outcome=await transaction(cfg,async c=>{
      await c.query(sql.lockPayment,["arrival-owner:"+owner]);
      const previous=await one<{id:string;state:string;created_at:Date}>(c,sql.priorIntake,[owner,attempt]);
      const reference=previous?new Date(+previous.created_at+8*3600000).toISOString().slice(0,10):shanghaiDay();
      const trip=normalizeTrip(input,reference);
      if(!trip) return {status:previous?409:400};
      if(previous){
        const saved=await one<{id:string;state:string}>(c,sql.sameIntake,[owner,attempt,trip]);
        return saved?{status:200,saved}:{status:409};
      }
      const cap=await one<{count:number}>(c,"SELECT count(*)::int AS count FROM arrival_orders.orders WHERE owner_id=$1 AND created_at>now()-interval '24 hours'",[owner]);
      if((cap?.count??5)>=5) return {status:429};
      const saved=await one<{id:string;state:string}>(c,sql.create,[candidate,owner,trip,cfg.product,PRICE_CENTS,TERMS,attempt]);
      if(!saved) throw new Error("Arrival intake not saved");
      await c.query(sql.enqueueNotice,[candidate,"quote"]);
      return {status:201,saved};
    });
    if(!outcome.saved) return error(outcome.status);
    if(outcome.saved.state==="submitted") await tryNotice(cfg,outcome.saved.id,"quote");
    return json(outcome.saved,outcome.status);
  } catch{console.warn("[arrival-orders] buyer operation failed");return error(503);}
}

export async function arrivalOperator(req:Request){
  const cfg=config();if(!cfg) return error(404);
  if(!operator(req,cfg)) return error(404);
  try {
    const id=new URL(req.url).searchParams.get("id");
    if(req.method==="GET"&&id===null) return json({orders:await transaction(cfg,async c=>(await c.query(sql.queue)).rows)});
    if(req.method==="POST"&&id===null){
      const input=await body(req);
      if(input?.action!=="retryNotices" || !noticeConfig(cfg)) return error(404);
      const pending=await transaction(cfg,async c=>(await c.query<{order_id:string;stage:NoticeStage}>(sql.listNotices)).rows);
      let accepted=0;
      for(const item of pending){if(await tryNotice(cfg,item.order_id,item.stage)) accepted++;}
      return json({attempted:pending.length,accepted});
    }
    if(!isId(id)) return error(400);
    if(req.method==="GET"){
      const row=await transaction(cfg,c=>one<Row>(c,sql.byId,[id]));
      return row?json({id,row:{version:row.version,state:row.state,trip:row.trip,verified:row.verified,
        dueAt:row.due_at,quoteExpires:row.quote_expires,packetTrip:row.verified?reportTrip(row):null}}):error(404);
    }
    const input=await body(req,bodyMax);if(!input) return error(400);
    return await transaction(cfg,async c=>{
      const row=await one<Row>(c,sql.lock,[id]); if(!row) return error(404);
      if(input.action==="quote"){
        if(row.state!=="submitted") return error(409);
        const quote=validateQuote(row,input,new Date());
        if(!quote) return error(400);
        const saved=await one(c,sql.quote,[id,{terminal:quote.terminal,localTime:quote.localTime,hotel:quote.hotel},quote.quoteExpires,quote.dueAt]);
        return saved?json({state:"quoted"}):error(409);
      }
      if(input.action!=="approve"|| (row.state!=="paid"&&row.state!=="ready")) return error(409);
      const pdf=file(input.pdf,2_000_000),png=file(input.png,750_000);
      if(input.manifest?.purpose!==(cfg.mode==="test"?"qa":"reviewed")) return error(400);
      const hash=verifyPacket(row,input.manifest,pdf,png);
      if(!hash) return error(400);
      if(row.state==="ready"){
        const existing=await one<{manifest:{sha256:{pdf:string;png:string}}}>(c,sql.getManifest,[id,row.version]);
        return existing?.manifest.sha256.pdf===hash.pdf&&existing.manifest.sha256.png===hash.png?json({state:"ready",id,version:row.version}):error(409);
      }
      const manifest={orderId:id,version:row.version,trip:reportTrip(row),template:"arrival-v1",sha256:hash};
      if(!await one(c,sql.addReport,[id,row.version,manifest,pdf,png,cfg.operatorId]) || !await one(c,sql.publishReport,[id]))
        throw new Error("Arrival approval transition failed");
      return json({state:"ready",id,version:row.version});
    });
  } catch{console.warn("[arrival-orders] operator operation failed");return error(503);}
}

export async function arrivalWebhook(req:Request){
  const cfg=config();if(!cfg)return error(404);
  try {
    const raw=await bounded(req,128_000); if(!raw) return error(413);
    const event=signedEvent(raw,req.headers.get("creem-signature"),cfg.secret); if(!event) return error(401);
    const object=event.object;
    if(event.eventType==="refund.created"||event.eventType==="dispute.created"){
      const tx=object?.transaction;
      // Conservative: a verified refund/dispute event holds an exact payment even if only partial.
      if(!providerId(tx?.id,"tran_")||(tx.mode!=null&&tx.mode!==cfg.mode)||(object.mode!=null&&object.mode!==cfg.mode)) return json({ignored:true});
      await transaction(cfg,async c=>{
        await c.query(sql.lockPayment,[tx.id]);
        await c.query(sql.block,[tx.id,event.id,event.eventType]);
        await c.query(sql.revoke,[tx.id]);
      });
      return json({received:true});
    }
    if(event.eventType!=="checkout.completed"||!isId(object?.metadata?.order_id)||
      object.mode!==cfg.mode||object.metadata.offer_id!==OFFER||
      (typeof object.product==="string"?object.product:object.product?.id)!==cfg.product||
      !providerId(object.id,"ch_")) return json({ignored:true});
    const row=await transaction(cfg,c=>one<Row>(c,sql.byId,[object.metadata.order_id]));
    if(!row||row.state==="submitted"||row.product!==cfg.product||String(row.version)!==object.metadata.trip_version||
      object.metadata.arrival_environment!==cfg.mode) return json({ignored:true});
    if(!row.checkout_id) return error(503);
    if(row.checkout_id!==object.id) return json({ignored:true});
    if(row.state!=="quoted"){
      if(row.state==="paid") await tryNotice(cfg,row.id,"paid");
      return json({received:true});
    }
    const checkout=await provider(cfg,"checkouts?checkout_id="+encodeURIComponent(row.checkout_id));
    const txn=checkout?.order?.transaction;
    if(!providerId(txn,"tran_")||txn!==object.order?.transaction||checkout.order.id!==object.order?.id) return error(503);
    const tx=await provider(cfg,"transactions?transaction_id="+encodeURIComponent(txn));
    const shouldNotify=await transaction(cfg,async c=>{
      // Serializes paid transitions with a refund/dispute arriving before, during or after payment.
      await c.query(sql.lockPayment,[txn]);
      const latest=await one<Row>(c,sql.lock,[row.id]);
      if(!latest||latest.state!=="quoted") return;
      const paid=verifyPaid(latest,checkout,tx,cfg);
      if(!paid){
        if(checkout.status!=="completed"||tx.id!==txn||tx.status==="pending") throw new Error("Arrival payment is not settled");
        await c.query(sql.hold,[row.id]);
        return;
      }
      const blocked=await one(c,sql.getBlock,[txn]);
      const changed=await one(c,sql.markPaid,[row.id,paid.order,paid.transaction,paid.paidAt,paid.gross,blocked?"revoked":"paid"]);
      if(!changed||blocked) return false;
      await c.query(sql.enqueueNotice,[row.id,"paid"]);
      return true;
    });
    if(shouldNotify) await tryNotice(cfg,row.id,"paid");
    return json({received:true});
  } catch{console.warn("[arrival-orders] webhook operation failed");return error(503);}
}
