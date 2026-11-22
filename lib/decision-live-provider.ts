// Pure future Live adapter; no credentials, network, entitlement mutation or
// production routing. Callers must use only the authenticated Creem Live API
// and apply results through atomic, tenant-safe settlement transactions.
import { DECISION_UUID } from "./decision-config";
import { decisionRequestIdShape, exactDecisionProduct, opaqueId, record, usableDecisionRequestIdEcho,
  validDecisionSignature } from "./decision-core";
import { decisionLiveCheckoutAllowed, decisionLiveWebhookDestinationMatches, isDecisionLiveProduct,
  type DecisionLivePolicy } from "./decision-live-policy";
import { DECISION_CENTS, DECISION_CURRENCY, DECISION_OFFER } from "./decision-types";

const BODY_LIMIT = 64 * 1024;
const productId = (value: unknown) => typeof value === "string" ? value : record(value).id;
const prodOrAbsent = (value: unknown) => value == null || value === "prod";
const cents = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 2_147_483_647;

function providerId(value: unknown, prefix: string) {
  const id = opaqueId(value,prefix);
  return id && id.length > prefix.length ? id : null;
}

function returnUrl(policy: DecisionLivePolicy, orderId: string) {
  return policy.origin + "/account/decision-reports/" + orderId;
}

export function decisionLiveAmount(raw: Record<string, unknown>) {
  const base = raw.sub_total ?? raw.amount;
  const tax = raw.tax_amount ?? 0;
  if (base !== DECISION_CENTS || !cents(tax) || raw.currency !== DECISION_CURRENCY
      || (raw.discount_amount != null && raw.discount_amount !== 0) || raw.discount != null) return null;
  const gross = base + tax;
  if (!cents(gross) || raw.amount_paid !== gross || (raw.amount !== base && raw.amount !== gross)
      || (raw.amount_due != null && raw.amount_due !== gross)) return null;
  return { baseCents:base, taxCents:tax, grossCents:gross };
}

export function buildDecisionLiveCheckout(
  policy: DecisionLivePolicy | null, authenticatedOwnerId: string | null,
  requestOrigin: string | null, orderId: string, authenticatedProduct: unknown,
) {
  if (!policy || !DECISION_UUID.test(orderId)
      || !decisionLiveCheckoutAllowed(policy, authenticatedOwnerId, requestOrigin)
      || !isDecisionLiveProduct(policy, authenticatedProduct)) return null;
  return {
    url: policy.apiBase + "/checkouts",
    body: { product_id: policy.productId, request_id: orderId, units: 1, success_url: returnUrl(policy,orderId),
      metadata: { offer_id: DECISION_OFFER, order_id: orderId } },
  };
}

export function normalizeDecisionLiveCheckout(policy: DecisionLivePolicy | null, orderId: string, raw: unknown) {
  if (!policy || !DECISION_UUID.test(orderId)) return null;
  const checkout = record(raw);
  const id = providerId(checkout.id, "ch_");
  const metadata = record(checkout.metadata);
  const expectedReturn = returnUrl(policy,orderId);
  const shape = decisionRequestIdShape(checkout.request_id,orderId);
  if (!id || checkout.mode !== "prod" || checkout.status !== "pending"
      || productId(checkout.product) !== policy.productId || !prodOrAbsent(record(checkout.product).mode)
      || checkout.subscription != null || (checkout.units != null && checkout.units !== 1)
      || !usableDecisionRequestIdEcho(checkout.request_id) || shape === "different_uuid"
      || (checkout.metadata != null && (metadata.offer_id !== DECISION_OFFER || metadata.order_id !== orderId))
      || (checkout.success_url != null && checkout.success_url !== expectedReturn)
      || (shape !== "match" && (metadata.offer_id !== DECISION_OFFER || metadata.order_id !== orderId || checkout.success_url !== expectedReturn))) return null;
  // The provider's documented primary hosted checkout form. Do not infer a Live
  // form from a Test path or accept unknown hosts/query redirects. If Live
  // evidence later shows another legitimate form, add it explicitly with tests.
  if (!matchesLiveHostedCheckout(checkout.checkout_url,id)) return null;
  return { checkoutId:id, url:checkout.checkout_url };
}

