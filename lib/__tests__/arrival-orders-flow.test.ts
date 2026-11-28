import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { arrivalBuyer, arrivalOperator, arrivalWebhook } from "../arrival-orders-runtime";
const state=vi.hoisted(()=>({db:null as unknown as PGlite,userId:""}));
vi.mock("pg",()=>({Pool:class {on(){} async connect(){return {query:(q:string,p?:unknown[])=>state.db.query(q,p),
  release:()=>undefined};}}}));
vi.mock("../supabase/server",()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:state.userId?{id:state.userId}:null}})}})}));

const owner="5bcab979-8b67-414a-a26a-9e78b52bcc0a", another="5bcab979-8b67-414a-a26a-9e78b52bcc0b";
const origin="https://preview.goeast.ai", secret="qa-signature-only-repeated-for-local-test";
const token="isolated-operator-token-for-tester-only", product="prod_ExampleArrival";
const day=(delta:number)=>new Date(Date.now()+8*3600000+delta*86400000).toISOString().slice(0,10);
function make(path:string,body?:object,headers:Record<string,string>={}){
  return new Request(origin+"/api/arrival-orders/"+path,{method:body?"POST":"GET",
    headers:{origin,...(body?{"content-type":"application/json"}:{}),...headers},body:body?JSON.stringify(body):undefined});
}
const auth={authorization:"Bearer "+token};
const iso=(delay:number)=>new Date(Date.now()+delay).toISOString();
function webhook(event:object,good=true){
  const raw=JSON.stringify(event);
  return arrivalWebhook(new Request(origin+"/api/arrival-orders/webhook",{method:"POST",body:raw,headers:{
    "creem-signature":good?createHmac("sha256",secret).update(raw).digest("hex"):"wrong"}}));
}
beforeAll(async()=>{
  state.db=new PGlite();
  await state.db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE goeast_arrival_orders_runtime NOINHERIT;");
  await state.db.exec(readFileSync("supabase/arrival-orders/install.sql","utf8"));
  for(const role of ["anon","authenticated","service_role"]){
    await state.db.exec("SET ROLE "+role);
    await expect(state.db.query("SELECT * FROM arrival_orders.orders")).rejects.toThrow(/permission denied/);
    await state.db.exec("RESET ROLE");
  }
  await state.db.exec("SET ROLE goeast_arrival_orders_runtime");
  const project="abcdefghijklmnopqrst";
  for(const [k,v] of Object.entries({VERCEL_ENV:"preview",ARRIVAL_ORDERS_MODE:"test",ARRIVAL_ORDERS_ORIGIN:origin,
    ARRIVAL_ORDERS_PRODUCT:product,ARRIVAL_ORDERS_CREEM_KEY:"creem_test_local_fixture",ARRIVAL_ORDERS_CREEM_SIGNING_SECRET:secret,
    ARRIVAL_ORDERS_OPERATOR_ID:another,ARRIVAL_ORDERS_OPERATOR_TOKEN:token,ARRIVAL_ORDERS_TEST_BUYER:owner,
    ARRIVAL_ORDERS_DB_PROJECT:project,ARRIVAL_ORDERS_DB_URL:"postgresql://goeast_arrival_orders_runtime."+project+":fake@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"}))vi.stubEnv(k,v);
},20_000);
afterAll(async()=>{vi.unstubAllEnvs();vi.unstubAllGlobals(); await state.db?.close();});

