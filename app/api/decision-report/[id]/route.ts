import { liveOrder } from "@/lib/decision-live-api";
import { randomUUID } from "node:crypto";
import { DECISION_UUID } from "@/lib/decision-config";
import { decisionInput, record } from "@/lib/decision-core";
import { generateDecisionReport } from "@/lib/decision-generation";
import { decisionDetail, decisionFault, decisionOwner, json, ownedOrder, requestPayload, retryLater, unavailable } from "@/lib/decision-store";
import { DECISION_OFFER } from "@/lib/decision-types";

type Context = { params: Promise<{ id: string }> };
function activity(event: string, mode: "test" | "mock", id: string) {
  console.info(JSON.stringify({ event, offer_id: DECISION_OFFER, env: mode, qa: true, order_id: id }));
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (process.env.VERCEL_ENV === "production") return liveOrder(_request,id,false);
    if (!DECISION_UUID.test(id)) return unavailable();
    const access = await decisionOwner();
    if (access.response) return access.response;
    const row = await ownedOrder(access.db, access.owner, access.config.mode, id);
    return row ? json(decisionDetail(row)) : unavailable();
  } catch {
    decisionFault("detail_unavailable");
    return retryLater();
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (process.env.VERCEL_ENV === "production") return liveOrder(request,id,true);
    if (!DECISION_UUID.test(id)) return unavailable();
    const access = await decisionOwner();
    if (access.response) return access.response;
    const { config, owner, db } = access;
    const payload = record(await requestPayload(request));
    const row = await ownedOrder(db, owner, config.mode, id);
    if (!row) return unavailable();

    if (payload.action === "mock-pay" || payload.action === "mock-refund") {
      if (config.mode !== "mock" || row.product_id !== "mock_decision_once") return unavailable();
      const transaction = "mock_transaction_" + id;
      const order = "mock_order_" + id;
      if (payload.action === "mock-pay") {
        const result = await db.payment({ p_id: id, p_mode: "mock", p_product: row.product_id,
          p_checkout: "mock_ch_" + id, p_order: order, p_tx: transaction });
        if (result.error) return retryLater();
        if (result.data === "paid") activity("payment_confirmed", "mock", id);
      } else {
        if (row.status === "pending") return json({ error: "This mock checkout has not been paid." }, 409);
        const result = await db.refund({ p_mode: "mock", p_order: order, p_tx: transaction });
        if (result.error) return retryLater();
        if (result.data === "refunded") activity("refund_confirmed", "mock", id);
      }
    } else if (payload.action === "note") {
      if (typeof payload.note !== "string" || payload.note.length > 500) return json({ error: "Use at most 500 characters." }, 400);
      if (row.status !== "delivered") return json({ error: "A delivered report is required." }, 409);
      const saved = await db.saveNote(id, owner, config.mode, payload.note.trim() || null);
      if (saved.error) return retryLater();
    } else if (payload.action === "generate") {
      if (row.status === "pending" || row.status === "refunded") return json({ error: "A paid order is required." }, 409);
      if (row.status === "delivered") return json(decisionDetail(row));
      const token = randomUUID();
      const leased = await db.acquire({ p_id: id, p_owner: owner, p_token: token });
      if (leased.error) return retryLater();
      if (leased.data) {
        try {
          const input = decisionInput(row.capture);
          if (!input) throw new Error("Invalid stored cast");
          const report = await generateDecisionReport(input, config.mode);
          const saved = await db.finish({ p_id: id, p_owner: owner, p_token: token, p_report: report });
          if (saved.error) throw new Error("Generation write failed");
          if (saved.data) activity("delivery_succeeded", config.mode, id);
        } catch {
          // On interruption before this write the bounded lease also allows
          // the same order to be retried; a stale process cannot finish it.
          await db.finish({ p_id: id, p_owner: owner, p_token: token, p_report: null });
          activity("delivery_failed", config.mode, id);
          return retryLater();
        }
      }
    } else {
      return json({ error: "Unsupported report action." }, 400);
    }
    const current = await ownedOrder(db, owner, config.mode, id);
    return current ? json(decisionDetail(current)) : unavailable();
  } catch {
    decisionFault("report_action_failed");
    return retryLater();
  }
}
