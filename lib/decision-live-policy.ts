// Pure policy. No network, secrets, or storage.
// This cannot create a Live offer, prove readiness, or authenticate a buyer.
import { DECISION_UUID } from "./decision-config";
import { DECISION_CENTS, DECISION_CURRENCY } from "./decision-types";

const LIVE_ORIGIN = "https://www.goeast.ai";
const LIVE_API = "https://api.creem.io/v1";
const LIVE_WEBHOOK = "https://www.goeast.ai/api/decision-report/webhook";
const PREVIEW_TEST_PRODUCT = "prod_61uy92GSfzQr7WkhGkbt4s";
const PRODUCT_ID = /^prod_[A-Za-z0-9]{1,96}$/;

type Destinations = Readonly<{
  origin: typeof LIVE_ORIGIN;
  apiBase: typeof LIVE_API;
  webhookUrl: typeof LIVE_WEBHOOK;
  productId: string;
}>;

export type DecisionLivePolicy = Destinations & (
  | Readonly<{ phase: "settlement_only" | "public" }>
  | Readonly<{ phase: "canary"; ownerId: string }>
);

/** Public sales require their own explicit operator gate. */
export function decisionLivePolicy(env: Readonly<Record<string, string | undefined>>): DecisionLivePolicy | null {
  const phase = env.DECISION_REPORT_LIVE_PHASE;
  if (phase !== "settlement_only" && phase !== "canary" && !(phase === "public" && env.DECISION_REPORT_LIVE_PUBLIC_ENABLED === "true")) return null;
  if (env.VERCEL_ENV !== "production" || env.VERCEL_GIT_COMMIT_REF !== "main"
      || env.DECISION_REPORT_LIVE_ORIGIN !== LIVE_ORIGIN) return null;
  const productId = env.DECISION_REPORT_LIVE_CREEM_PRODUCT_ID;
  const proProduct = env.CREEM_PRODUCT_ID;
  if (!productId || !PRODUCT_ID.test(productId) || !proProduct || !PRODUCT_ID.test(proProduct)
      || productId === proProduct || productId === PREVIEW_TEST_PRODUCT
      || productId === env.DECISION_REPORT_CREEM_PRODUCT_ID) return null;
  const destinations: Destinations = { origin:LIVE_ORIGIN, apiBase:LIVE_API, webhookUrl:LIVE_WEBHOOK, productId };
  if (phase !== "canary") return { ...destinations, phase };
  const owner = env.DECISION_REPORT_LIVE_CANARY_OWNER_ID;
  if (!owner || !DECISION_UUID.test(owner)) return null;
  return { ...destinations, phase, ownerId:owner.toLowerCase() };
}

/** Pass a server-authenticated UUID, not an owner from URL or JSON input. */
export function decisionLiveCheckoutAllowed(
  policy: DecisionLivePolicy | null, authenticatedOwnerId: string | null, requestOrigin: string | null,
): boolean {
  return !!policy && !!authenticatedOwnerId && DECISION_UUID.test(authenticatedOwnerId) && requestOrigin === policy.origin
    && (policy.phase === "public" || (policy.phase === "canary" && authenticatedOwnerId.toLowerCase() === policy.ownerId));
}

/** Destination is not authorization: exact raw signature still required. */
export function decisionLiveWebhookDestinationMatches(policy: DecisionLivePolicy | null, requestUrl: string | null): boolean {
  return policy !== null && requestUrl === policy.webhookUrl;
}

/** Pass only a product response obtained from the authenticated Live API. */
export function isDecisionLiveProduct(policy: DecisionLivePolicy | null, raw: unknown): boolean {
  if (!policy || typeof raw !== "object" || raw === null || Array.isArray(raw)) return false;
  const { id, mode, status, billing_type, price, currency } = raw as Record<string, unknown>;
  return mode === "prod" && id === policy.productId && status === "active" && billing_type === "onetime"
    && price === DECISION_CENTS && currency === DECISION_CURRENCY;
}
