import type { DecisionConfig } from "./decision-config";
import { decisionCheckoutSuccessUrl, decisionRequestIdShape, exactDecisionProduct, opaqueId, record, usableDecisionRequestIdEcho } from "./decision-core";
import { DECISION_OFFER } from "./decision-types";

type TestConfig = Extract<DecisionConfig, { mode: "test" }>;
const TEST_API = "https://test-api.creem.io/v1";

type MismatchField = "id" | "checkout_url" | "mode" | "request_id" | "product" | "status"
  | "metadata.order_id" | "metadata.offer_id" | "success_url";
type CheckoutEchoChecks = {
  request_id_shape: Exclude<ReturnType<typeof decisionRequestIdShape>, "match">;
  metadata_order_matches: boolean;
  metadata_offer_matches: boolean;
  success_url_matches: boolean;
};
type TestCheckoutProviderDiagnostic =
  | { stage: "provider"; reason: "transport" | "invalid_json" }
  | { stage: "provider"; reason: "http"; http_status?: number }
  | { stage: "correlation"; mismatch_fields: MismatchField[]; echo_checks?: CheckoutEchoChecks };

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
  const successUrl = decisionCheckoutSuccessUrl(orderId);
  const reply = await testFetch(config, "/checkouts", { method: "POST",
    ...(recovery ? { redirect: "error" as const } : {}), body: JSON.stringify({
    product_id: config.productId, request_id: orderId, units: 1,
    success_url: successUrl,
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
  const metadata = record(reply.metadata);
  const requestIdShape = decisionRequestIdShape(reply.request_id, orderId);
  const orderMatches = metadata.order_id === orderId;
  const offerMatches = metadata.offer_id === DECISION_OFFER;
  const successUrlMatches = reply.success_url === successUrl;
  if (requestIdShape !== "match" && (requestIdShape === "different_uuid" || !usableDecisionRequestIdEcho(reply.request_id)
      || !orderMatches || !offerMatches || !successUrlMatches)) mismatches.push("request_id");
  // Optional when the request UUID is correct, but a conflicting returned
  // anchor must never be ignored, even on the original success path.
  if (reply.metadata != null) {
    if (!orderMatches) mismatches.push("metadata.order_id");
    if (!offerMatches) mismatches.push("metadata.offer_id");
  }
  if (reply.success_url != null && !successUrlMatches) mismatches.push("success_url");
  if (productId !== config.productId) mismatches.push("product");
  if (reply.status !== "pending") mismatches.push("status");
  if (mismatches.length || !id || checkoutUrl === null) {
    throw new DecisionTestProviderError({ stage: "correlation", mismatch_fields: mismatches,
      ...(requestIdShape !== "match" ? { echo_checks: { request_id_shape: requestIdShape,
        metadata_order_matches: orderMatches, metadata_offer_matches: offerMatches,
        success_url_matches: successUrlMatches } } : {}) });
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
