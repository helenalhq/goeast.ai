import { randomUUID, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import { checkServerIdentity } from "node:tls";
import { SUPABASE_PROD_ROOT_2021_CA } from "./decision-supabase-ca";
import { Resend } from "resend";
import { arrivalTestProduct, matchArrivalPayment, noticeSubject, verifiedEvent, type ArrivalOrder } from "./arrival-fulfillment";
import cases from "../scripts/fixtures/arrival-reports.qa.json";

const api = "https://test-api.creem.io/v1/checkouts";
const inbox = "pcliu.fd@gmail.com";
const orderId = /^ar_[0-9a-f-]{36}$/;
const checkoutId = /^ch_[A-Za-z0-9_]+$/;
let pool:Pool | undefined;
export const previewEnabled=()=>process.env.VERCEL_ENV==="preview"&&process.env.ARRIVAL_E2E==="enabled"&&
  !!process.env.ARRIVAL_PREVIEW_DATABASE_URL&&!!process.env.ARRIVAL_PREVIEW_TOKEN;
function db(){
  if(pool) return pool;
  const url=new URL(process.env.ARRIVAL_PREVIEW_DATABASE_URL??"");
  if(url.protocol!=="postgresql:" || url.username!=="goeast_arrival_preview.vdmpcrgpvjeuozbalbpt" ||
    !/^aws-[01]-ap-southeast-1\.pooler\.supabase\.com$/.test(url.hostname) ||
    !["5432","6543"].includes(url.port) || url.pathname!=="/postgres" || !url.password) throw new Error("unapproved preview database");
  const next=new Pool({host:url.hostname,port:Number(url.port),user:url.username,password:decodeURIComponent(url.password),database:"postgres",
    ssl:{rejectUnauthorized:true,ca:SUPABASE_PROD_ROOT_2021_CA,checkServerIdentity},max:2,connectionTimeoutMillis:5000,query_timeout:5000});
  next.on("error",()=>console.warn("[arrival-preview] idle pool error"));
  return pool=next;
}
export function logArrivalReadinessError(error:unknown){
  const codes=new Set(["28P01","28000","42501","42P01","ENOTFOUND","EAI_AGAIN","ETIMEDOUT","ECONNREFUSED","UNABLE_TO_VERIFY_LEAF_SIGNATURE","ERR_TLS_CERT_ALTNAME_INVALID","UNABLE_TO_GET_ISSUER_CERT_LOCALLY","SELF_SIGNED_CERT_IN_CHAIN"]);
  const code=error&&typeof error==="object"&&"code" in error?String(error.code):"";
  console.warn("[arrival-preview] readiness",codes.has(code)?code:"unclassified");
  return false;
}
export function operator(request:Request){
  const configured=process.env.ARRIVAL_PREVIEW_TOKEN??"";
  const seen=request.headers.get("authorization")?.slice(7)??"";
  return request.headers.get("authorization")?.startsWith("Bearer ")===true&&configured.length>=32&&seen.length===configured.length&&
    Buffer.byteLength(seen)===Buffer.byteLength(configured)&&timingSafeEqual(Buffer.from(seen),Buffer.from(configured));
}
type Job=Omit<ArrivalOrder,"expires"|"deadline"> & {expires:Date;deadline:Date; paid_at:Date|null; notice_id:string|null;trip:typeof cases[number]["trip"]};
async function find(id:string){return (await db().query<Job>("SELECT * FROM arrival_preview.jobs WHERE id=$1",[id])).rows[0];}

export async function createArrivalCheckout(sample:number){
  if(!Number.isInteger(sample)||sample<0||sample>=cases.length) throw new Error("invalid case");
  const key=process.env.ARRIVAL_CREEM_TEST_API_KEY??process.env.CREEM_API_KEY??"";
  const origin=process.env.ARRIVAL_PREVIEW_ORIGIN??(process.env.VERCEL_URL?"https://"+process.env.VERCEL_URL:"");
  if(!key.startsWith("creem_test_")||!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) throw new Error("test checkout unconfigured");
  const id="ar_"+randomUUID();
  const when=new Date();
  const expires=new Date(+when+15*60_000);
  const deadline=new Date(+when+12*60*60_000);
  await db().query("INSERT INTO arrival_preview.jobs (id,trip,expires,deadline) VALUES ($1,$2,$3,$4)",[id,cases[sample].trip,expires,deadline]);
  const response=await fetch(api,{method:"POST",headers:{"content-type":"application/json","x-api-key":key},signal:AbortSignal.timeout(8000),body:JSON.stringify({product_id:arrivalTestProduct,request_id:id,units:1,success_url:origin+"/shanghai-arrival-check",customer:{email:"goeast-arrival-qa@example.com"}})});
  if(!response.ok) throw new Error("test checkout rejected");
  const data=await response.json() as {mode?:string;id?:string;checkout_url?:string;request_id?:string};
  const url=new URL(data.checkout_url??"");
  if(data.mode!=="test"||!checkoutId.test(data.id??"")||data.request_id!==id||url.protocol!=="https:"||url.username||url.password||
    !["creem.io","www.creem.io","test.creem.io","checkout.creem.io"].includes(url.hostname)) throw new Error("test checkout unverified");
  const update=await db().query("UPDATE arrival_preview.jobs SET checkout=$2 WHERE id=$1 AND checkout IS NULL",[id,data.id]);
  if(update.rowCount!==1) throw new Error("checkout not stored");
  return {id,url:url.href};
}

export async function acceptArrivalWebhook(raw:string,signature:string){
  const secret=process.env.ARRIVAL_CREEM_TEST_WEBHOOK_SECRET??"";
  if(!secret) return {status:503,body:{error:"preview unconfigured"}};
  const event=verifiedEvent(raw,signature,secret) as {object?:{request_id?:unknown}}|null;
  if(!event) return {status:401,body:{error:"invalid signature"}};
  const id=event.object?.request_id;
  if(typeof id!=="string"||!orderId.test(id)) return {status:200,body:{ignored:true}};
  const c=await db().connect();
  try{
    await c.query("BEGIN");
    const order=(await c.query<Job>("SELECT * FROM arrival_preview.jobs WHERE id=$1 FOR UPDATE",[id])).rows[0];
    if(!order){await c.query("COMMIT");return {status:200,body:{ignored:true}};}
    const result=matchArrivalPayment({...order,expires:order.expires.toISOString(),deadline:order.deadline.toISOString()},event);
    if(result.kind==="paid") await c.query("UPDATE arrival_preview.jobs SET state='paid', \"providerOrder\"=$2,paid_at=$3 WHERE id=$1",[id,result.providerOrder,result.paidAt]);
    else if(result.kind==="review"&&order.state==="pending") await c.query("UPDATE arrival_preview.jobs SET state='held' WHERE id=$1",[id]);
    await c.query("COMMIT");
    return {status:200,body:{received:true,result:result.kind},queued:result.kind==="paid"||result.kind==="duplicate"?id:undefined};
  }catch{
    await c.query("ROLLBACK");
    return {status:503,body:{error:"unable to record payment"}};
  }finally{c.release();}
}

export async function sendArrivalNotice(id:string){
  if(!orderId.test(id)) return false;
  const entry=await find(id);
  if(!entry||entry.state!=="paid"||!entry.paid_at) return false;
  if(entry.notice_id) return true;
  const from=process.env.RESEND_FROM_EMAIL;
  const key=process.env.RESEND_API_KEY;
  if(!from||!key) return false;
  const sent=await new Resend(key).emails.send({from,to:inbox,subject:noticeSubject(id),text:"GoEast internal Test notice. The order ID is in the subject; open the authorized test queue to check the paid order."},{idempotencyKey:"arrival-test-paid-"+id});
  if(sent.error||!sent.data?.id) return false;
  await db().query("UPDATE arrival_preview.jobs SET notice_id=$2 WHERE id=$1 AND notice_id IS NULL",[id,sent.data.id]);
  return true;
}
export async function findPaidArrival(id:string){
  if(!orderId.test(id)) return null;
  const entry=await find(id);
  return entry?.state==="paid"?{id,version:entry.itineraryVersion,deadline:entry.deadline,trip:entry.trip,noticeSent:!!entry.notice_id}:null;
}
export async function listUnnotifiedArrivals(){
  return (await db().query<{id:string}>("SELECT id FROM arrival_preview.jobs WHERE state='paid' AND notice_id IS NULL ORDER BY paid_at LIMIT 20")).rows;
}

export async function arrivalPreviewReady(){
  const result=await db().query<{scoped:boolean}>("select current_user='goeast_arrival_preview' and has_table_privilege(current_user,'arrival_preview.jobs','SELECT') as scoped");
  if(result.rows[0]?.scoped!==true) return false;
  await db().query("SELECT id FROM arrival_preview.jobs LIMIT 0");
  return true;
}
