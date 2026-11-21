import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { activateSubscription, cancelSubscription } from "@/lib/creem";

function verifySignature(secret: string, body: string, signature: string): boolean {
  const computed = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  // timing-safe compare (length guard first — timingSafeEqual throws on mismatch)
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  // Fail closed: no signing secret configured → never process events.
  const secret = process.env.CREEM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("creem webhook: CREEM_WEBHOOK_SECRET not configured — rejecting event");
    return new Response("Webhook not configured", { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("creem-signature") || "";

  if (!verifySignature(secret, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Creem uses eventType (camelCase), object at top level (no data wrapper)
  const eventType = event.eventType;
  const obj = event.object;

  if (!eventType || !obj) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Extract fields based on event type
  // checkout.completed: obj is the checkout, subscription nested inside
  // subscription.*: obj is the subscription itself
  let subscriptionId: string | undefined;
  let customerId: string | undefined;
  let customerEmail: string | undefined;
  let metadataUserId: string | undefined;
  let expiresAt: Date;

  if (eventType === "checkout.completed") {
    subscriptionId = obj.subscription?.id ?? obj.id;
    customerId = obj.customer?.id ?? obj.customer_id;
    customerEmail = obj.customer?.email ?? obj.customer_email;
    metadataUserId = obj.metadata?.userId;
  } else {
    subscriptionId = obj.id;
    customerId = obj.customer?.id ?? obj.customer_id;
    customerEmail = obj.customer?.email ?? obj.customer_email;
    metadataUserId = obj.metadata?.userId;
  }

  if (!subscriptionId) {
    // Not a subscription event (e.g. one-time payment) — acknowledge and skip
    return NextResponse.json({ received: true });
  }

  // Real expiry from the event when available; +30d fallback keeps renewals safe.
  // Candidate names cover Creem's schema variants; confirm exact field during test-mode verification.
  const expiryCandidates = [
    obj.current_period_end_date,
    obj.current_period_end,
    obj.expires_at,
    obj.expires_date,
  ];
  expiresAt = new Date(Date.now() + 30 * 86_400_000);
  for (const candidate of expiryCandidates) {
    if (candidate === null || candidate === undefined) continue;
    const d = new Date(typeof candidate === "number" ? candidate * 1000 : String(candidate));
    if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
      expiresAt = d;
      break;
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  switch (eventType) {
    case "checkout.completed":
    case "subscription.active":
    case "subscription.paid": {
      // Funnel (server-side, PII-free): payment confirmed by Creem event;
      // first payment vs renewal inferred from event type — checkout.completed /
      // subscription.active = first, subscription.paid on an existing row = renewal.
      // See docs/funnel-contract.md for the counting caveats.
      const kind = eventType === "subscription.paid" ? "renewal" : "first";
      try {
        const result = await activateSubscription(
          supabase,
          subscriptionId,
          customerId,
          customerEmail,
          expiresAt,
          metadataUserId,
        );
        // payment_confirmed records Creem's payment event regardless of our
        // DB write outcome — payment happened; delivery is a separate matter.
        console.log(
          JSON.stringify({ event: "payment_confirmed", offer_id: "pro_monthly", kind, subscription_id: subscriptionId }),
        );
        if (result.ok && !result.skipped) {
          console.log(
            JSON.stringify({ event: "delivery_succeeded", offer_id: "pro_monthly", kind, subscription_id: subscriptionId }),
          );
        } else if (result.ok && result.skipped) {
          // Terminal-state guard: no write happened (late retry after cancel)
          // — NOT a delivery, and NOT a failure. Log distinctly so "paid but
          // not delivered" analysis can exclude guard no-ops.
          console.log(
            JSON.stringify({ event: "delivery_skipped", offer_id: "pro_monthly", subscription_id: subscriptionId, reason: result.reason }),
          );
        } else {
          // DB write failed: payment confirmed but entitlement NOT delivered.
          console.log(
            JSON.stringify({ event: "delivery_failed", offer_id: "pro_monthly", subscription_id: subscriptionId, reason: result.reason }),
          );
        }
      } catch (err) {
        console.error("Webhook activation error:", err);
        console.log(
          JSON.stringify({ event: "delivery_failed", offer_id: "pro_monthly", subscription_id: subscriptionId, reason: "activation_error" }),
        );
      }
      break;
    }
    case "refund.completed":
    case "refund.created": {
      // Refund events may arrive without a subscription object — log the
      // confirmation; entitlement revocation (if any) is handled by the
      // subscription.canceled/expired events or manual review.
      console.log(
        JSON.stringify({ event: "refund_confirmed", offer_id: "pro_monthly", object_id: obj.id ?? subscriptionId ?? null }),
      );
      break;
    }
    case "subscription.scheduled_cancel": {
      await supabase
        .from("subscriptions")
        .update({ status: "scheduled_cancel", updated_at: new Date().toISOString() })
        .eq("creem_subscription_id", subscriptionId);
      break;
    }
    case "subscription.canceled": {
      await cancelSubscription(supabase, subscriptionId, "cancelled");
      console.log(
        JSON.stringify({ event: "subscription_cancelled", subscription_id: subscriptionId }),
      );
      break;
    }
    case "subscription.expired": {
      await cancelSubscription(supabase, subscriptionId, "expired");
      console.log(
        JSON.stringify({ event: "subscription_cancelled", subscription_id: subscriptionId }),
      );
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
