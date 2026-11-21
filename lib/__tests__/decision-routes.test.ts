import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { GET, POST } from "@/app/api/decision-report/[id]/route";
import { POST as checkout } from "@/app/api/decision-report/checkout/route";
import { POST as webhook } from "@/app/api/decision-report/webhook/route";
import { generateDecisionReport } from "@/lib/decision-generation";
import type { DecisionInput } from "@/lib/decision-core";

const handles = vi.hoisted(() => ({
  supabaseAuth: vi.fn(), supabaseStore: vi.fn(),
  testProduct: vi.fn(), testCheckout: vi.fn(), testRefund: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: handles.supabaseAuth }));
vi.mock("@supabase/supabase-js", () => ({ createClient: handles.supabaseStore }));
vi.mock("@/lib/decision-provider", async importActual => {
  const real = await importActual<typeof import("@/lib/decision-provider")>();
  return { ...real, checkDecisionTestProduct: handles.testProduct, createDecisionTestCheckout: handles.testCheckout,
    fetchDecisionRefundTransaction: handles.testRefund };
});

const owner = "93783acb-2e34-47d4-ae37-33330a3c9d4c";
const other = "83783acb-2e34-47d4-ae37-33330a3c9d4c";
const id = "33783acb-2e34-47d4-ae37-33330a3c9d4c";
const casts: DecisionInput["casts"] = [{binary:"1",changing:false},{binary:"1",changing:false},{binary:"0",changing:false},
  {binary:"0",changing:false},{binary:"0",changing:true},{binary:"0",changing:true}];
const input = { question:"What should I test first?", alternative:null, casts };
const context = { params: Promise.resolve({ id }) };
const path = "https://preview.goeast.ai/api/decision-report/";
const env = { VERCEL_ENV: "preview", DECISION_REPORT_MODE:"mock", DECISION_REPORT_ENABLED:"true",
  DECISION_REPORT_SUPABASE_URL:"https://isolated.supabase.co", NEXT_PUBLIC_SUPABASE_URL:"https://shared.supabase.co",
  DECISION_REPORT_SUPABASE_SERVICE_ROLE_KEY:"test-isolated", DECISION_REPORT_PREVIEW_QA_USER_ID:owner,
  DECISION_REPORT_CREEM_API_KEY:"creem_test_do_not_use", DECISION_REPORT_CREEM_WEBHOOK_SECRET:"test-secret",
  DECISION_REPORT_CREEM_PRODUCT_ID:"prod_once", DECISION_REPORT_PREVIEW_ORIGIN:"https://preview.goeast.ai",
  AZURE_OPENAI_API_KEY:"fixture-key", AZURE_OPENAI_ENDPOINT:"https://example.invalid" };
function request(body: unknown, uri = path + id) { return new Request(uri, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body) }); }
function setUser(userId:string | null) {
  handles.supabaseAuth.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: userId ? { id:userId } : null }, error:null }) } });
}

function orderDb(initial: Record<string, unknown> | null) {
  const filters: Record<string, unknown> = {};
  const db = {
    select: vi.fn(() => db),
    eq: vi.fn((field: string, value: unknown) => {filters[field] = value; return db;}),
    maybeSingle: vi.fn(async () => ({data: initial && Object.entries(filters).every(([key,value]) => key === "cast_hash" || initial[key] === value) ? initial : null,error:null})),
    from: vi.fn(() => { for (const key of Object.keys(filters)) delete filters[key]; return db; }),
    insert: vi.fn(async () => ({error:null})),
    rpc: vi.fn(),
  };
  handles.supabaseStore.mockReturnValue(db);
  return db;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name,value);
  setUser(owner);
});

