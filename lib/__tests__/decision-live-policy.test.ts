import { describe, expect, it } from "vitest";
import {
  decisionLivePolicy, decisionLiveCheckoutAllowed, decisionLiveWebhookDestinationMatches, isDecisionLiveProduct,
} from "../decision-live-policy";

const owner = "33783acb-2e34-47d4-ae37-33330a3c9d4c";
const productId = "prod_fixtureLive";
const origin = "https://www.goeast.ai";
const fixture = {
  VERCEL_ENV:"production", VERCEL_GIT_COMMIT_REF:"main",
  DECISION_REPORT_LIVE_PHASE:"canary",
  DECISION_REPORT_LIVE_ORIGIN:origin,
  DECISION_REPORT_LIVE_CREEM_PRODUCT_ID:productId,
  DECISION_REPORT_LIVE_CANARY_OWNER_ID:owner,
  CREEM_PRODUCT_ID:"prod_fixturePro",
};

describe("inert P1 Live preflight policy", () => {
  it("is off without an explicit recognized phase, including typo, generic preview flag, or public requested", () => {
    for (const phase of [undefined, "off", "true", "public", " canary"]) {
      expect(decisionLivePolicy({...fixture,DECISION_REPORT_ENABLED:"true",DECISION_REPORT_LIVE_PHASE:phase})).toBeNull();
    }
  });
  it("rejects wrong Vercel target, branch, canonical origin, known Test and existing Pro SKU", () => {
    for (const overrides of [
      {VERCEL_ENV:"preview"}, {VERCEL_ENV:"development"}, {VERCEL_GIT_COMMIT_REF:"develop"},
      {VERCEL_GIT_COMMIT_REF:undefined}, {DECISION_REPORT_LIVE_ORIGIN:"https://preview.goeast.ai"},
      {DECISION_REPORT_LIVE_ORIGIN:origin+"/"}, {DECISION_REPORT_LIVE_ORIGIN:"https://goeast.ai"},
      {DECISION_REPORT_LIVE_CREEM_PRODUCT_ID:"prod_61uy92GSfzQr7WkhGkbt4s"},
      {DECISION_REPORT_LIVE_CREEM_PRODUCT_ID:fixture.CREEM_PRODUCT_ID}, {CREEM_PRODUCT_ID:undefined},
      {DECISION_REPORT_LIVE_CANARY_OWNER_ID:""}, {DECISION_REPORT_LIVE_CANARY_OWNER_ID:"*"},
    ]) {
      expect(decisionLivePolicy({...fixture,...overrides})).toBeNull();
    }
  });
  it("only emits fixed live destinations and accepts exactly canonical webhook URL", () => {
    const policy = decisionLivePolicy(fixture);
    expect(policy).toMatchObject({
      phase:"canary", origin, apiBase:"https://api.creem.io/v1", webhookUrl:origin+"/api/decision-report/webhook",
      productId, ownerId:owner,
    });
    const route = origin+"/api/decision-report/webhook";
    expect(decisionLiveWebhookDestinationMatches(policy,route)).toBe(true);
    for (const value of [null, route+"?x=1", route+"/", route.replace("www.","preview."),
      route.replace("/decision-report/webhook","/webhooks/creem"), route.replace("https://","https://user@")]) {
      expect(decisionLiveWebhookDestinationMatches(policy,value)).toBe(false);
    }
  });
  it("permits only the already authenticated designated owner to start a canonical canary checkout", () => {
    const policy = decisionLivePolicy(fixture);
    expect(decisionLiveCheckoutAllowed(policy,owner,origin)).toBe(true);
    expect(decisionLiveCheckoutAllowed(policy,owner,"https://goeast.ai")).toBe(false);
    expect(decisionLiveCheckoutAllowed(policy,"23783acb-2e34-47d4-ae37-33330a3c9d4c",origin)).toBe(false);
    expect(decisionLiveCheckoutAllowed(policy,null,origin)).toBe(false);
    expect(decisionLiveCheckoutAllowed(null,owner,origin)).toBe(false);
  });
  it("keeps verified settlement possible when new sales stop without assuming a canary identity", () => {
    const policy = decisionLivePolicy({...fixture, DECISION_REPORT_LIVE_PHASE:"settlement_only",
      DECISION_REPORT_LIVE_CANARY_OWNER_ID:undefined});
    expect(policy).toMatchObject({phase:"settlement_only"});
    expect(decisionLiveCheckoutAllowed(policy,owner,origin)).toBe(false);
    expect(decisionLiveWebhookDestinationMatches(policy,origin+"/api/decision-report/webhook")).toBe(true);
  });
  it("requires authenticated-provider evidence of exact active Live one-time USD 199 product", () => {
    const policy = decisionLivePolicy(fixture);
    const product = {id:productId,mode:"prod",billing_type:"onetime",status:"active",price:199,currency:"USD"};
    expect(isDecisionLiveProduct(policy, product)).toBe(true);
    expect(isDecisionLiveProduct(null, product)).toBe(false);
    for (const diff of [{mode:"test"},{mode:"sandbox"},{mode:"live"},{mode:undefined},{id:"prod_other"},
      {billing_type:"recurring"},{currency:"EUR"},{price:200},{price:"199"},{status:"archived"}]) {
      expect(isDecisionLiveProduct(policy,{...product,...diff})).toBe(false);
    }
  });
});
