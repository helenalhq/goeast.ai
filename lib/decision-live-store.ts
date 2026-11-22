import { checkServerIdentity } from "node:tls";
import { Client, Pool, type PoolClient } from "pg";
import { SUPABASE_PROD_ROOT_2021_CA } from "./decision-supabase-ca";
import type { DecisionInput } from "./decision-core";
import type { DecisionReport, DecisionStatus } from "./decision-types";

type Role = "owner" | "callback";
const pools: Partial<Record<Role,{dsn:string;pool:Pool}>> = {};
function connection(dsn:string, role:Role) {
  const prior = pools[role];
  if (prior?.dsn === dsn) return prior.pool;
  if (prior) throw new Error("Decision Live connection changed");
  const pool = new Pool({...connectionOptions(dsn),max:2,idleTimeoutMillis:8_000,allowExitOnIdle:true});
  pool.on("error",()=>console.warn("[decision-live] pool-idle-error",role));
  pools[role] = {dsn,pool};
  return pool;
}

function connectionOptions(dsn:string) {
  const url = new URL(dsn);
  return {host:url.hostname,port:6543,user:url.username,password:decodeURIComponent(url.password),
    database:"postgres",ssl:{rejectUnauthorized:true,ca:SUPABASE_PROD_ROOT_2021_CA,checkServerIdentity},
    connectionTimeoutMillis:4_000,query_timeout:5_000};
}

async function initializeLiveTransaction(client:Client|PoolClient,readOnly=false) {
  await client.query(readOnly?"begin read only":"begin");
  await client.query("set local search_path = pg_catalog");
  await client.query("set local statement_timeout = '4s'");
}

/** One scoped catalog-only check with the same TLS/transaction settings as normal traffic. */
export async function checkLiveDbIsolation(dsn:string,role:Role) {
  const client=new Client(connectionOptions(dsn));
  client.on("error",()=>{ /* Socket failures are surfaced as false, never logged. */ });
  try {
    await client.connect();
    await initializeLiveTransaction(client,true);
    const result=await client.query<{ok:boolean}>(
      "select current_user = $1 and goeast_p1_live.isolation_ok() as ok",
      [role==="owner" ? "p1_live_app" : "p1_live_callback"]);
    await client.query("commit");
    return result.rows[0]?.ok===true;
  } catch {return false;}
  finally {await client.end().catch(()=>{});}
}

function sql(dsn:string, role:Role) {
  return async <T extends object>(statement:string, params:unknown[]) => {
    let client:PoolClient | undefined;
    let committed=false;
    try {
      client=await connection(dsn,role).connect();
      await initializeLiveTransaction(client);
      const result=await client.query<{ok:boolean}>("select goeast_p1_live.isolation_ok() as ok");
      if (result.rows[0]?.ok !== true) throw new Error("Decision Live isolation check failed");
      const rows=await client.query<T>(statement,params);
      await client.query("commit");
      committed=true;
      return rows.rows;
    } catch {
      // Do not surface driver errors, SQL, credentials, or report contents.
      throw new Error("Decision Live database unavailable");
    } finally { client?.release(!committed); }
  };
}

export type LiveOrder = {id:string;status:DecisionStatus;created_at:Date;capture:unknown;report_id:string|null;
  report:DecisionReport|null;action_note:string|null;generation_expires:Date|null;generation_attempts:number};
export type LiveClaim = {id:string;status:DecisionStatus;checkout_id:string|null;checkout_url:string|null;claimed?:boolean};
type PaymentRow = {id:string;owner_id:string;checkout_id:string;product_id:string;mode:string;status:DecisionStatus;
  provider_order_id:string;transaction_id:string;gross_amount:number};