describe("decision report owner boundary", () => {
  it("returns not found by default and doesn't instantiate the private DB", async () => {
    vi.stubEnv("DECISION_REPORT_ENABLED", undefined);
    expect((await GET(new Request(path + id), context)).status).toBe(404);
    expect(handles.supabaseStore).not.toHaveBeenCalled();
  });
  it("refuses another signed-in account before touching private rows", async () => {
    setUser(other);
    expect((await GET(new Request(path + id), context)).status).toBe(404);
    expect(handles.supabaseStore).not.toHaveBeenCalled();
  });
  it("provides private, uncached detail and suppresses a refunded report", async () => {
    const stored = { id, owner_id:owner, mode:"mock", status:"refunded", report_id:other, report:{question:"private"}, action_note:"private" };
    const db = orderDb(stored);
    const res = await GET(new Request(path + id), context);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toMatch(/private, no-store/);
    expect(await res.json()).toMatchObject({id,status:"refunded",reportId:null,report:null,actionNote:null});
    expect(db.eq).toHaveBeenCalledWith("owner_id",owner);
  });
  it("can't generate if provider hasn't confirmed payment", async () => {
    const db = orderDb({ id, owner_id:owner, mode:"mock", status:"pending" });
    const res = await POST(request({action:"generate"}), context);
    expect(res.status).toBe(409);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("does not create a second checkout for a pending cast", async () => {
    const db = orderDb({ id, owner_id:owner, mode:"mock", status:"pending", product_id:"mock_decision_once" });
    const res = await checkout(request(input,path+"checkout"));
    expect(await res.json()).toEqual({checkoutUrl:"/account/decision-reports/"+id+"?mock=1"});
    expect(db.insert).not.toHaveBeenCalled();
  });
  it("preserves the original cast in the generation fixture and exposes missing alternative as assumption", async () => {
    const report = await generateDecisionReport(input, "mock");
    expect(report.casts).toEqual(casts);
    expect(report).toMatchObject({question:input.question,primary:{number:19},transformed:{number:61},changingLines:[5,6]});
    expect(report.options[1].assumption).toBe(true);
  });
});

describe("decision TEST payment route", () => {
  const valid = { id:"evt_1",eventType:"checkout.completed",object:{
    id:"ch_abc",request_id:id,mode:"test",status:"completed",metadata:{offer_id:"decision_once",order_id:id},
    order:{id:"ord_a",product:"prod_once",amount:199,amount_paid:199,currency:"USD",type:"onetime",status:"paid",transaction:"tran_a"},
    product:{id:"prod_once",price:199,currency:"USD",billing_type:"onetime"}
  }};
  function callback(body:unknown, signed = true) {
    const raw = JSON.stringify(body);
    return new Request(path+"webhook", { method:"POST",body:raw, headers:{"creem-signature":signed
      ? createHmac("sha256",env.DECISION_REPORT_CREEM_WEBHOOK_SECRET).update(raw).digest("hex") : "invalid"} });
  }
  beforeEach(() => vi.stubEnv("DECISION_REPORT_MODE","test"));
  it("rejects an unsigned real-looking callback and ignores wrong environment even if signed", async () => {
    const db = orderDb(null);
    expect((await webhook(callback(valid,false))).status).toBe(401);
    expect((await webhook(callback({...valid,object:{...valid.object,mode:"prod"}}))).status).toBe(200);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("uses only the stored checkout/order correlation and asks provider to retry a transient write", async () => {
    const db = orderDb(null);
    db.rpc.mockResolvedValue({error:{message:"temporary"},data:null});
    const res = await webhook(callback(valid));
    expect(res.status).toBe(503);
    expect(db.rpc).toHaveBeenCalledExactlyOnceWith("decision_record_payment", {p_id:id,p_mode:"test",p_product:"prod_once",
      p_checkout:"ch_abc",p_order:"ord_a",p_tx:"tran_a"});
    expect(db.from).not.toHaveBeenCalled(); // separate from any Pro subscription logic
  });
  it("keeps TEST checkout attempts on hold after an unknown provider response", async () => {
    const db = orderDb({id,owner_id:owner,mode:"test",status:"pending",product_id:"prod_once",checkout_id:null});
    expect((await checkout(request(input,path+"checkout"))).status).toBe(409);
    expect(db.insert).not.toHaveBeenCalled();
    expect(handles.testCheckout).not.toHaveBeenCalled();
  });
});
