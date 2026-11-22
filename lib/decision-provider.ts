import type { DecisionConfig } from "./decision-config";
import { exactDecisionProduct, opaqueId, record } from "./decision-core";
import { DECISION_OFFER } from "./decision-types";

type TestConfig = Extract<DecisionConfig, { mode: "test" }>;
const TEST_API = "https://test-api.creem.io/v1";

type MismatchField = "id" | "checkout_url" | "mode" | "request_id" | "product" | "status";
type TestCheckoutProviderDiagnostic =
  | { stage: "provider"; reason: "transport" | "invalid_json" }
  | { stage: "provider"; reason: "http"; http_status?: number }
  | { stage: "correlation"; mismatch_fields: MismatchField[] };

// Contains only diagnostic constants, bounded HTTP status, and allowlisted
// field names. Never attach the raw provider exception or response as a cause.
export class DecisionTestProviderError extends Error {
  constructor(readonly diagnostic: TestCheckoutProviderDiagnostic) {
    super("Decision TEST provider checkout could not be verified");
  }
}

async function testFetch(config: TestConfig, path: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(TEST_API + path, {
      ...init, cache: "no-store", signal: AbortSignal.timeout(12_000),
      headers: { "x-api-key": config.apiKey, "Content-Type": "application/json" },
    });
  } catch {
    throw new DecisionTestProviderError({ stage: "provider", reason: "transport" });
  }
  if (!response.ok) {
    const status = response.status;
    throw new DecisionTestProviderError({ stage: "provider", reason: "http",
      ...(Number.isInteger(status) && status >= 300 && status <= 599 ? { http_status: status } : {}) });
  }
  try {
    return record(await response.json());
  } catch {
    throw new DecisionTestProviderError({ stage: "provider", reason: "invalid_json" });
  }
}

export async function checkDecisionTestProduct(config: TestConfig) {
  const response = await testFetch(config, "/products?product_id=" + encodeURIComponent(config.productId));
  return response.mode === "test" && response.status === "active" && exactDecisionProduct(response, config.productId);
}

export async function createDecisionTestCheckout(config: TestConfig, orderId: string, recovery = false) {
  const reply = await testFetch(config, "/checkouts", { method: "POST",
    ...(recovery ? { redirect: "error" as const } : {}), body: JSON.stringify({
    product_id: config.productId, request_id: orderId, units: 1,
    success_url: config.publicOrigin + "/account/decision-reports/" + orderId,
    metadata: { offer_id: DECISION_OFFER, order_id: orderId },
  }) });
  const id = opaqueId(reply.id, "ch_");
  const productId = typeof reply.product === "string" ? reply.product : record(reply.product).id;
  const checkoutUrl = typeof reply.checkout_url === "string" ? reply.checkout_url : null;
  const mismatches: MismatchField[] = [];
  if (!id) mismatches.push("id");
  if (checkoutUrl === null || (id !== null && !validTestCheckoutLink(checkoutUrl, id, config.productId))) {
    mismatches.push("checkout_url");
  }
  if (reply.mode !== "test") mismatches.push("mode");
  if (reply.request_id !== orderId) mismatches.push("request_id");
  if (productId !== config.productId) mismatches.push("product");
  if (reply.status !== "pending") mismatches.push("status");
  if (mismatches.length || !id || checkoutUrl === null) {
    throw new DecisionTestProviderError({ stage: "correlation", mismatch_fields: mismatches });
  }
  return { id, url: checkoutUrl };
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
