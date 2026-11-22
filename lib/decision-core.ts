import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { DECISION_UUID } from "./decision-config";
import { DECISION_CENTS, DECISION_CURRENCY, DECISION_OFFER, type DecisionCoin } from "./decision-types";

export type DecisionInput = { question: string; casts: DecisionCoin[]; alternative: string | null };
export type PaidEvent = { type: "paid"; eventId: string; orderId: string; checkoutId: string; providerOrderId: string; transactionId: string };
export type RefundEvent = { type: "refund"; eventId: string; transactionId: string; refundAmount: number; signedOrderId: string | null; signedFullRefund: boolean };
export type DecisionEvent = PaidEvent | RefundEvent;

export function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function opaqueId(value: unknown, prefix: string): string | null {
  return typeof value === "string" && value.length <= 100 && value.startsWith(prefix)
    && /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}
export function decisionInput(raw: unknown): DecisionInput | null {
  const input = record(raw);
  const question = typeof input.question === "string" ? input.question.trim() : "";
  if (!question || question.length > 500 || !Array.isArray(input.casts) || input.casts.length !== 6) return null;
  if (input.alternative != null && typeof input.alternative !== "string") return null;
  const alternative = typeof input.alternative === "string" ? input.alternative.trim() : "";
  if (alternative.length > 160) return null;
  const casts: DecisionCoin[] = [];
  for (const value of input.casts) {
    const { binary, changing } = record(value);
    if ((binary !== "0" && binary !== "1") || typeof changing !== "boolean") return null;
    casts.push({ binary, changing });
  }
  return { question, casts, alternative: alternative || null };
}

export function decisionFingerprint(owner: string, input: DecisionInput): string {
  // Exclude alternate wording so editing that field cannot start a second checkout on the same cast.
  return createHash("sha256").update(JSON.stringify([owner, input.question, input.casts])).digest("hex");
}

export function validDecisionSignature(raw: string | Uint8Array, signature: string, secret: string): boolean {
  if (!secret || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac("sha256", secret).update(raw).digest(), Buffer.from(signature, "hex"));
}

export function exactDecisionProduct(raw: unknown, productId: string): boolean {
  const product = record(raw);
  return product.id === productId && product.price === DECISION_CENTS
    && product.currency === DECISION_CURRENCY && product.billing_type === "onetime";
}

export function parseDecisionEvent(raw: unknown, productId: string): DecisionEvent | null {
  const event = record(raw);
  const eventId = opaqueId(event.id, "evt_");
  if (!eventId) return null;
  const obj = record(event.object);
  if (event.eventType === "checkout.completed") {
    const meta = record(obj.metadata);
    const order = record(obj.order);
    const checkoutId = opaqueId(obj.id, "ch_");
    const providerOrderId = opaqueId(order.id, "ord_");
    const orderId = typeof meta.order_id === "string" && DECISION_UUID.test(meta.order_id) ? meta.order_id : null;
    const transactionId = opaqueId(order.transaction, "tran_") ?? opaqueId(record(order.transaction).id, "tran_");
    const base = order.sub_total ?? order.amount;
    const tax = order.tax_amount ?? 0;
    if (typeof tax !== "number" || !Number.isSafeInteger(tax) || tax < 0) return null;
    const gross = DECISION_CENTS + tax;
    if (!checkoutId || !providerOrderId || !transactionId || !orderId || obj.request_id !== orderId
      || meta.offer_id !== DECISION_OFFER || obj.mode !== "test" || obj.status !== "completed"
      || obj.subscription != null || (order.mode != null && order.mode !== "test")
      || order.product !== productId || !exactDecisionProduct(obj.product, productId)
      || base !== DECISION_CENTS || (order.amount !== DECISION_CENTS && order.amount !== gross)
      || order.amount_paid !== gross
      || (order.amount_due != null && order.amount_due !== gross)
      || (order.discount_amount != null && order.discount_amount !== 0) || order.discount != null
      || order.currency !== DECISION_CURRENCY || order.status !== "paid" || order.type !== "onetime") return null;
    return { type: "paid", eventId, orderId, checkoutId, providerOrderId,
      transactionId };
  }
  if (event.eventType === "refund.created" || event.eventType === "refund.completed") {
    const transaction = record(obj.transaction);
    const transactionId = opaqueId(transaction.id, "tran_");
    const refundCheckout = record(obj.checkout);
    const refundProduct = typeof refundCheckout.product === "string" ? refundCheckout.product : record(refundCheckout.product).id;
    if (!transactionId || (refundProduct != null && refundProduct !== productId) || obj.status !== "succeeded" || obj.refund_currency !== DECISION_CURRENCY
      || typeof obj.refund_amount !== "number" || !Number.isSafeInteger(obj.refund_amount)
      || obj.refund_amount <= 0 || obj.subscription != null
      || (obj.mode != null && obj.mode !== "test") || (transaction.mode != null && transaction.mode !== "test")) return null;
    return { type: "refund", eventId, transactionId, refundAmount: obj.refund_amount,
      signedOrderId: opaqueId(transaction.order, "ord_") ?? opaqueId(record(transaction.order).id, "ord_"),
      signedFullRefund: transaction.status === "refunded" };
  }
  return null;
}

export function fullDecisionRefund(raw: unknown, transactionId: string, refunded: number): { providerOrderId: string } | null {
  const tx = record(raw);
  const providerOrderId = opaqueId(tx.order, "ord_") ?? opaqueId(record(tx.order).id, "ord_");
  return providerOrderId && tx.id === transactionId && tx.mode === "test"
    && tx.type === "payment" && !tx.subscription && tx.currency === DECISION_CURRENCY
    && tx.amount === DECISION_CENTS && tx.status === "refunded"
    && typeof tx.amount_paid === "number" && Number.isSafeInteger(tx.amount_paid)
    && tx.amount_paid >= DECISION_CENTS
    && Math.max(refunded, typeof tx.refunded_amount === "number" ? tx.refunded_amount : 0) === tx.amount_paid
    ? { providerOrderId } : null;
}
