import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decisionLivePolicy } from "../decision-live-policy";
import {
  buildDecisionLiveCheckout, normalizeDecisionLiveCheckout, normalizeDecisionLiveWebhook,
  matchesDecisionLivePayment, reconcileDecisionLiveRefund,
} from "../decision-live-provider";

const ownerId = "33783acb-2e34-47d4-ae37-33330a3c9d4c";
const orderId = "43783acb-2e34-47d4-ae37-33330a3c9d4c";
const productId = "prod_fixtureLive";
const origin = "https://www.goeast.ai";
const webhookUrl = origin + "/api/decision-report/webhook";
const policy = decisionLivePolicy({ VERCEL_ENV:"production",VERCEL_GIT_COMMIT_REF:"main",DECISION_REPORT_LIVE_PHASE:"canary",
  DECISION_REPORT_LIVE_ORIGIN:origin,DECISION_REPORT_LIVE_CREEM_PRODUCT_ID:productId,
  DECISION_REPORT_LIVE_CANARY_OWNER_ID:ownerId,CREEM_PRODUCT_ID:"prod_fixturePro" });
if (!policy) throw new Error("fixture");
const secret = "local-test-fixture-secret";
const product = { id:productId,mode:"prod",status:"active",billing_type:"onetime",price:199,currency:"USD" };
const meta = {offer_id:"decision_once",order_id:orderId};
const success = origin + "/account/decision-reports/" + orderId;
const pending = { id:"ch_a",mode:"prod",status:"pending",product:productId,
  request_id:"providerEcho",metadata:meta,success_url:success,checkout_url:"https://checkout.creem.io/ch_a" };
const purchase = { id:"evt_a",eventType:"checkout.completed",object:{ id:"ch_a",mode:"prod",status:"completed",
  metadata:meta,request_id:"providerEcho",success_url:success,product,order:{ id:"ord_a",product:productId,mode:"prod",
    amount:199,sub_total:199,tax_amount:20,amount_paid:219,amount_due:219,currency:"USD",status:"paid",
    type:"onetime",transaction:"tran_a" }} };
const refund = { id:"evt_b",eventType:"refund.created",object:{ id:"ref_a",status:"succeeded",refund_currency:"USD",
  refund_amount:219,transaction:{id:"tran_a",order:"ord_a",mode:"prod"} } };
const linkedPaid = { ownerId,orderId,checkoutId:"ch_a",mode:"live",status:"delivered",productId,
  providerOrderId:"ord_a",transactionId:"tran_a",grossCents:219 };
const verifiedTransaction = { id:"tran_a",mode:"prod",type:"payment",order:"ord_a",status:"refunded",
  amount:199,amount_paid:219,tax_amount:20,refunded_amount:219,currency:"USD" };

function signed(value:unknown, url = webhookUrl, signingSecret = secret) {
  const raw = Buffer.from(JSON.stringify(value));
  return normalizeDecisionLiveWebhook(policy,{url,raw,secret,signature:createHmac("sha256",signingSecret).update(raw).digest("hex")});
}

