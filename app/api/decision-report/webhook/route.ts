import { decisionConfig } from "@/lib/decision-config";
import { fullDecisionRefund, parseDecisionEvent, record, validDecisionSignature } from "@/lib/decision-core";
import { fetchDecisionRefundTransaction } from "@/lib/decision-provider";
import { decisionDb, decisionFault, json, linkedDecisionTestRefund, retryLater, unavailable } from "@/lib/decision-store";
import { DECISION_OFFER } from "@/lib/decision-types";

const MAX_CALLBACK_BYTES = 64 * 1024;

async function boundedBody(body: ReadableStream<Uint8Array> | null): Promise<Buffer | null> {
  if (!body) return Buffer.alloc(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, size);
      size += value.byteLength;
      if (size > MAX_CALLBACK_BYTES) {
        void reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const config = decisionConfig();
  if (config?.mode !== "test" || config.storage !== "scoped-postgres") return unavailable();
  const url = new URL(request.url);
  if (url.origin !== config.publicOrigin || url.pathname !== "/api/decision-report/webhook" || url.search) {
    return unavailable();
  }
  const signature = request.headers.get("creem-signature") ?? "";
  if (!/^[0-9a-f]{64}$/i.test(signature)) return json({ error: "Invalid signature" }, 401);
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_CALLBACK_BYTES)) {
    return json({ error: "Payload too large." }, 413);
  }
  let raw: Buffer | null;
  try { raw = await boundedBody(request.body); }
  catch { return json({ error: "Invalid payload." }, 400); }
  if (raw === null) return json({ error: "Payload too large." }, 413);
  if (!validDecisionSignature(raw, signature, config.webhookSecret)) {
    return json({ error: "Invalid signature" }, 401);
  }
  let payload: unknown;
  try { payload = JSON.parse(new TextDecoder("utf-8", { fatal:true }).decode(raw)); }
  catch { return json({ error: "Invalid payload." }, 400); }
  const ignored = () => json({ received: true, ignored: true });
  const type = record(payload).eventType;
  if (type !== "checkout.completed" && type !== "refund.created") return ignored();
  const event = parseDecisionEvent(payload, config.productId);
  if (!event) return ignored();
  try {
    let stage: string | null = null;
    if (event.type === "paid") {
      const applied = await decisionDb(config).payment({ p_id: event.orderId, p_mode: "test",
        p_product: config.productId, p_checkout: event.checkoutId, p_order: event.providerOrderId, p_tx: event.transactionId });
      if (applied.error) return retryLater();
      if (applied.data === "invalid") {
        decisionFault("mismatched_order");
        return ignored();
      }
      if (applied.data === "paid" || applied.data === "refund_precedes_payment") stage = "payment_confirmed";
      if (applied.data === "refund_precedes_payment") {
        console.info(JSON.stringify({ event: "refund_confirmed", offer_id: DECISION_OFFER, env: "test", qa: true,
          order_id: event.orderId, provider_order_id: event.providerOrderId, transaction_id: event.transactionId }));
      }
    } else {
      // An authentic test callback identifies the transaction. Re-read exact
      // refund totals and the owning provider order from its authenticated API.
      const tx = await fetchDecisionRefundTransaction(config, event.transactionId);
      const refund = fullDecisionRefund(tx, event.transactionId, event.refundAmount);
      const checkout = record(record(record(payload).object).checkout);
      const checkoutProduct = typeof checkout.product === "string" ? checkout.product : record(checkout.product).id;
      const explicitlyP1 = checkoutProduct === config.productId;
      if (!refund) return explicitlyP1 && event.signedFullRefund ? retryLater() : ignored();
      if (event.signedOrderId && event.signedOrderId !== refund.providerOrderId) {
        decisionFault("mismatched_refund_order");
        return ignored();
      }
      const result = await linkedDecisionTestRefund({ ...config, storage: config.storage }, refund.providerOrderId, event.transactionId);
      if (result === "unlinked") return explicitlyP1 ? retryLater() : ignored();
      if (result === "invalid") return ignored();
      if (result !== "refunded" && result !== "duplicate") return retryLater();
      if (result === "refunded") stage = "refund_confirmed";
    }
    if (stage) console.info(JSON.stringify({ event: stage, offer_id: DECISION_OFFER, env: "test", qa: true,
      event_id: event.eventId, transaction_id: event.transactionId }));
    return json({ received: true });
  } catch {
    decisionFault("webhook_processing_failed");
    return retryLater();
  }
}
