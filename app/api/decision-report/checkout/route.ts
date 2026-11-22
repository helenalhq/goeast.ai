import { DECISION_UUID } from "@/lib/decision-config";
import { liveCheckout } from "@/lib/decision-live-api";
import { randomUUID } from "node:crypto";
import { decisionFingerprint, decisionInput } from "@/lib/decision-core";
import { checkDecisionTestProduct, createDecisionTestCheckout, DecisionTestProviderError, validTestCheckoutLink } from "@/lib/decision-provider";
import { claimCheckoutRecovery, decisionFault, decisionOwner, json, requestPayload, retryLater, saveRecoveredCheckout } from "@/lib/decision-store";
import { DECISION_OFFER } from "@/lib/decision-types";

const pendingError = () => json({ error: "This checkout is being verified. Check Decision reports before trying again." }, 409);

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") return liveCheckout(request);
  try {
    const access = await decisionOwner();
    if (access.response) return access.response;
    const { config, db, owner } = access;
    const input = decisionInput(await requestPayload(request));
    if (!input) return json({ error: "A career question and its original six cast lines are required." }, 400);
    const hash = decisionFingerprint(owner, input);
    const product = config.mode === "mock" ? "mock_decision_once" : config.productId;
    const recovery = config.mode === "test" && process.env.DECISION_REPORT_RECOVERY_ENABLED === "true";
    const orderPin = process.env.DECISION_REPORT_RECOVERY_ORDER_ID ?? "";
    const revisionPin = process.env.DECISION_REPORT_RECOVERY_XMIN ?? "";
    if (recovery) {
      const url = new URL(request.url);
      if (config.storage !== "scoped-postgres" || !DECISION_UUID.test(orderPin) || orderPin.toLowerCase() !== orderPin
          || !/^[1-9]\d{0,9}$/.test(revisionPin) || Number(revisionPin) < 3 || Number(revisionPin) > 4_294_967_295
          || url.origin !== config.publicOrigin || url.pathname !== "/api/decision-report/checkout"
          || url.search || request.headers.get("origin") !== config.publicOrigin) return pendingError();
    }
    const previous = await db.previous(owner, hash, config.mode);
    if (previous.error) return retryLater();
    if (recovery && previous.data?.id !== orderPin) return pendingError();
    if (previous.data) {
      const row = previous.data;
      if (row.product_id !== product) return pendingError();
      if (row.status !== "pending") return json({ orderId: row.id });
      if (config.mode === "mock") return json({ checkoutUrl: "/account/decision-reports/" + row.id + "?mock=1" });
      if (row.checkout_id && row.checkout_url && validTestCheckoutLink(row.checkout_url, row.checkout_id, product)) {
        return json({ checkoutUrl: row.checkout_url });
      }
      if (!recovery || row.checkout_id !== null || row.checkout_url !== null || config.storage !== "scoped-postgres") {
        return pendingError();
      }
      const scoped = { ...config, storage: config.storage };
      const pin = { orderId: orderPin, castHash: hash, revision: revisionPin };
      const revision = await claimCheckoutRecovery(scoped, pin);
      if (!revision) return pendingError();

      // The exact database revision was consumed before this single provider
      // attempt. A timeout or crash never opens another attempt.
      try {
        const original = await createDecisionTestCheckout(config, orderPin, true);
        if (!await saveRecoveredCheckout(scoped, { ...pin, revision }, original)) return pendingError();
        console.info(JSON.stringify({ event: "checkout_recovered", offer_id: DECISION_OFFER, env: "test", qa: true }));
        return json({ checkoutUrl: original.url });
      } catch (error) {
        decisionFault(JSON.stringify({
          event: "test_checkout_recovery_failed",
          ...(error instanceof DecisionTestProviderError ? error.diagnostic : { reason: "unknown" }),
        }));
        return retryLater();
      }
    }
    if (config.mode === "test" && !await checkDecisionTestProduct(config)) {
      decisionFault("unexpected_test_product_terms");
      return retryLater();
    }
    const id = randomUUID();
    const claim = await db.claim({
      id, owner_id: owner, cast_hash: hash, capture: input, mode: config.mode, product_id: product,
      checkout_id: config.mode === "mock" ? "mock_ch_" + id : null,
    });
    if (claim.error) return claim.error.code === "23505" ? pendingError() : retryLater();
    let checkoutUrl;
    if (config.mode === "mock") {
      checkoutUrl = "/account/decision-reports/" + id + "?mock=1";
    } else {
      // No fresh provider session is minted after an ambiguous response: the
      // durable pending claim locks the cast until a QA operator reconciles it.
      let paidFlow;
      try {
        paidFlow = await createDecisionTestCheckout(config, id);
      } catch (error) {
        decisionFault(JSON.stringify({
          event: "test_checkout_failed",
          ...(error instanceof DecisionTestProviderError ? error.diagnostic : { stage: "provider", reason: "unexpected" }),
        }));
        return retryLater();
      }
      try {
        const saved = await db.saveCheckout(id, owner, paidFlow.id, paidFlow.url);
        if (saved.error || !saved.data) {
          decisionFault(JSON.stringify({
            event: "test_checkout_failed", stage: "save", reason: saved.error ? "write_error" : "no_matching_row",
          }));
          return pendingError();
        }
      } catch {
        decisionFault(JSON.stringify({ event: "test_checkout_failed", stage: "save", reason: "write_error" }));
        return retryLater();
      }
      checkoutUrl = paidFlow.url;
    }
    console.info(JSON.stringify({ event: "checkout_created", offer_id: DECISION_OFFER, env: config.mode, qa: true, order_id: id }));
    return json({ checkoutUrl });
  } catch {
    decisionFault("checkout_failed");
    return retryLater();
  }
}