export function matchesLiveHostedCheckout(url: unknown, checkoutId: string): url is string {
  return providerId(checkoutId,"ch_") !== null && url === "https://checkout.creem.io/" + checkoutId;
}

export function decisionLiveTransactionOrder(raw: unknown) {
  const tx = record(raw);
  return providerId(tx.order,"ord_") ?? providerId(record(tx.order).id,"ord_");
}

type PaidEvent = Readonly<{
  kind: "paid"; eventId: string; orderId: string; checkoutId: string; productId: string;
  providerOrderId: string; transactionId: string; baseCents: number; taxCents: number; grossCents: number;
}>;
type RefundEvent = Readonly<{
  kind: "refund"; eventId: string; refundId: string; transactionId: string; providerOrderId: string | null; refundCents: number;
  exactSku: boolean; checkoutId: string | null;
}>;
type Callback = { url: string; raw: Uint8Array; signature: string; secret: string };
type DecisionLiveReview = Readonly<{kind:"reconcile_payment"|"dispute";eventId:string;providerOrderId:string|null;transactionId:string|null;exactSku:boolean}>;
type DecisionLiveEvent = PaidEvent | RefundEvent | DecisionLiveReview | { kind: "ignored" } | { kind: "reject"; status: 400 | 401 | 404 | 413 };
const ignored = { kind:"ignored" } as const;

export function normalizeDecisionLiveWebhook(policy: DecisionLivePolicy | null, req: Callback): DecisionLiveEvent {
  if (!policy || !decisionLiveWebhookDestinationMatches(policy,req.url)) return {kind:"reject",status:404};
  // The future HTTP ingress is also expected to bound the stream before allocation.
  if (req.raw.length > BODY_LIMIT) return {kind:"reject",status:413};
  if (!validDecisionSignature(req.raw,req.signature,req.secret)) return {kind:"reject",status:401};
  let event: Record<string, unknown>;
  try { event = record(JSON.parse(new TextDecoder("utf-8", { fatal:true }).decode(req.raw))); }
  catch { return {kind:"reject",status:400}; }
  const eventId = providerId(event.id,"evt_");
  if (!eventId) return ignored;
  const obj = record(event.object);
  if (event.eventType === "checkout.completed") {
    const meta = record(obj.metadata);
    const order = record(obj.order);
    const transaction = record(order.transaction);
    const orderId = typeof meta.order_id === "string" && DECISION_UUID.test(meta.order_id) ? meta.order_id : null;
    const checkoutId = providerId(obj.id,"ch_");
    const providerOrderId = providerId(order.id,"ord_");
    const transactionId = providerId(order.transaction,"tran_") ?? providerId(transaction.id,"tran_");
    const money = decisionLiveAmount(order);
    const sku=productId(obj.product);
    const relevant=obj.mode==="prod" && obj.status==="completed" && obj.subscription==null
      && (sku===policy.productId || order.product===policy.productId);
    if (!orderId || !checkoutId || !providerOrderId || !transactionId || !money || meta.offer_id !== DECISION_OFFER
        || !usableDecisionRequestIdEcho(obj.request_id) || decisionRequestIdShape(obj.request_id,orderId) === "different_uuid"
        || (obj.success_url != null && obj.success_url !== returnUrl(policy,orderId))
        || obj.mode !== "prod" || obj.status !== "completed" || obj.subscription != null
        || !prodOrAbsent(order.mode) || !prodOrAbsent(transaction.mode) || !prodOrAbsent(record(obj.product).mode)
        || order.product !== policy.productId || !exactDecisionProduct(obj.product,policy.productId)
        || order.status !== "paid" || order.type !== "onetime" || (obj.units != null && obj.units !== 1)) {
      return relevant && providerOrderId && transactionId
        ? {kind:"reconcile_payment",eventId,providerOrderId,transactionId,exactSku:true} : ignored;
    }
    // This is only signed evidence, never entitlement. The future route must
    // match atomically against the already-recorded intended Live checkout.
    return {kind:"paid",eventId,orderId,checkoutId,productId:policy.productId,providerOrderId,transactionId,...money};
  }
  if (event.eventType === "refund.created") {
    const tx = record(obj.transaction);
    const checkout = record(obj.checkout);
    const sku = productId(checkout.product);
    const refundId = providerId(obj.id,"ref_");
    const transactionId = providerId(tx.id,"tran_");
    const providerOrderId = providerId(tx.order,"ord_") ?? providerId(record(tx.order).id,"ord_");
    if (!refundId || !transactionId || obj.status !== "succeeded" || obj.refund_currency !== DECISION_CURRENCY
        || !cents(obj.refund_amount) || obj.refund_amount === 0 || obj.subscription != null || tx.subscription != null
        || !prodOrAbsent(obj.mode) || !prodOrAbsent(tx.mode) || !prodOrAbsent(checkout.mode)
        || (sku != null && sku !== policy.productId)) return ignored;
    return {kind:"refund",eventId,refundId,transactionId,providerOrderId,refundCents:obj.refund_amount,
      exactSku:sku===policy.productId,checkoutId:providerId(checkout.id,"ch_")};
  }
  if (event.eventType === "dispute.created") {
    const tx=record(obj.transaction), checkout=record(obj.checkout);
    const transactionId=providerId(tx.id,"tran_");
    const providerOrderId=decisionLiveTransactionOrder(tx);
    const sku=productId(checkout.product);
    if (!transactionId || !providerOrderId || obj.subscription!=null || tx.subscription!=null
        || !prodOrAbsent(obj.mode) || !prodOrAbsent(tx.mode) || !prodOrAbsent(checkout.mode)
        || (sku!=null && sku!==policy.productId)) return ignored;
    // Queue for human reconciliation only, never authorize a refund or hold.
    return {kind:"dispute",eventId,providerOrderId,transactionId,exactSku:sku===policy.productId};
  }
  return ignored;
}

