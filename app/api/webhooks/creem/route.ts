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

function retryWebhookDelivery() {
  // Creem treats a 2xx response as delivered. No durable retry job is
  // persisted here, so transient persistence errors must not be acknowledged.
  return NextResponse.json({ received: false }, { status: 503 });
}

function parsePeriodEnd(values: unknown[]): Date | undefined {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    if (typeof value === "string" && value.trim() === "") continue;
    // Creem returns ISO subscription dates; transaction dates can be Unix ms.
    const date = new Date(typeof value === "number" && Math.abs(value) < 1e12 ? value * 1000 : value);
    if (Number.isFinite(date.getTime()) && date.getTime() > 0) return date;
  }
}

function periodCandidates(data?: Record<string, unknown>) {
  return [data?.current_period_end_date, data?.current_period_end, data?.expires_at, data?.expires_date];
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

  if (eventType === "checkout.completed") {
    subscriptionId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id;
    customerId = obj.customer?.id ?? obj.customer_id;
    customerEmail = obj.customer?.email ?? obj.customer_email;
    metadataUserId = obj.metadata?.userId ?? obj.subscription?.metadata?.userId;
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  switch (eventType) {
    case "checkout.completed":
    case "subscription.active":
    case "subscription.paid": {
      const checkout = eventType === "checkout.completed";
      const transaction = checkout ? obj.order?.transaction : obj.last_transaction?.id ?? obj.last_transaction_id;
      const env = obj.mode === "test" || obj.mode === "sandbox" || obj.mode === "local"
        ? "test"
        : obj.mode === "live" || obj.mode === "production" ? "production" : "unknown";
      const fields = {
        offer_id: "pro_monthly",
        env,
        event_type: eventType,
        subscription_id: subscriptionId,
        transaction_id: typeof transaction === "string" ? transaction : undefined,
        event_id: typeof event.id === "string" ? event.id : undefined,
      };
      const firstPayment = checkout && obj.order?.status === "paid"
        && obj.order?.type === "recurring" && obj.order?.amount_paid > 0
        && typeof transaction === "string" && transaction.length > 0;
      const kind = firstPayment ? "first" : "unclassified";
      // Creem sends subscription.paid for both the initial charge and renewals.
      // It is a reconciliation signal, not a second first/renewal conversion.
      if (firstPayment) console.log(JSON.stringify({ event: "payment_confirmed", ...fields, kind }));
      if (eventType === "subscription.paid") console.log(JSON.stringify({ event: "subscription_payment_observed", ...fields, kind }));
      const expiresAt = parsePeriodEnd([
        ...(checkout ? periodCandidates(obj.subscription) : []),
        ...periodCandidates(obj),
        ...(eventType === "subscription.paid" && obj.last_transaction?.subscription === subscriptionId
          ? [obj.last_transaction.period_end] : []),
      ]);
      try {
        const result = await activateSubscription(
          supabase,
          subscriptionId,
          customerId,
          customerEmail,
          expiresAt,
          metadataUserId,
        );
        if (result.ok && !result.skipped) {
          console.log(
            JSON.stringify({ event: "delivery_succeeded", ...fields, kind }),
          );
        } else if (result.ok && result.skipped) {
          // No write was needed (existing grant or terminal state). Do not
          // count a second delivery or misrepresent it as a failure.
          console.log(
            JSON.stringify({ event: "delivery_skipped", ...fields, kind, reason: result.reason }),
          );
        } else {
          // DB write failed: payment confirmed but entitlement NOT delivered.
          console.log(
            JSON.stringify({ event: "delivery_failed", ...fields, kind, reason: result.reason }),
          );
          return retryWebhookDelivery();
        }
      } catch (err) {
        console.error("Webhook activation error:", err);
        console.log(
          JSON.stringify({ event: "delivery_failed", ...fields, kind, reason: "activation_error" }),
        );
        return retryWebhookDelivery();
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
    case "subscription.scheduled_cancel":
    case "subscription.canceled":
    case "subscription.expired": {
      try {
        if (eventType === "subscription.scheduled_cancel") {
          const { error } = await supabase
            .from("subscriptions")
            .update({ status: "scheduled_cancel", updated_at: new Date().toISOString() })
            .eq("creem_subscription_id", subscriptionId);
          if (error) throw error;
        } else {
          const status = eventType === "subscription.canceled" ? "cancelled" : "expired";
          await cancelSubscription(supabase, subscriptionId, status);
          console.log(
            JSON.stringify({ event: "subscription_cancelled", subscription_id: subscriptionId }),
          );
        }
      } catch {
        console.error(JSON.stringify({ event: "subscription_status_update_failed", event_type: eventType, subscription_id: subscriptionId }));
        return retryWebhookDelivery();
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