it("links real route code, local Postgres, signed payment models, rendered packet and private download",async()=>{
  vi.stubEnv("ARRIVAL_ORDERS_MODE","off");
  expect((await arrivalBuyer(make("orders"))).status).toBe(404);
  expect((await arrivalOperator(make("operator",undefined,auth))).status).toBe(404);
  vi.stubEnv("ARRIVAL_ORDERS_MODE","test");
  state.userId=owner;
  let payment:Record<string,unknown>={}, tx:Record<string,unknown>={}, creates=0;
  vi.stubGlobal("fetch",vi.fn(async (url:string,opts:RequestInit)=>{
    expect(url.startsWith("https://test-api.creem.io/v1/")).toBe(true);
    if(opts.method==="POST"){
      creates++;
      const req=JSON.parse(String(opts.body));
      const id="ch_checkout"+creates;
      payment={id,mode:"test",product,status:"pending",request_id:req.request_id,metadata:req.metadata,
        success_url:req.success_url,checkout_url:"https://www.creem.io/test/checkout/"+product+"/"+id};
      return Response.json(payment);
    }
    if(url.includes("/transactions?"))return Response.json(tx);
    if(url.includes("/checkouts?"))return Response.json(payment);
    throw new Error("Unexpected outgoing call");
  }));
  const trip={date:day(11),flight:"DX118",hotel:"Park Hyatt Shanghai",airport:"PVG",preferences:["no_mobile_data","no_mobile_payments"],termsAccepted:true};
  const submit=async(hotel=trip.hotel)=>{
    const r=await arrivalBuyer(make("orders",{...trip,hotel}));
    expect(r.status).toBe(201);
    return (await r.json()).id as string;
  };
  expect((await arrivalBuyer(make("orders",trip,{origin:"https://unrelated.example"}))).status).toBe(403);
  const id=await submit(), different=await submit("Grand Hyatt Shanghai");
  await expect(state.db.query("UPDATE arrival_orders.orders SET trip='{}' WHERE id=$1",[id])).rejects.toThrow(/permission denied/);
  expect((await arrivalOperator(make("operator"))).status).toBe(404);
  expect((await (await arrivalOperator(make("operator",undefined,auth))).json()).orders).toHaveLength(2);
  const checkout=()=>arrivalBuyer(make("orders?action=checkout",{id,acceptedQuote:true}));
  expect((await checkout()).status).toBe(409);
  const op=(payload:object,target=id)=>arrivalOperator(make("operator?id="+target,payload,auth));
  expect((await op({action:"quote",hotel:trip.hotel,terminal:"T1",localTime:"13:10",quoteExpires:iso(1800000),dueAt:iso(7200000)})).status).toBe(200);
  expect((await checkout()).status).toBe(200);
  expect((await checkout()).status).toBe(200);
  expect(creates).toBe(1);
  const orderInfo={id:"ord_first",transaction:"tran_first",product,type:"onetime",currency:"USD",amount:1290,status:"paid"};
  payment={...payment,status:"completed",order:orderInfo};
  tx={id:"tran_first",order:"ord_first",mode:"test",type:"payment",status:"paid",amount:1290,amount_paid:1380,tax_amount:90,currency:"USD",created_at:iso(1000)};
  const event={id:"evt_paid",eventType:"checkout.completed",object:payment};
  expect((await webhook(event,false)).status).toBe(401);
  expect((await webhook(event)).status).toBe(200);
  expect((await webhook(event)).status).toBe(200);
  const info=await (await arrivalOperator(make("operator?id="+id,undefined,auth))).json();
  expect(info.row.state).toBe("paid");
  expect((await arrivalBuyer(make("orders?id="+id+"&file=pdf"))).status).toBe(404);

  const directory=mkdtempSync(join(tmpdir(),"goeast-flow-"));
  try{
    let pdf:Buffer,png:Buffer,manifest:Record<string,unknown>;
    if(process.env.ARRIVAL_TEST_RENDER==="1"){
      const fixture=JSON.parse(readFileSync("scripts/fixtures/arrival-order-packet.qa.json","utf8"));
      writeFileSync(join(directory,"recipe.json"),JSON.stringify({...fixture,orderId:id,trip:info.row.packetTrip}));
      const generated=spawnSync("python",["scripts/render-arrival-order.py",join(directory,"recipe.json"),directory],{encoding:"utf8"});
      expect(generated.status,generated.stderr).toBe(0);
      pdf=readFileSync(join(directory,"report.pdf"));png=readFileSync(join(directory,"address.png"));
      manifest=JSON.parse(readFileSync(join(directory,"manifest.json"),"utf8"));
    } else {
      // Keep the default JS suite dependency-free from Python and OS fonts;
      // the opt-in rendering run exercises the real report against the same API.
      pdf=Buffer.from("%PDF-1.4\\nQA fixture\\n%%EOF");png=Buffer.from("89504e470d0a1a0a00","hex");
      const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
      manifest={orderId:id,version:1,template:"arrival-v1",purpose:"qa",trip:info.row.packetTrip,sha256:{pdf:sha(pdf),png:sha(png)}};
    }
    const approved={action:"approve",manifest,pdf:pdf.toString("base64"),png:png.toString("base64")};
    expect((await op(approved,different)).status).toBe(409);
    expect((await op({...approved,manifest:{...approved.manifest,orderId:different}})).status).toBe(400);
    expect((await op({...approved,manifest:{...approved.manifest,purpose:"reviewed"}})).status).toBe(400);
    expect((await op(approved)).status).toBe(200);
    expect((await op(approved)).status).toBe(200);

    state.userId=another;
    expect((await arrivalBuyer(make("orders?id="+id+"&file=pdf"))).status).toBe(401);
    vi.stubEnv("ARRIVAL_ORDERS_TEST_BUYER",another);
    expect((await arrivalBuyer(make("orders?id="+id+"&file=pdf"))).status).toBe(404);
    expect((await (await arrivalBuyer(make("orders"))).json()).orders).toHaveLength(0);
    vi.stubEnv("ARRIVAL_ORDERS_TEST_BUYER",owner);
    state.userId=owner;
    const response=await arrivalBuyer(make("orders?id="+id+"&file=pdf"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(Buffer.from(await response.arrayBuffer()).equals(pdf)).toBe(true);
    const card=await arrivalBuyer(make("orders?id="+id+"&file=png"));
    expect(Buffer.from(await card.arrayBuffer()).equals(png)).toBe(true);
    expect((await webhook({id:"evt_refund",eventType:"refund.created",object:{mode:"test",transaction:{id:"tran_first"}}})).status).toBe(200);
    expect((await webhook(event)).status).toBe(200);
    expect((await arrivalBuyer(make("orders?id="+id+"&file=pdf"))).status).toBe(404);
    expect((await op(approved)).status).toBe(409);
  }finally{rmSync(directory,{recursive:true,force:true});}

  // Second order: a dispute can arrive before the paid callback and must still win.
  expect((await op({action:"quote",hotel:"Grand Hyatt Shanghai",terminal:"T2",localTime:"16:30",quoteExpires:iso(1800000),dueAt:iso(7200000)},different)).status).toBe(200);
  expect((await arrivalBuyer(make("orders?action=checkout",{id:different,acceptedQuote:true}))).status).toBe(200);
  payment={...payment,status:"completed",order:{...orderInfo,id:"ord_second",transaction:"tran_second"}};
  tx={...tx,id:"tran_second",order:"ord_second",created_at:iso(1000)};
  expect((await webhook({id:"evt_dispute",eventType:"dispute.created",object:{mode:"test",transaction:{id:"tran_second"}}})).status).toBe(200);
  expect((await webhook({id:"evt_otherpaid",eventType:"checkout.completed",object:payment})).status).toBe(200);
  const disputed=await arrivalBuyer(make("orders?id="+different));
  expect((await disputed.json()).order.state).toBe("revoked");
  expect((await arrivalBuyer(make("orders?id="+different+"&file=pdf"))).status).toBe(404);
},30_000);