describe("GoEast Live provider boundary (offline)", () => {
  it("builds a one-time checkout only from a fresh allowed owner and authenticated Live product evidence", () => {
    expect(buildDecisionLiveCheckout(policy,ownerId,origin,orderId,product)).toEqual({
      url:"https://api.creem.io/v1/checkouts",
      body:{ product_id:productId, request_id:orderId, units:1, success_url:success, metadata:meta },
    });
    expect(buildDecisionLiveCheckout(policy,ownerId,origin,orderId,{...product,mode:"test"})).toBeNull();
    expect(buildDecisionLiveCheckout(policy,orderId,origin,orderId,product)).toBeNull();
    expect(buildDecisionLiveCheckout(policy,ownerId,origin,"bad-id",product)).toBeNull();
  });
  it("verifies Live hosted checkout correlation without accepting another intent, Test links or external hosts", () => {
    expect(normalizeDecisionLiveCheckout(policy,orderId,pending)).toEqual({checkoutId:"ch_a",url:pending.checkout_url});
    for (const diff of [{mode:"test"},{request_id:ownerId},{metadata:undefined},{success_url:undefined},
      {checkout_url:"https://www.creem.io/test/checkout/prod_fixtureLive/ch_a"},
      {checkout_url:"https://checkout.creem.io/ch_other"},{checkout_url:"https://checkout.creem.io.evil.test/ch_a"},
      {checkout_url:"https://checkout.creem.io/ch_a?redirect=https://example.invalid"}]) {
      expect(normalizeDecisionLiveCheckout(policy,orderId,{...pending,...diff})).toBeNull();
    }
  });
  it("rejects wrong ingress/secret, oversized bytes and authenticated malformed JSON", () => {
    expect(signed(purchase,"https://preview.goeast.ai/api/decision-report/webhook")).toEqual({kind:"reject",status:404});
    expect(signed(purchase,webhookUrl,"other-secret")).toEqual({kind:"reject",status:401});
    expect(signed({padding:"x".repeat(65_536)})).toEqual({kind:"reject",status:413});
    const raw = Buffer.from([0xff]);
    expect(normalizeDecisionLiveWebhook(policy,{url:webhookUrl,raw,secret,
      signature:createHmac("sha256",secret).update(raw).digest("hex")})).toEqual({kind:"reject",status:400});
  });
  it("checks tax and base, resolves exact previously recorded checkout, and never accepts standalone or Test payments", () => {
    const event = signed(purchase);
    expect(event).toMatchObject({kind:"paid",orderId,checkoutId:"ch_a",providerOrderId:"ord_a",transactionId:"tran_a",
      baseCents:199,taxCents:20,grossCents:219});
    if (event.kind !== "paid") throw new Error("fixture");
    expect(matchesDecisionLivePayment(policy,event,{...linkedPaid,status:"pending",providerOrderId:null,transactionId:null,grossCents:null})).toBe(true);
    expect(matchesDecisionLivePayment(policy,event,{...linkedPaid,checkoutId:"ch_other"})).toBe(false);
    expect(matchesDecisionLivePayment(policy,event,{...linkedPaid,mode:"test"})).toBe(false);
    for (const obj of [{...purchase.object,metadata:undefined},{...purchase.object,mode:"test"},
      {...purchase.object,order:{...purchase.object.order,amount_paid:199}},
      {...purchase.object,order:{...purchase.object.order,tax_amount:-1}},
      {...purchase.object,order:{...purchase.object.order,discount_amount:20}}]) {
      expect(signed({...purchase,object:obj}).kind).toBe(obj.mode==="test"?"ignored":"reconcile_payment");
    }
  });
  it("requires exact linked Live store transaction and authoritative full paid-gross refund, not a dispute or partial", () => {
    const event = signed(refund);
    expect(event).toMatchObject({kind:"refund",providerOrderId:"ord_a",transactionId:"tran_a"});
    if (event.kind !== "refund") throw new Error("fixture");
    expect(reconcileDecisionLiveRefund(policy,event,verifiedTransaction,linkedPaid)).toBe("full");
    expect(reconcileDecisionLiveRefund(policy,event,{...verifiedTransaction,refunded_amount:100},linkedPaid)).toBe("reconcile");
    expect(reconcileDecisionLiveRefund(policy,{...event,refundCents:100},
      {...verifiedTransaction,status:"partialRefund",refunded_amount:100},linkedPaid)).toBe("partial");
    for (const row of [null,{...linkedPaid,mode:"test"},{...linkedPaid,productId:"prod_fixturePro"},{...linkedPaid,grossCents:199}]) {
      expect(reconcileDecisionLiveRefund(policy,event,verifiedTransaction,row)).toBe("reconcile");
    }
    expect(signed({...refund,eventType:"dispute.created"})).toMatchObject({kind:"dispute"});
  });
});