export function liveOwnerDb(dsn:string) {
  const query=sql(dsn,"owner");
  const one=async<T extends object>(statement:string,params:unknown[]) => (await query<T>(statement,params))[0]??null;
  const rpc=async(statement:string,params:unknown[]) => (await one<{ok:boolean}>(statement,params))?.ok===true;
  return {
    history:(owner:string)=>query<Pick<LiveOrder,"id"|"status"|"created_at">>(
      "select * from goeast_p1_live.history($1::uuid,null::timestamptz,null::uuid,$2::int)",[owner,100]),
    owned:(owner:string,id:string)=>one<LiveOrder>("select * from goeast_p1_live.get_owned($1::uuid,$2::uuid)",[owner,id]),
    previous:(owner:string,hash:string)=>one<LiveClaim>("select * from goeast_p1_live.previous($1::uuid,$2::text)",[owner,hash]),
    claim:(owner:string,id:string,hash:string,input:DecisionInput & {notice_version:string},product:string,amount:number,currency:string)=>
      one<LiveClaim>("select * from goeast_p1_live.claim_checkout($1::uuid,$2::uuid,$3::text,$4::jsonb,$5::text,$6::int,$7::text)",
        [owner,id,hash,JSON.stringify(input),product,amount,currency]),
    attach:(owner:string,id:string,checkoutId:string,url:string)=>rpc(
      "select goeast_p1_live.attach_checkout($1::uuid,$2::uuid,$3::text,$4::text) as ok",[owner,id,checkoutId,url]),
    note:(owner:string,id:string,note:string|null)=>rpc(
      "select goeast_p1_live.save_note($1::uuid,$2::uuid,$3::text) as ok",[owner,id,note]),
    lease:(owner:string,id:string,token:string)=>rpc(
      "select goeast_p1_live.acquire_generation($1::uuid,$2::uuid,$3::uuid) as ok",[owner,id,token]),
    finish:(owner:string,id:string,token:string,report:DecisionReport|null)=>rpc(
      "select goeast_p1_live.finish_generation($1::uuid,$2::uuid,$3::uuid,$4::jsonb) as ok",
      [owner,id,token,report===null?null:JSON.stringify(report)]),
  };
}

export function liveCallbackDb(dsn:string) {
  const query=sql(dsn,"callback");
  const result=async(statement:string,params:unknown[]) => (await query<{result:string}>(statement,params))[0]?.result??null;
  return {
    ready:async()=> (await query<{ok:boolean}>("select true as ok",[]))[0]?.ok===true,
    linked:async(providerOrderId:string,transactionId:string)=>{
      const [row]=await query<PaymentRow>("select * from goeast_p1_live.get_linked_payment($1::text,$2::text)",
        [providerOrderId,transactionId]);
      return row?{ownerId:row.owner_id,orderId:row.id,checkoutId:row.checkout_id,productId:row.product_id,
        mode:row.mode,status:row.status,providerOrderId:row.provider_order_id,transactionId:row.transaction_id,
        grossCents:row.gross_amount}:null;
    },
    paid:(e:{orderId:string;checkoutId:string;productId:string;baseCents:number;providerOrderId:string;
      transactionId:string;eventId:string;taxCents:number;grossCents:number},currency:string)=>result(
      "select goeast_p1_live.record_payment($1::uuid,$2::text,$3::text,$4::int,$5::text,$6::text,$7::text,$8::text,$9::int,$10::int) as result",
      [e.orderId,e.checkoutId,e.productId,e.baseCents,currency,e.providerOrderId,e.transactionId,e.eventId,e.taxCents,e.grossCents]),
    refund:(providerOrderId:string,transactionId:string,eventId:string,productId:string,checkoutId:string,gross:number)=>result(
      "select goeast_p1_live.record_full_refund($1::text,$2::text,$3::text,$4::text,$5::text,$6::int) as result",
      [providerOrderId,transactionId,eventId,productId,checkoutId,gross]),
    enqueue:(eventId:string,kind:string,providerOrderId:string|null,transactionId:string|null,reason:string)=>result(
      "select goeast_p1_live.enqueue_event($1::text,$2::text,$3::text,$4::text,$5::text) as result",
      [eventId,kind,providerOrderId,transactionId,reason]),
  };
}
