import { createHmac } from "node:crypto";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { POST as checkout } from "@/app/api/decision-report/checkout/route";
import { GET,POST as changeOrder } from "@/app/api/decision-report/[id]/route";
import { POST as webhook } from "@/app/api/decision-report/webhook/route";
import { decisionLiveRuntime,liveCheckoutConfigured } from "../decision-live-runtime-config";

const deps=vi.hoisted(()=>({
  auth:vi.fn(),ownerDb:vi.fn(),callbackDb:vi.fn(),model:vi.fn(),fetch:vi.fn(),
}));
vi.mock("@/lib/supabase/server",()=>({createClient:deps.auth}));
vi.mock("../decision-live-store",()=>({liveOwnerDb:deps.ownerDb,liveCallbackDb:deps.callbackDb}));
vi.mock("openai",()=>({default:class {
  chat={completions:{create:deps.model}};
}}));

const owner="33783acb-2e34-47d4-ae37-33330a3c9d4c", other="23783acb-2e34-47d4-ae37-33330a3c9d4c";
const id="43783acb-2e34-47d4-ae37-33330a3c9d4c",origin="https://www.goeast.ai",path=origin+"/api/decision-report";
const ref="abcdefghijklmnopqrst", productId="prod_fixtureLive", secret="signed-fixture-test-secret";
const dsn=(role:string)=>"postgresql://"+role+"."+ref+":not-a-real-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const env={
  VERCEL_ENV:"production",VERCEL_GIT_COMMIT_REF:"main",
  DECISION_REPORT_LIVE_SETTLEMENT_ENABLED:"true",DECISION_REPORT_LIVE_CHECKOUT_ENABLED:"true",
  DECISION_REPORT_LIVE_PHASE:"canary",DECISION_REPORT_LIVE_CANARY_OWNER_ID:owner,
  DECISION_REPORT_LIVE_ORIGIN:origin,DECISION_REPORT_LIVE_DB_PROJECT_REF:ref,
  DECISION_REPORT_LIVE_APP_DATABASE_URL:dsn("p1_live_app"),DECISION_REPORT_LIVE_CALLBACK_DATABASE_URL:dsn("p1_live_callback"),
  DECISION_REPORT_LIVE_CREEM_PRODUCT_ID:productId,CREEM_PRODUCT_ID:"prod_fixturePro",
  DECISION_REPORT_LIVE_CREEM_API_KEY:"creem_fixtureLiveOnlyKey",DECISION_REPORT_LIVE_CREEM_WEBHOOK_SECRET:secret,
  DECISION_REPORT_LIVE_MODEL_CREDENTIAL_SOURCE:"existing_azure",
  DECISION_REPORT_LIVE_MODEL_DEPLOYMENT:"approved-fixture",DECISION_REPORT_LIVE_MODEL_BUDGET_ACK:"true",
  AZURE_OPENAI_API_KEY:"azure-fixture-test-secret",AZURE_OPENAI_ENDPOINT:"https://resource.openai.azure.com/openai/v1",
};
const casts=[{binary:"1",changing:false},{binary:"1",changing:false},{binary:"0",changing:false},
  {binary:"0",changing:false},{binary:"0",changing:true},{binary:"0",changing:true}];
const input={question:"Which fictional museum shift should I try?",casts,alternative:"Try weekends"};
const product={id:productId,mode:"prod",status:"active",billing_type:"onetime",price:199,currency:"USD"};
const liveOrder={id,status:"paid",created_at:new Date("2026-01-01T00:00Z"),capture:{...input,notice_version:"p1-live-data-use-v1"},
  report_id:null,report:null,action_note:null,generation_expires:null,generation_attempts:0};
const tx={id:"tran_fixture",order:"ord_fixture",mode:"prod",type:"payment",amount:199,
  amount_paid:219,tax_amount:20,currency:"USD",status:"paid"};
const paidPayload={id:"evt_pay",eventType:"checkout.completed",object:{
  id:"ch_fixture",mode:"prod",status:"completed",metadata:{offer_id:"decision_once",order_id:id},product,
  order:{id:"ord_fixture",product:productId,amount:199,sub_total:199,tax_amount:20,amount_paid:219,
    currency:"USD",status:"paid",type:"onetime",transaction:"tran_fixture"},
}};

function setOwner(userId:string|null) {
  deps.auth.mockResolvedValue({auth:{getUser:async()=>({data:{user:userId?{id:userId}:null},error:null})}});
}
function request(suffix:string,payload?:unknown) {
  return new Request(path+suffix,payload===undefined?undefined:{method:"POST",
    headers:{"content-type":"application/json",origin},body:JSON.stringify(payload)});
}
function callback(value:unknown, sign=secret) {
  const raw=JSON.stringify(value);
  return new Request(path+"/webhook",{method:"POST",body:raw,headers:{
    "creem-signature":createHmac("sha256",sign).update(raw).digest("hex"),
  }});
}
const context={params:Promise.resolve({id})};

