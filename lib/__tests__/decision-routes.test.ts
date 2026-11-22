import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  describe("sanitized TEST checkout failure diagnostics", () => {
    const sentinel = "private-fixture-not-for-logs";
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(async () => {
      fetchMock.mockReset();
      vi.stubGlobal("fetch", fetchMock);
      vi.spyOn(console, "warn").mockImplementation(() => {});
      handles.testProduct.mockResolvedValue(true);
      const real = await vi.importActual<typeof import("@/lib/decision-provider")>("@/lib/decision-provider");
      handles.testCheckout.mockImplementation(real.createDecisionTestCheckout);
      handles.scopedQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([]); // lookup, durable claim
    });

    afterEach(() => {
      vi.mocked(console.warn).mockRestore();
      vi.unstubAllGlobals();
      handles.testProduct.mockReset();
      handles.testCheckout.mockReset();
    });

    async function verifyFailure(status: number, diagnostic: Record<string, unknown>) {
      const response = await checkout(request(input, path + "checkout"));
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({
        error: status === 409
          ? "This checkout is being verified. Check Decision reports before trying again."
          : "Decision reports are temporarily unavailable. Try again shortly.",
      });
      expect(console.warn).toHaveBeenCalledExactlyOnceWith("[decision-report]",
        JSON.stringify({ event: "test_checkout_failed", ...diagnostic }));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }

    it("reports a bounded provider HTTP status without reading or logging its error body", async () => {
      const reply = new Response(sentinel, { status: 422, statusText: sentinel });
      const body = vi.spyOn(reply, "json");
      const text = vi.spyOn(reply, "text");
      fetchMock.mockResolvedValueOnce(reply);
      await verifyFailure(503, { stage: "provider", reason: "http", http_status: 422 });
      expect(body).not.toHaveBeenCalled();
      expect(text).not.toHaveBeenCalled();
      expect(handles.scopedQuery).toHaveBeenCalledTimes(2);
    });

    it("distinguishes transport failure and keeps a second request on the existing claim", async () => {
      fetchMock.mockRejectedValueOnce(new Error(sentinel));
      await verifyFailure(503, { stage: "provider", reason: "transport" });
      expect(handles.scopedQuery).toHaveBeenCalledTimes(2);
      handles.scopedQuery.mockResolvedValueOnce([{ id, status: "pending", product_id: product, checkout_id: null }]);
      expect((await checkout(request(input, path + "checkout"))).status).toBe(409);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it("distinguishes invalid JSON from a correlated-field mismatch", async () => {
      fetchMock.mockResolvedValueOnce(new Response(sentinel, { status: 200 }));
      await verifyFailure(503, { stage: "provider", reason: "invalid_json" });
      expect(handles.scopedQuery).toHaveBeenCalledTimes(2);
    });

    it("reports only the names of mismatched fields and does not attempt to save", async () => {
      fetchMock.mockResolvedValueOnce(Response.json({ id: "ch_fixture", mode: sentinel, request_id: sentinel,
        product: { id: sentinel }, status: sentinel, checkout_url: "https://example.invalid/" + sentinel }));
      await verifyFailure(503, { stage: "correlation", mismatch_fields: ["checkout_url", "mode", "request_id", "product", "status"],
        echo_checks: { request_id_shape: "not_uuid", metadata_order_matches: false,
          metadata_offer_matches: false, success_url_matches: false } });
      expect(handles.scopedQuery).toHaveBeenCalledTimes(2);
    });

    function validProviderReply() {
      fetchMock.mockImplementationOnce(async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        return Response.json({ id: "ch_fixture", mode: "test", request_id: body.request_id,
          product, status: "pending", checkout_url: "https://checkout.creem.io/ch_fixture" });
      });
    }

    it("reports a save exception after valid provider correlation without leaking DB error details", async () => {
      validProviderReply();
      handles.scopedQuery.mockRejectedValueOnce(new Error(sentinel));
      await verifyFailure(503, { stage: "save", reason: "write_error" });
      expect(handles.scopedQuery).toHaveBeenCalledTimes(3);
    });

    it("reports no matching save row after valid provider correlation and keeps HTTP 409", async () => {
      validProviderReply();
      handles.scopedQuery.mockResolvedValueOnce([]);
      await verifyFailure(409, { stage: "save", reason: "no_matching_row" });
      expect(handles.scopedQuery).toHaveBeenCalledTimes(3);
    });
  });
  describe("one-shot checkout recovery", () => {
    const recover = (origin = "https://preview.goeast.ai", data = input) => new Request(path+"checkout", {
      method:"POST", headers:{"content-type":"application/json", origin}, body:JSON.stringify(data),
    });
    const pending = {id, owner_id:owner, mode:"test", status:"pending",product_id:product,checkout_id:null,checkout_url:null};
    const success = {id:"ch_fixture",url:"https://checkout.creem.io/ch_fixture"};
    beforeEach(() => {
      vi.stubEnv("DECISION_REPORT_RECOVERY_ENABLED","true");
      vi.stubEnv("DECISION_REPORT_RECOVERY_ORDER_ID",id);
      vi.stubEnv("DECISION_REPORT_RECOVERY_XMIN","110");
      handles.testCheckout.mockReset();
      handles.testProduct.mockReset();
    });
    afterEach(() => {
      for (const name of ["DECISION_REPORT_RECOVERY_ENABLED","DECISION_REPORT_RECOVERY_ORDER_ID","DECISION_REPORT_RECOVERY_XMIN"]) {
        vi.stubEnv(name,undefined);
      }
    });
    it("consumes the exact existing row revision before sending only one original provider request", async () => {
      handles.scopedQuery.mockImplementation(async (sql:string) => {
        if (sql.includes("checkout_id=checkout_id")) {
          const consumed = handles.scopedQuery.mock.calls.filter(([query]) => query.includes("checkout_id=checkout_id")).length;
          return consumed === 1 ? [{revision:"111"}] : [];
        }
        if (sql.includes("returning id")) return [{id}];
        return [pending];
      });
      handles.testCheckout.mockResolvedValue(success);
      const responses = await Promise.all([checkout(recover()),checkout(recover())]);
      expect(responses.map(x=>x.status).sort()).toEqual([200,409]);
      expect(handles.testCheckout).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({qaUserId:owner,mode:"test"}),id,true);
      expect(handles.scopedQuery.mock.calls.some(([sql])=>sql.startsWith("insert"))).toBe(false);
      expect(handles.scopedQuery).toHaveBeenCalledWith(expect.stringContaining("xmin::text=$5"),
        [id,owner,product,expect.any(String),"110"]);
      expect(handles.scopedQuery).toHaveBeenCalledWith(expect.stringContaining("checkout_url=$7"),
        [id,owner,product,expect.any(String),"111","ch_fixture",success.url]);
    });
    it("fails closed on an absent or wrong cast while opt-in is armed and respects the origin", async () => {
      handles.scopedQuery.mockResolvedValueOnce([]);
      expect((await checkout(recover())).status).toBe(409);
      handles.scopedQuery.mockResolvedValueOnce([pending]);
      expect((await checkout(recover("https://example.invalid"))).status).toBe(400);
      expect(handles.scopedQuery).toHaveBeenCalledTimes(1);
      expect(handles.testProduct).not.toHaveBeenCalled();
      expect(handles.testCheckout).not.toHaveBeenCalled();
    });
    it("makes exactly the original Test payload, with redirect disabled, on an intentional recovery", async () => {
      const provider = await vi.importActual<typeof import("@/lib/decision-provider")>("@/lib/decision-provider");
      handles.testCheckout.mockImplementation(provider.createDecisionTestCheckout);
      handles.scopedQuery.mockResolvedValueOnce([pending]).mockResolvedValueOnce([{revision:"111"}]).mockResolvedValueOnce([{id}]);
      const providerFetch = vi.fn(async () => Response.json({ id:"ch_fixture", mode:"test", request_id:id, product,
        status:"pending", checkout_url:success.url }));
      vi.stubGlobal("fetch", providerFetch);
      try {
        expect((await checkout(recover())).status).toBe(200);
        expect(providerFetch).toHaveBeenCalledExactlyOnceWith("https://test-api.creem.io/v1/checkouts", expect.objectContaining({
          method:"POST",redirect:"error",body:JSON.stringify({product_id:product,request_id:id,units:1,
            success_url:"https://preview.goeast.ai/account/decision-reports/"+id,
            metadata:{offer_id:"decision_once",order_id:id}}),
        }));
      } finally { vi.unstubAllGlobals(); }
    });
    it("does not replay after a committed claim and ambiguous provider failure", async () => {
      handles.scopedQuery.mockResolvedValueOnce([pending]).mockResolvedValueOnce([{revision:"111"}])
        .mockResolvedValueOnce([pending]).mockResolvedValueOnce([]);
      handles.testCheckout.mockRejectedValueOnce(new Error("lost acknowledgment"));
      expect((await checkout(recover())).status).toBe(503);
      expect((await checkout(recover())).status).toBe(409);
      expect(handles.testCheckout).toHaveBeenCalledTimes(1);
      expect(handles.scopedQuery).toHaveBeenCalledTimes(4);
    });
  });
  it("uses signed exact metadata and the stored checkout constraint when the request echo is absent", async () => {
    const noEcho = { ...valid, object: { ...valid.object, request_id: undefined } };
    handles.scopedQuery.mockResolvedValueOnce([{result:"invalid"}]);
    expect(await (await webhook(callback(noEcho))).json()).toEqual({received:true,ignored:true});
    expect(handles.scopedQuery).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("decision_record_payment"),
      [id,"test",product,"ch_abc","ord_a","tran_a"]);
    expect(await (await webhook(callback({ ...noEcho, object: { ...noEcho.object, request_id: other } }))).json())
      .toEqual({received:true,ignored:true});
    expect(handles.scopedQuery).toHaveBeenCalledTimes(1);
  });
  it("uses an owner, product, order, transaction and TEST qualified atomic refund check", async () => {
    handles.testRefund.mockResolvedValue(refundTx);
    handles.scopedQuery.mockResolvedValueOnce([{result:"refunded"}]);
    expect((await webhook(callback(refund))).status).toBe(200);
    expect(handles.scopedQuery).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/owner_id=\$1[\s\S]*mode='test'[\s\S]*product_id=\$2[\s\S]*provider_order_id=\$3[\s\S]*transaction_id=\$4[\s\S]*decision_record_refund/),
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
