import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { activateSubscription, cancelSubscription } from "@/lib/creem";

const CREEM_WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET || "";

function verifySignature(body: string, signature: string): boolean {
  if (!CREEM_WEBHOOK_SECRET) return false;
  const computed = crypto
    .createHmac("sha256", CREEM_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return computed === signature;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("creem-signature") || "";

  if (CREEM_WEBHOOK_SECRET && !verifySignature(body, signature)) {
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
    subscriptionId = obj.subscription?.id;
    customerId = obj.customer?.id;
    customerEmail = obj.customer?.email;
    metadataUserId = obj.metadata?.userId;
  } else {
    subscriptionId = obj.id;
    customerId = obj.customer?.id;
    customerEmail = obj.customer?.email;
    metadataUserId = obj.metadata?.userId;
  }

  if (!subscriptionId) {
    // Not a subscription event (e.g. one-time payment) — acknowledge and skip
    return NextResponse.json({ received: true });
  }

  expiresAt = new Date(Date.now() + 30 * 86_400_000);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  switch (eventType) {
    case "checkout.completed":
    case "subscription.active":
    case "subscription.paid": {
      await activateSubscription(
        supabase,
        subscriptionId,
        customerId,
        customerEmail,
        expiresAt,
        metadataUserId,
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
      break;
    }
    case "subscription.expired": {
      await cancelSubscription(supabase, subscriptionId, "expired");
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