beforeEach(()=>{
  vi.resetAllMocks();
  for (const [name,value] of Object.entries(env)) vi.stubEnv(name,value);
  vi.stubEnv("DECISION_REPORT_LIVE_PUBLIC_ENABLED",undefined);
  vi.stubGlobal("fetch",deps.fetch);
  setOwner(owner);
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});

describe("Production P1 wiring with fake database and no external calls",()=>{
  it("is dark on the actual routes by default and never consults credentials on disabled requests",async()=>{
    vi.stubEnv("DECISION_REPORT_LIVE_SETTLEMENT_ENABLED",undefined);
    for (const res of [await checkout(request("/checkout",input)),await GET(request("/"+id),context),await webhook(callback(paidPayload))]){
      expect(res.status).toBe(404);expect(res.headers.get("cache-control")).toContain("no-store");
    }
    expect(deps.auth).not.toHaveBeenCalled();expect(deps.fetch).not.toHaveBeenCalled();
  });
  it("requires a deliberate public gate, exact role credentials and explicit safe model without broadening settlement",()=>{
    expect(liveCheckoutConfigured(decisionLiveRuntime())).toBe(true);
    expect(decisionLiveRuntime({...env,DECISION_REPORT_LIVE_PHASE:"public"})?.policy.phase).toBe("settlement_only");
    expect(decisionLiveRuntime({...env,DECISION_REPORT_LIVE_PHASE:"public",DECISION_REPORT_LIVE_PUBLIC_ENABLED:"true"})?.policy.phase).toBe("public");
    expect(decisionLiveRuntime({...env,DECISION_REPORT_LIVE_APP_DATABASE_URL:env.DECISION_REPORT_LIVE_CALLBACK_DATABASE_URL})?.ownerDsn).toBeNull();
    const reuse=decisionLiveRuntime({...env,DECISION_REPORT_LIVE_MODEL_DEPLOYMENT:undefined,AZURE_OPENAI_MODEL:"existing-model"});
    expect(reuse?.model?.model).toBe("existing-model");
    const modelDown=decisionLiveRuntime({...env,AZURE_OPENAI_ENDPOINT:"https://attacker.invalid/openai/v1"});
    expect(modelDown?.model).toBeNull();expect(modelDown?.callbackDsn).toBeTruthy();expect(liveCheckoutConfigured(modelDown)).toBe(false);
    expect(decisionLiveRuntime({...env,DECISION_REPORT_LIVE_CREEM_API_KEY:"creem_test_not_a_live_credential"})?.creemApiKey).toBeNull();
  });
  it("rejects other canary accounts and missing acknowledgment before any claim or provider request",async()=>{
    const previous=vi.fn();deps.ownerDb.mockReturnValue({previous});
    setOwner(other);
    expect((await checkout(request("/checkout",{...input,privacy_ack:true}))).status).toBe(404);
    setOwner(owner);
    expect((await checkout(request("/checkout",input))).status).toBe(400);
    expect(previous).not.toHaveBeenCalled();expect(deps.fetch).not.toHaveBeenCalled();
  });
  it("refuses checkout before provider or claim when the live settlement role cannot prove readiness",async()=>{
    const previous=vi.fn();deps.ownerDb.mockReturnValue({previous});
    deps.callbackDb.mockReturnValue({ready:async()=>false});
    expect((await checkout(request("/checkout",{...input,privacy_ack:true}))).status).toBe(503);
    expect(previous).not.toHaveBeenCalled();expect(deps.fetch).not.toHaveBeenCalled();
  });
  it("creates at most once after a durable existing-owner claim, then resumes only the stored session",async()=>{
    const previous=vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
      id,status:"pending",checkout_id:"ch_fixture",checkout_url:"https://checkout.creem.io/ch_fixture",
    });
    const claim=vi.fn(async (_owner:string,newId:string)=>({id:newId,status:"pending",claimed:true}));
    const attach=vi.fn(async()=>true);
    deps.ownerDb.mockReturnValue({previous,claim,attach});
    deps.callbackDb.mockReturnValue({ready:async()=>true});
    deps.fetch.mockResolvedValueOnce(Response.json(product)).mockImplementationOnce(async (_url,init)=>{
      const body=JSON.parse(init.body);
      return Response.json({id:"ch_fixture",mode:"prod",status:"pending",product:productId,
        request_id:body.request_id,checkout_url:"https://checkout.creem.io/ch_fixture"});
    });
    const a=await checkout(request("/checkout",{...input,privacy_ack:true}));
    const b=await checkout(request("/checkout",{...input,privacy_ack:true}));
    expect(a.status).toBe(200);expect(b.status).toBe(200);
    expect(await a.json()).toEqual(await b.json());
    expect(claim).toHaveBeenCalledTimes(1);expect(attach).toHaveBeenCalledTimes(1);
    expect(deps.fetch).toHaveBeenCalledTimes(2);
    expect(deps.fetch).toHaveBeenLastCalledWith("https://api.creem.io/v1/checkouts",expect.objectContaining({redirect:"error"}));
    expect(claim.mock.invocationCallOrder[0]).toBeLessThan(deps.fetch.mock.invocationCallOrder[1]);
  });
  it("keeps signed paid/refund processing on when new sales pause, refuses wrong signatures, and never starts AI",async()=>{
    vi.stubEnv("DECISION_REPORT_LIVE_CHECKOUT_ENABLED","false");
    vi.stubEnv("DECISION_REPORT_LIVE_MODEL_BUDGET_ACK","false");
    const linked={ownerId:owner,orderId:id,checkoutId:"ch_fixture",productId,mode:"live",status:"paid",
      providerOrderId:"ord_fixture",transactionId:"tran_fixture",grossCents:219};
    const paid=vi.fn(async()=>"paid"),refund=vi.fn(async()=>"refunded"),enqueue=vi.fn(async()=>"queued");
    deps.callbackDb.mockReturnValue({paid,refund,linked:vi.fn(async()=>linked),enqueue});
    deps.fetch.mockResolvedValueOnce(Response.json(tx)).mockResolvedValueOnce(Response.json({...tx,status:"refunded",refunded_amount:219}));
    expect((await checkout(request("/checkout",input))).status).toBe(404);
    expect((await webhook(callback(paidPayload,"unauthorized-fixture"))).status).toBe(401);
    expect((await webhook(callback(paidPayload))).status).toBe(200);
    const refPayload={id:"evt_refund",eventType:"refund.created",object:{id:"ref_fixture",status:"succeeded",
      refund_currency:"USD",refund_amount:219,transaction:{id:"tran_fixture",order:"ord_fixture",mode:"prod"}}};
    expect((await webhook(callback(refPayload))).status).toBe(200);
    expect(paid).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({orderId:id,taxCents:20,grossCents:219}),"USD");
    expect(refund).toHaveBeenCalledExactlyOnceWith("ord_fixture","tran_fixture","evt_refund",productId,"ch_fixture",219);
    expect(enqueue).not.toHaveBeenCalled();
    expect(deps.model).not.toHaveBeenCalled();
  });
  it("reconciles a full authoritative refund before binding a delayed paid callback",async()=>{
    const paid=vi.fn(async()=>"refund_precedes_payment"),refund=vi.fn(async()=>"refunded"),enqueue=vi.fn(async()=>"queued");
    deps.callbackDb.mockReturnValue({paid,refund,enqueue});
    deps.fetch.mockResolvedValueOnce(Response.json({...tx,status:"refunded",refunded_amount:219}));
    expect((await webhook(callback(paidPayload))).status).toBe(200);
    expect(refund).toHaveBeenCalledExactlyOnceWith("ord_fixture","tran_fixture","verified_full_evt_pay",productId,"ch_fixture",219);
    expect(refund.mock.invocationCallOrder[0]).toBeLessThan(paid.mock.invocationCallOrder[0]);
    expect(deps.model).not.toHaveBeenCalled();
  });
  it("normalizes unlinked payment and disputes to review, never creates entitlement",async()=>{
    const paid=vi.fn(),refund=vi.fn(),enqueue=vi.fn(async()=>"queued");
    deps.callbackDb.mockReturnValue({paid,refund,linked:vi.fn(async()=>null),enqueue});
    expect((await webhook(callback({...paidPayload,object:{...paidPayload.object,metadata:undefined}}))).status).toBe(200);
    expect(enqueue).toHaveBeenCalledExactlyOnceWith("evt_pay","payment","ord_fixture","tran_fixture","unlinked_payment");
    expect(deps.fetch).not.toHaveBeenCalled();expect(paid).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled();
  });
  it("owner-only no-store read does not generate; separate paid lease uses configured model once and saves a real result",async()=>{
    const owned=vi.fn(async (user:string)=>user===owner?liveOrder:null);
    const lease=vi.fn(async()=>true),finish=vi.fn(async()=>true);
    deps.ownerDb.mockReturnValue({owned,lease,finish});
    setOwner(other);
    expect((await GET(request("/"+id),context)).status).toBe(404);
    setOwner(owner);
    const read=await GET(request("/"+id),context);
    expect(read.status).toBe(200);expect(read.headers.get("cache-control")).toContain("no-store");
    expect(deps.model).not.toHaveBeenCalled();
    deps.model.mockResolvedValueOnce({choices:[{message:{content:JSON.stringify({restatement:"Reflect, don't predict.",
      options:[{title:"Evening shift",blindSpot:"Transit timing",assumption:true},{title:"Weekend shift",blindSpot:"Crowds",assumption:false}],
      verifyQuestion:"Can I shadow first?",sevenDayStep:"Ask for a short trial.",interpretation:"Consider both options."})}}]});
    expect((await changeOrder(request("/"+id,{action:"generate"}),context)).status).toBe(200);
    expect(deps.model).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({model:"approved-fixture",max_completion_tokens:1600}),expect.any(Object));
    expect(finish).toHaveBeenCalledExactlyOnceWith(owner,id,expect.any(String),expect.objectContaining({question:input.question,casts}));
  });
});