type UntrustedState = Readonly<{
  ownerId: string; orderId: string; checkoutId: string; mode: string; status: string; productId: string;
  providerOrderId: string | null; transactionId: string | null; grossCents: number | null;
}>;

/** The row must be loaded by the future scoped Live store, not request input. */
export function matchesDecisionLivePayment(policy: DecisionLivePolicy, event: PaidEvent, row: UntrustedState | null): boolean {
  return !!row && DECISION_UUID.test(row.ownerId)
    && row.mode === "live" && row.status === "pending" && row.orderId === event.orderId
    && row.productId === policy.productId && event.productId === policy.productId && row.checkoutId === event.checkoutId
    && row.providerOrderId === null && row.transactionId === null && row.grossCents === null;
}

/** Return a proposed disposition only; don't mutate on unlinked or partial evidence. */
export function reconcileDecisionLiveRefund(
  policy: DecisionLivePolicy, event: RefundEvent, authenticatedTransaction: unknown, row: UntrustedState | null,
): "full" | "partial" | "reconcile" {
  const tx = record(authenticatedTransaction);
  const providerOrderId = providerId(tx.order,"ord_") ?? providerId(record(tx.order).id,"ord_");
  const money = decisionLiveAmount(tx);
  if (!row || !DECISION_UUID.test(row.ownerId) || row.mode !== "live" || row.productId !== policy.productId
      || !["paid","generating","delivered","refunded"].includes(row.status) || !providerId(row.checkoutId,"ch_")
      || !money || row.grossCents !== money.grossCents || tx.mode !== "prod" || tx.type !== "payment"
      || tx.id !== event.transactionId || row.transactionId !== event.transactionId || tx.subscription != null
      || !providerOrderId || row.providerOrderId !== providerOrderId
      || (event.providerOrderId !== null && event.providerOrderId !== providerOrderId)) return "reconcile";
  // Never replace inconsistent authoritative totals with the webhook amount.
  const total = tx.refunded_amount == null ? event.refundCents : tx.refunded_amount;
  if (!cents(total) || !cents(event.refundCents) || event.refundCents === 0
      || total < event.refundCents || total > money.grossCents) return "reconcile";
  if (tx.status === "refunded" && total === money.grossCents) return "full";
  if (tx.status === "partialRefund" && total < money.grossCents) return "partial";
  return "reconcile";
}
