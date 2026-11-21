import type { DecisionConfig } from "./decision-config";
import { exactDecisionProduct, opaqueId, record } from "./decision-core";
import { DECISION_OFFER } from "./decision-types";

type TestConfig = Extract<DecisionConfig, { mode: "test" }>;
const TEST_API = "https://test-api.creem.io/v1";

async function testFetch(config: TestConfig, path: string, init: RequestInit = {}) {
  const response = await fetch(TEST_API + path, {
    ...init, cache: "no-store", signal: AbortSignal.timeout(12_000),
    headers: { "x-api-key": config.apiKey, "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("TEST provider did not return success");
  return record(await response.json());
}

export async function checkDecisionTestProduct(config: TestConfig) {
  const response = await testFetch(config, "/products?product_id=" + encodeURIComponent(config.productId));
  return response.mode === "test" && response.status === "active" && exactDecisionProduct(response, config.productId);
}

export async function createDecisionTestCheckout(config: TestConfig, orderId: string) {
  const reply = await testFetch(config, "/checkouts", { method: "POST", body: JSON.stringify({
    product_id: config.productId, request_id: orderId, units: 1,
    success_url: config.publicOrigin + "/account/decision-reports/" + orderId,
    metadata: { offer_id: DECISION_OFFER, order_id: orderId },
  }) });
  const id = opaqueId(reply.id, "ch_");
  const productId = typeof reply.product === "string" ? reply.product : record(reply.product).id;
  if (!id || typeof reply.checkout_url !== "string" || reply.mode !== "test"
    || reply.request_id !== orderId || productId !== config.productId || reply.status !== "pending") {
    throw new Error("TEST checkout could not be correlated");
  }
  if (!validTestCheckoutLink(reply.checkout_url, id, config.productId)) throw new Error("Unexpected TEST checkout address");
  return { id, url: reply.checkout_url };
}

export function validTestCheckoutLink(link: string, id: string, productId: string): boolean {
  try {
    const url = new URL(link);
    if (url.protocol !== "https:" || url.port || url.username || url.password || url.hash) return false;
    if (url.hostname === "checkout.creem.io") return url.pathname === "/" + id;
    return ["creem.io", "www.creem.io"].includes(url.hostname)
      && url.pathname === "/test/checkout/" + productId + "/" + id;
  } catch { return false; }
}

export async function fetchDecisionRefundTransaction(config: TestConfig, transactionId: string) {
  return testFetch(config, "/transactions?transaction_id=" + encodeURIComponent(transactionId));
}
