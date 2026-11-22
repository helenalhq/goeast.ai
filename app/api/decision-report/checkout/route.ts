import { randomUUID } from "node:crypto";
import { decisionFingerprint, decisionInput } from "@/lib/decision-core";
import { checkDecisionTestProduct, createDecisionTestCheckout, validTestCheckoutLink } from "@/lib/decision-provider";
import { decisionFault, decisionOwner, json, requestPayload, retryLater } from "@/lib/decision-store";
import { DECISION_OFFER } from "@/lib/decision-types";

const pendingError = () => json({ error: "This checkout is being verified. Check Decision reports before trying again." }, 409);

export async function POST(request: Request) {
  try {
    const access = await decisionOwner();
    if (access.response) return access.response;
    const { config, db, owner } = access;
    const input = decisionInput(await requestPayload(request));
    if (!input) return json({ error: "A career question and its original six cast lines are required." }, 400);
    const hash = decisionFingerprint(owner, input);
    const product = config.mode === "mock" ? "mock_decision_once" : config.productId;
    const previous = await db.previous(owner, hash, config.mode);
    if (previous.error) return retryLater();
    if (previous.data) {
      const row = previous.data;
      if (row.product_id !== product) return pendingError();
      if (row.status !== "pending") return json({ orderId: row.id });
      if (config.mode === "mock") return json({ checkoutUrl: "/account/decision-reports/" + row.id + "?mock=1" });
      return row.checkout_id && row.checkout_url && validTestCheckoutLink(row.checkout_url, row.checkout_id, product)
        ? json({ checkoutUrl: row.checkout_url }) : pendingError();
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
      const paidFlow = await createDecisionTestCheckout(config, id);
      const saved = await db.saveCheckout(id, owner, paidFlow.id, paidFlow.url);
      if (saved.error || !saved.data) return pendingError();
      checkoutUrl = paidFlow.url;
    }
    console.info(JSON.stringify({ event: "checkout_created", offer_id: DECISION_OFFER, env: config.mode, qa: true, order_id: id }));
    return json({ checkoutUrl });
  } catch {
    decisionFault("checkout_failed");
    return retryLater();
  }
}
