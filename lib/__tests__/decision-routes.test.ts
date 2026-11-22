import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { GET, POST } from "@/app/api/decision-report/[id]/route";
import { POST as checkout } from "@/app/api/decision-report/checkout/route";
import { POST as webhook } from "@/app/api/decision-report/webhook/route";
import { generateDecisionReport } from "@/lib/decision-generation";
import type { DecisionInput } from "@/lib/decision-core";

const handles = vi.hoisted(() => ({
  supabaseAuth: vi.fn(), supabaseStore: vi.fn(), scopedQuery: vi.fn(),
  testProduct: vi.fn(), testCheckout: vi.fn(), testRefund: vi.fn(),
}));
vi.mock("@/lib/decision-pg", () => ({ scopedQuery: () => handles.scopedQuery }));
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
  for (const name of ["VERCEL_GIT_COMMIT_REF", "DECISION_REPORT_STORAGE", "DECISION_REPORT_SCOPED_DATABASE_URL"]) vi.stubEnv(name,undefined);
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
  const product = "prod_61uy92GSfzQr7WkhGkbt4s";
  const valid = { id:"evt_1",eventType:"checkout.completed",object:{
    id:"ch_abc",request_id:id,mode:"test",status:"completed",metadata:{offer_id:"decision_once",order_id:id},
    order:{id:"ord_a",product,amount:199,amount_paid:199,currency:"USD",type:"onetime",status:"paid",transaction:"tran_a"},
    product:{id:product,price:199,currency:"USD",billing_type:"onetime"}
  }};
  const refund = { id:"evt_2",eventType:"refund.created",object:{ id:"ref_1", mode:"test",status:"succeeded",
    refund_amount:199,refund_currency:"USD",transaction:{id:"tran_a",status:"refunded",order:"ord_a",mode:"test"} } };
  const refundTx = { id:"tran_a",order:"ord_a",mode:"test",type:"payment",currency:"USD",
    amount:199,amount_paid:199,status:"refunded",refunded_amount:199 };
  function callback(body:unknown, signed = true, url = path+"webhook") {
    const raw = JSON.stringify(body);
    return new Request(url, { method:"POST",body:raw, headers:{"creem-signature":signed
      ? createHmac("sha256",env.DECISION_REPORT_CREEM_WEBHOOK_SECRET).update(raw).digest("hex") : "invalid"} });
  }
  beforeEach(() => {
    vi.stubEnv("DECISION_REPORT_MODE","test");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF","develop");
    vi.stubEnv("DECISION_REPORT_STORAGE","scoped-postgres");
    vi.stubEnv("DECISION_REPORT_SUPABASE_URL",undefined);
    vi.stubEnv("DECISION_REPORT_SUPABASE_SERVICE_ROLE_KEY",undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://abcdefghijklmnopqrst.supabase.co");
    vi.stubEnv("DECISION_REPORT_SCOPED_DATABASE_URL","postgresql://goeast_p1_qa.abcdefghijklmnopqrst:dummy@aws-0-us-east-1.pooler.supabase.com:6543/postgres");
    vi.stubEnv("DECISION_REPORT_CREEM_PRODUCT_ID",product);
    handles.scopedQuery.mockReset();
    handles.testRefund.mockReset();
  });
  it("rejects other hosts or query-bearing callbacks before signature or database access", async () => {
    const alternate = "https://go-east-generated-preview.vercel.app/api/decision-report/webhook";
    expect((await webhook(callback(valid,true,alternate))).status).toBe(404);
    expect((await webhook(callback(valid,true,path+"webhook?anything=1"))).status).toBe(404);
    expect(handles.scopedQuery).not.toHaveBeenCalled();
  });
  it("rejects an unsigned real-looking callback and ignores wrong environment even if signed", async () => {
    expect((await webhook(callback(valid,false))).status).toBe(401);
    expect(await (await webhook(callback({...valid,object:{...valid.object,mode:"prod"}}))).json()).toEqual({received:true,ignored:true});
    expect(handles.scopedQuery).not.toHaveBeenCalled();
  });
  it("caps declared and streamed bodies before parsing or storage even when length is falsely small", async () => {
    const url = path+"webhook";
    const oversized = JSON.stringify({padding:"x".repeat(65_536)});
    const signature = createHmac("sha256",env.DECISION_REPORT_CREEM_WEBHOOK_SECRET).update(oversized).digest("hex");
    for (const length of ["65537","1",undefined]) {
      const headers:Record<string,string> = {"creem-signature":signature};
      if (length) headers["content-length"] = length;
      const response = await webhook(new Request(url, {method:"POST",headers,body:oversized}));
      expect(response.status).toBe(413);
    }
    expect(handles.scopedQuery).not.toHaveBeenCalled();
  });
  it("verifies original raw bytes and rejects even authentically signed malformed UTF-8", async () => {
    const raw = Uint8Array.from([0xc3,0x28]);
    const signature = createHmac("sha256",env.DECISION_REPORT_CREEM_WEBHOOK_SECRET).update(raw).digest("hex");
    const response = await webhook(new Request(path+"webhook", {method:"POST",
      headers:{"creem-signature":signature},body:raw}));
    expect(response.status).toBe(400);
    expect(handles.scopedQuery).not.toHaveBeenCalled();
  });
  it("uses only the stored checkout/order correlation and asks provider to retry a transient write", async () => {
    handles.scopedQuery.mockRejectedValueOnce(new Error("temporary"));
    expect((await webhook(callback(valid))).status).toBe(503);
    expect(handles.scopedQuery).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("goeast_p1_qa.decision_record_payment"),
      [id,"test",product,"ch_abc","ord_a","tran_a"]);
    expect(handles.supabaseStore).not.toHaveBeenCalled();
  });
  it("keeps TEST checkout attempts on hold after an unknown provider response", async () => {
    handles.scopedQuery.mockResolvedValueOnce([{id,owner_id:owner,mode:"test",status:"pending",product_id:product,checkout_id:null}]);
    expect((await checkout(request(input,path+"checkout"))).status).toBe(409);
    expect(handles.scopedQuery).toHaveBeenCalledTimes(1);
    expect(handles.testCheckout).not.toHaveBeenCalled();
  });
  it("uses an owner, product, order, transaction and TEST qualified atomic refund check", async () => {
    handles.testRefund.mockResolvedValue(refundTx);
    handles.scopedQuery.mockResolvedValueOnce([{result:"refunded"}]);
    expect((await webhook(callback(refund))).status).toBe(200);
    expect(handles.scopedQuery).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/owner_id=\$1.*mode='test'.*product_id=\$2.*provider_order_id=\$3.*transaction_id=\$4.*decision_record_refund/s),
      [owner,product,"ord_a","tran_a"]);
    expect(handles.supabaseStore).not.toHaveBeenCalled();
  });
  it("ignores a signed unlinked lookalike refund, retries only the identified P1 refund, and skips partial refunds", async () => {
    handles.testRefund.mockResolvedValue(refundTx);
    handles.scopedQuery.mockResolvedValue([{result:"unlinked"}]);
    expect(await (await webhook(callback(refund))).json()).toEqual({received:true,ignored:true});
    expect((await webhook(callback({...refund,object:{...refund.object,checkout:{product}}}))).status).toBe(503);
    expect(handles.scopedQuery).toHaveBeenCalledTimes(2);
    handles.testRefund.mockResolvedValue({...refundTx,status:"partialRefund",refunded_amount:50});
    expect(await (await webhook(callback({...refund,object:{...refund.object,refund_amount:50,
      transaction:{...refund.object.transaction,status:"partialRefund"}}}))).json()).toEqual({received:true,ignored:true});
    expect(handles.scopedQuery).toHaveBeenCalledTimes(2);
  });
});
