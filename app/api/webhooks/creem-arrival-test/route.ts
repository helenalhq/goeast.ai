import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime="nodejs";
export const maxDuration=45;
const limit=64_000;
const origin="https://preview.goeast.ai";
const path="/api/webhooks/creem-arrival-test";
const sku="prod_6mUIh9LkfcmjyuSLmfByO";
const fixedTarget=/^https:\/\/go-east-[a-z0-9-]+-pclius-projects-c305da2a\.vercel\.app$/;
const response=(status:number,body:Record<string,unknown>)=>Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"}});
async function readLimited(request:Request){
  if(Number(request.headers.get("content-length")??0)>limit||!request.body) return null;
  const reader=request.body.getReader();
  const chunks:Uint8Array[]=[];
  let bytes=0;
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done) return Buffer.concat(chunks);
      bytes+=value.byteLength;
      if(bytes>limit){await reader.cancel();return null;}
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
}
export async function POST(request:Request){
  const url=new URL(request.url);
  if(process.env.VERCEL_ENV!=="preview"||url.origin!==origin||url.pathname!==path||url.search) return response(404,{error:"not found"});
  const signature=request.headers.get("creem-signature")??"";
  if(!/^[0-9a-f]{64}$/i.test(signature)) return response(401,{error:"invalid signature"});
  const secret=process.env.ARRIVAL_CREEM_TEST_WEBHOOK_SECRET??"";
  const target=process.env.ARRIVAL_TEST_RELAY_TARGET??"";
  if(!secret||!fixedTarget.test(target)) return response(503,{error:"test relay unconfigured"});
  try{
    const original=await readLimited(request);
    if(!original) return response(413,{error:"invalid size"});
    const expected=createHmac("sha256",secret).update(original).digest();
    if(!timingSafeEqual(expected,Buffer.from(signature,"hex"))) return response(401,{error:"invalid signature"});
    const body=new TextDecoder("utf-8",{fatal:true}).decode(original);
    const event=JSON.parse(body) as {eventType?:string;object?:{mode?:string;product?:string|{id?:string};metadata?:{offer_id?:string}}}|null;
    const o=event?.object;
    if(event?.eventType!=="checkout.completed"||o?.mode!=="test"||o?.metadata?.offer_id!=="shanghai_arrival_qa"||
      (typeof o.product==="string"?o.product:o.product?.id)!==sku) return response(200,{ignored:true});
    const oidc=request.headers.get("x-vercel-oidc-token");
    if(!oidc) return response(503,{error:"test relay identity unavailable"});
    const upstream=await fetch(target+"/api/arrival-test/webhook",{
      method:"POST",redirect:"error",cache:"no-store",signal:AbortSignal.timeout(32000),body,
      headers:{"content-type":"application/json","creem-signature":signature,"x-vercel-trusted-oidc-idp-token":oidc},
    });
    if(!upstream.ok){console.warn("[arrival-test-relay] protected upstream status",upstream.status);return response(503,{error:"test relay delivery pending"});}
    return response(200,{received:true});
  }catch{return response(503,{error:"test relay delivery pending"});}
}
