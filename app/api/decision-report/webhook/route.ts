import { decisionConfig } from "@/lib/decision-config";
import { fullDecisionRefund, parseDecisionEvent, validDecisionSignature } from "@/lib/decision-core";
import { fetchDecisionRefundTransaction } from "@/lib/decision-provider";
import { decisionDb, decisionFault, json, retryLater, unavailable } from "@/lib/decision-store";
import { DECISION_OFFER } from "@/lib/decision-types";

export async function POST(request: Request) {
  const config = decisionConfig();
  if (config?.mode !== "test") return unavailable();
  const body = await request.text();
  if (!validDecisionSignature(body, request.headers.get("creem-signature") ?? "", config.webhookSecret)) {
    return json({ error: "Invalid signature" }, 401);
  }
  let result;
  try { result = parseDecisionEvent(JSON.parse(body), config.productId); }
  catch { return json({ error: "Invalid payload." }, 400); }
  if (!result) return json({ received: true, ignored: true });
  const event = result;
  try {
    const db = decisionDb(config);
    let stage: string | null = null;
    if (event.type === "paid") {
      const applied = await db.payment({ p_id: event.orderId, p_mode: "test",
        p_product: config.productId, p_checkout: event.checkoutId, p_order: event.providerOrderId, p_tx: event.transactionId });
      if (applied.error) return retryLater();
      if (applied.data === "invalid") {
        decisionFault("mismatched_order");
        return json({ received: true, ignored: true });
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
      if (!refund) return event.signedFullRefund ? retryLater() : json({ received: true, ignored: true });
      if (event.signedOrderId && event.signedOrderId !== refund.providerOrderId) {
        decisionFault("mismatched_refund_order");
        return json({ received: true, ignored: true });
      }
      const applied = await db.refund({
        p_mode: "test", p_order: refund.providerOrderId, p_tx: event.transactionId,
      });
      if (applied.error) return retryLater();
      // Unlinked tombstones are not analytics: the same amount may belong to
      // another TEST product. A later matching P1 checkout emits the refund.
      if (applied.data === "refunded") stage = "refund_confirmed";
    }
    if (stage) console.info(JSON.stringify({ event: stage, offer_id: DECISION_OFFER, env: "test", qa: true,
      event_id: event.eventId, transaction_id: event.transactionId }));
    return json({ received: true });
  } catch {
    decisionFault("webhook_processing_failed");
    return retryLater();
  }
}
