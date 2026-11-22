import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { GET } from "@/app/api/decision-report/readiness/route";

const fixture=vi.hoisted(()=>({db:vi.fn(),auth:vi.fn(),fetch:vi.fn()}));
vi.mock("../decision-live-store",()=>({checkLiveDbIsolation:fixture.db}));
vi.mock("../supabase/server",()=>({createClient:fixture.auth}));

const host="https://www.goeast.ai", url=host+"/api/decision-report/readiness";
const ref="abcdefghijklmnopqrst", token="c".repeat(64), sku="prod_readinessFixture";
const dsn=(role:string)=>"postgresql://"+role+"."+ref+":fixture-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const env={
  VERCEL_ENV:"production",VERCEL_GIT_COMMIT_REF:"main",
  DECISION_REPORT_LIVE_READINESS_TOKEN:token,DECISION_REPORT_LIVE_ORIGIN:host,
  DECISION_REPORT_LIVE_DB_PROJECT_REF:ref,DECISION_REPORT_LIVE_APP_DATABASE_URL:dsn("p1_live_app"),
  DECISION_REPORT_LIVE_CALLBACK_DATABASE_URL:dsn("p1_live_callback"),DECISION_REPORT_LIVE_CREEM_PRODUCT_ID:sku,
  DECISION_REPORT_LIVE_CREEM_API_KEY:"creem_fixtureReadinessKey",DECISION_REPORT_LIVE_CREEM_WEBHOOK_SECRET:"fixture-vendor-signature",
  CREEM_PRODUCT_ID:"prod_fixturePro",DECISION_REPORT_LIVE_MODEL_CREDENTIAL_SOURCE:"existing_azure",
  DECISION_REPORT_LIVE_MODEL_BUDGET_ACK:"true",AZURE_OPENAI_MODEL:"existing-deployment",
  AZURE_OPENAI_API_KEY:"fixture-azure-config-key",AZURE_OPENAI_ENDPOINT:"https://resource.openai.azure.com/openai/v1",
};
const product={id:sku,mode:"prod",status:"active",billing_type:"onetime",price:199,currency:"USD"};
const req=(authorization:string|undefined="Bearer "+token,destination=url)=>new Request(destination,{
  headers:authorization?{authorization}:undefined,
});
beforeEach(()=>{
  vi.resetAllMocks();
  for (const key of ["DECISION_REPORT_LIVE_SETTLEMENT_ENABLED","DECISION_REPORT_LIVE_CHECKOUT_ENABLED",
    "DECISION_REPORT_LIVE_PUBLIC_ENABLED","DECISION_REPORT_LIVE_PHASE"]) vi.stubEnv(key,undefined);
  for (const [key,value] of Object.entries(env)) vi.stubEnv(key,value);
  vi.stubGlobal("fetch",fixture.fetch);
  fixture.db.mockResolvedValue(true);
  fixture.fetch.mockImplementation(()=>Promise.resolve(Response.json(product)));
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});

describe("production-only P1 presale readiness",()=>{
  it.each([
    req(""),req("Bearer "+"d".repeat(64)),req("Bearer "+token+"a"),req("Bearer "+token,url+"?probe=1"),
    req("Bearer "+token,url.replace("www.","")),req("Bearer "+token,url.replace("www.","preview.")),
  ])("conceals the route and contacts nothing on unmatched auth or destination",async(request)=>{
    const response=await GET(request);
    expect(response.status).toBe(404);expect(await response.json()).toEqual({ok:false});
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(fixture.db).not.toHaveBeenCalled();expect(fixture.fetch).not.toHaveBeenCalled();
  });
  it.each([
    ["VERCEL_ENV","preview"],["VERCEL_GIT_COMMIT_REF","develop"],["DECISION_REPORT_LIVE_READINESS_TOKEN",undefined],
    ["DECISION_REPORT_LIVE_CREEM_WEBHOOK_SECRET",token],
    ["DECISION_REPORT_LIVE_CHECKOUT_ENABLED","true"],["DECISION_REPORT_LIVE_PUBLIC_ENABLED","true"],
  ])("returns 404 without work when auth is unconfigured or deployment/sales mode unsafe: %s",async(key,value)=>{
    vi.stubEnv(key,value);
    expect((await GET(req())).status).toBe(404);
    expect(fixture.db).not.toHaveBeenCalled();expect(fixture.fetch).not.toHaveBeenCalled();
  });
  it.each([undefined,"true"])("validates both scoped DB identities and exact SKU by GET with settlement=%s",async(settlement)=>{
    vi.stubEnv("DECISION_REPORT_LIVE_SETTLEMENT_ENABLED",settlement);
    const response=await GET(req());
    expect(response.status).toBe(200);expect(await response.json()).toEqual({ok:true});
    expect(fixture.db.mock.calls).toEqual([[dsn("p1_live_app"),"owner"],[dsn("p1_live_callback"),"callback"]]);
    expect(fixture.fetch).toHaveBeenCalledTimes(1);
    expect(fixture.fetch).toHaveBeenCalledWith("https://api.creem.io/v1/products?product_id="+sku,
      expect.objectContaining({method:"GET",cache:"no-store",redirect:"error",headers:expect.objectContaining({"x-api-key":env.DECISION_REPORT_LIVE_CREEM_API_KEY})}));
    expect(fixture.auth).not.toHaveBeenCalled();
  });
  it.each([{status:"inactive"},{mode:"test"},{price:200},{currency:"EUR"},{billing_type:"recurring"},{id:"prod_other"}])(
    "rejects invalid product data %j as a generic read-only failure",async(change)=>{
      fixture.fetch.mockResolvedValue(Response.json({...product,...change}));
      const response=await GET(req());expect(response.status).toBe(503);expect(await response.json()).toEqual({ok:false});
    });
  it("fails generically on timeout/rejection, either bad role, or wrong response shape",async()=>{
    fixture.db.mockRejectedValueOnce(new Error("private fixture message"));
    expect((await GET(req())).status).toBe(503);
    fixture.db.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await GET(req())).status).toBe(503);
    fixture.fetch.mockResolvedValueOnce(new Response("bad",{status:200}));
    expect((await GET(req())).status).toBe(503);
    fixture.fetch.mockRejectedValueOnce(new Error("private host/credential"));
    const response=await GET(req());expect(response.status).toBe(503);expect(await response.json()).toEqual({ok:false});
  });
  it.each([
    ["DECISION_REPORT_LIVE_APP_DATABASE_URL",dsn("p1_live_callback")],
    ["DECISION_REPORT_LIVE_CREEM_API_KEY","creem_test_notForLive"],
    ["DECISION_REPORT_LIVE_CREEM_WEBHOOK_SECRET",undefined],
    ["AZURE_OPENAI_ENDPOINT","https://example.invalid/openai/v1"],
    ["DECISION_REPORT_LIVE_MODEL_BUDGET_ACK",undefined],
  ])("does not contact any runtime systems if local configuration is invalid: %s",async(key,value)=>{
    vi.stubEnv(key,value);
    const response=await GET(req());expect(response.status).toBe(503);expect(await response.json()).toEqual({ok:false});
    expect(fixture.db).not.toHaveBeenCalled();expect(fixture.fetch).not.toHaveBeenCalled();
  });
});
