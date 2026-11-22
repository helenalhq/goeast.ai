import { afterEach, describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
import { createDecisionTestCheckout, validTestCheckoutLink } from "../decision-provider";
import { decisionConfig } from "../decision-config";
import { decisionInput, fullDecisionRefund, parseDecisionEvent, validDecisionSignature } from "../decision-core";

const qa = "33783acb-2e34-47d4-ae37-33330a3c9d4c";
const env = {
  VERCEL_ENV: "preview", DECISION_REPORT_MODE: "mock", DECISION_REPORT_ENABLED: "true",
  DECISION_REPORT_SUPABASE_URL: "https://isolated.supabase.co",
  NEXT_PUBLIC_SUPABASE_URL: "https://shared.supabase.co",
  DECISION_REPORT_SUPABASE_SERVICE_ROLE_KEY: "fake-mock", DECISION_REPORT_PREVIEW_QA_USER_ID: qa,
};
const checkout = {
  id: "evt_a", eventType: "checkout.completed",
  object: {
    id: "ch_a", request_id: qa, status: "completed", mode: "test",
    metadata: { offer_id: "decision_once", order_id: qa },
    order: { id: "ord_a", product: "prod_once", amount: 199, amount_paid: 199, currency: "USD", status: "paid", type: "onetime", transaction: "tran_a" },
    product: { id: "prod_once", price: 199, currency: "USD", billing_type: "onetime" },
  },
};

describe("preview isolation", () => {
  it("requires explicit mode, environment, owner and separate DB", () => {
    expect(decisionConfig(env)?.mode).toBe("mock");
    expect(decisionConfig({...env, VERCEL_ENV:"production"})).toBeNull();
    expect(decisionConfig({...env, DECISION_REPORT_ENABLED:undefined})).toBeNull();
    expect(decisionConfig({...env, DECISION_REPORT_PREVIEW_QA_USER_ID:""})).toBeNull();
    expect(decisionConfig({...env, DECISION_REPORT_SUPABASE_URL:"https://shared.supabase.co/"})).toBeNull();
  });
  it("requires distinct test provider product and the explicit test API", () => {
    const product = "prod_61uy92GSfzQr7WkhGkbt4s";
    const test = {...env, DECISION_REPORT_MODE:"test", DECISION_REPORT_CREEM_API_KEY:"creem_test_fake",
      DECISION_REPORT_CREEM_WEBHOOK_SECRET:"secret", DECISION_REPORT_CREEM_PRODUCT_ID:product,
      CREEM_PRODUCT_ID:"prod_pro", DECISION_REPORT_PREVIEW_ORIGIN:"https://preview.goeast.ai",
      DECISION_REPORT_STORAGE:"scoped-postgres",
      DECISION_REPORT_SUPABASE_URL:undefined, DECISION_REPORT_SUPABASE_SERVICE_ROLE_KEY:undefined,
      NEXT_PUBLIC_SUPABASE_URL:"https://abcdefghijklmnopqrst.supabase.co",
      DECISION_REPORT_SCOPED_DATABASE_URL:"postgresql://goeast_p1_qa.abcdefghijklmnopqrst:dummy@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      VERCEL_GIT_COMMIT_REF:"develop", AZURE_OPENAI_API_KEY:"fake", AZURE_OPENAI_ENDPOINT:"https://example.invalid"};
    expect(decisionConfig(test)?.mode).toBe("test");
    expect(decisionConfig({...test, DECISION_REPORT_PREVIEW_ORIGIN:"https://go-east-pclius-projects-c305da2a.vercel.app"})).toBeNull();
    expect(decisionConfig({...test, CREEM_PRODUCT_ID:product})).toBeNull();
    expect(decisionConfig({...test, DECISION_REPORT_CREEM_API_KEY:"creem_not_test"})).toBeNull();
  });
});
describe("one-time decision order", () => {
  it("takes only question, optional alternative and six actual lines", () => {
    const casts = Array.from({length:6}, () => ({binary:"1",changing:false}));
    expect(decisionInput({question:" Career decision? ",casts,amount:1,userId:qa})).toEqual({question:"Career decision?",casts,alternative:null});
    expect(decisionInput({question:"Career decision?",casts:casts.slice(1)})).toBeNull();
    expect(decisionInput({question:"Career decision?",casts:[...casts.slice(1),{binary:"1",changing:"false"}]})).toBeNull();
    expect(decisionInput({question:"Career decision?",casts,alternative:"x".repeat(161)})).toBeNull();
  });
  it("recognizes exact paid SKU and rejects wrong amount, environment, currency, or recurring shape", () => {
    expect(parseDecisionEvent(checkout,"prod_once")).toEqual({type:"paid",eventId:"evt_a",orderId:qa,checkoutId:"ch_a",providerOrderId:"ord_a",transactionId:"tran_a"});
    const taxed = {...checkout, object:{...checkout.object, order:{...checkout.object.order,
      amount:211, sub_total:199, tax_amount:12, amount_due:211, amount_paid:211}}};
    expect(parseDecisionEvent(taxed,"prod_once")?.type).toBe("paid");
    const variants = [
      {mode:"prod"}, {subscription:{id:"sub_x"}},
      {order:{...checkout.object.order, amount:198}}, {order:{...checkout.object.order,amount_paid:0}},
      {order:{...checkout.object.order,amount_paid:undefined}}, {order:{...checkout.object.order,transaction:null}},
      {order:{...checkout.object.order,currency:"EUR"}},
      {order:{...checkout.object.order,product:"prod_monthly"}},
      {order:{...checkout.object.order,type:"recurring"}},
      {order:{...checkout.object.order,status:"pending"}},
      {product:{...checkout.object.product,price:198}},
    ];
    for (const v of variants) expect(parseDecisionEvent({...checkout,object:{...checkout.object,...v}},"prod_once")).toBeNull();
  });
  it("requires a succeeded refund and checks full paid total using the authenticated TEST transaction", () => {
    const refund = {id:"evt_r",eventType:"refund.created",object:{status:"succeeded",
      refund_currency:"USD", refund_amount:211, transaction:{id:"tran_a",status:"refunded"}}};
    expect(parseDecisionEvent(refund,"prod_once")).toEqual({type:"refund",eventId:"evt_r",transactionId:"tran_a",refundAmount:211,signedOrderId:null,signedFullRefund:true});
    const tx = {id:"tran_a",order:"ord_a",mode:"test",type:"payment",currency:"USD", amount:199,amount_paid:211,status:"refunded"};
    expect(fullDecisionRefund(tx,"tran_a",211)).toEqual({providerOrderId:"ord_a"});
    expect(fullDecisionRefund({...tx,mode:"prod"},"tran_a",211)).toBeNull();
    expect(fullDecisionRefund(tx,"tran_a",50)).toBeNull();
    expect(fullDecisionRefund({...tx,status:"partially_refunded"},"tran_a",211)).toBeNull();
  });
  it("accepts the exact TEST hosted path and forbids product, checkout and route substitution", () => {
    const base = "https://www.creem.io";
    expect(validTestCheckoutLink(base+"/test/checkout/prod_once/ch_a","ch_a","prod_once")).toBe(true);
    expect(validTestCheckoutLink(base+"/checkout/prod_once/ch_a","ch_a","prod_once")).toBe(false);
    expect(validTestCheckoutLink(base+"/test/checkout/prod_pro/ch_a","ch_a","prod_once")).toBe(false);
    expect(validTestCheckoutLink("https://checkout.creem.io/ch_a","ch_a","prod_once")).toBe(true);
  });
  it("validates the raw-body HMAC and not a rewritten or unsigned payload", () => {
    const raw = JSON.stringify(checkout);
    const sig = createHmac("sha256","fixture-secret").update(raw).digest("hex");
    expect(validDecisionSignature(raw,sig,"fixture-secret")).toBe(true);
    expect(validDecisionSignature(raw+" ",sig,"fixture-secret")).toBe(false);
    expect(validDecisionSignature(raw,"bad","fixture-secret")).toBe(false);
  });
});

describe("TEST provider checkout echo correlation", () => {
  const productId = "prod_fixture";
  const config = { mode: "test", storage: "scoped-postgres", dsn: "fixture", qaUserId: qa,
    apiKey: "fixture", webhookSecret: "fixture", productId, publicOrigin: "https://preview.goeast.ai" } as const;
  const successUrl = "https://preview.goeast.ai/account/decision-reports/" + qa;
  const url = "https://checkout.creem.io/ch_fixture";
  const anchors = { metadata: { offer_id: "decision_once", order_id: qa }, success_url: successUrl };
  const another = "43783acb-2e34-47d4-ae37-33330a3c9d4c";
  const reply = (fields: Record<string, unknown>) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: "ch_fixture", mode: "test",
      status: "pending", product: productId, checkout_url: url, ...fields })));
    return createDecisionTestCheckout(config, qa);
  };
  afterEach(() => vi.unstubAllGlobals());

  it.each([qa, qa.toUpperCase()])("keeps accepting the same UUID when extra echoes are absent (%s)", async request_id => {
    await expect(reply({ request_id })).resolves.toEqual({ id: "ch_fixture", url });
  });

  it.each([undefined, null, "provider_echo"])("accepts an absent or opaque request echo only with exact alternate anchors (%s)", async request_id => {
    await expect(reply({ request_id, ...anchors })).resolves.toEqual({ id: "ch_fixture", url });
  });

  it.each([
    [{ ...anchors, request_id: another }, "different_uuid", true, true, true],
    [{ ...anchors, request_id: {}, }, "not_uuid", true, true, true],
    [{ ...anchors, success_url: undefined }, "missing", true, true, false],
    [{ ...anchors, request_id: null, success_url: successUrl + "?extra=1" }, "null", true, true, false],
    [{ ...anchors, metadata: { ...anchors.metadata, order_id: another } }, "missing", false, true, true],
    [{ ...anchors, request_id: "provider_echo", metadata: { ...anchors.metadata, offer_id: "other_offer" } }, "not_uuid", true, false, true],
  ] as const)("rejects contradictory or insufficient fallback and only records safe checks (%j)",
    async (fields, shape, orderMatches, offerMatches, urlMatches) => {
      await expect(reply(fields)).rejects.toMatchObject({ diagnostic: { stage: "correlation",
        mismatch_fields: expect.arrayContaining(["request_id"]),
        echo_checks: { request_id_shape: shape, metadata_order_matches: orderMatches,
          metadata_offer_matches: offerMatches, success_url_matches: urlMatches } } });
    });

  it.each([
    [{ metadata: { ...anchors.metadata, order_id: another } }, "metadata.order_id"],
    [{ success_url: "https://elsewhere.invalid/" }, "success_url"],
    [{ checkout_url: "https://elsewhere.invalid/" }, "checkout_url"],
    [{ status: "completed" }, "status"],
    [{ mode: "prod" }, "mode"],
    [{ product: "prod_other" }, "product"],
  ] as const)("rejects other contradictions even with the correct UUID (%j)", async (changes, field) => {
    await expect(reply({ ...anchors, request_id: qa, ...changes })).rejects.toMatchObject({ diagnostic: {
      stage: "correlation", mismatch_fields: [field] } });
  });
  it("requires a signed metadata anchor and rejects contradictions in the webhook parser", () => {
    const event = (fields: Record<string, unknown>) => ({ ...checkout, object: { ...checkout.object, ...fields } });
    for (const request_id of [undefined, null, "opaque-provider", qa.toUpperCase()]) {
      expect(parseDecisionEvent(event({ request_id }), "prod_once")?.type).toBe("paid");
    }
    for (const fields of [{ request_id: another }, { request_id: 123 },
      { success_url: successUrl + "?different=1" }, { metadata: { order_id: qa } }]) {
      expect(parseDecisionEvent(event(fields), "prod_once")).toBeNull();
    }
  });
});
