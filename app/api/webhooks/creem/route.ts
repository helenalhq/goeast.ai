import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  activateSubscription,
  cancelSubscription,
} from "@/lib/creem";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("creem-signature") || "";

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event_type;
  const subscriptionId = event.data?.object?.id;
  const periodEnd = event.data?.object?.current_period_end;

  if (!subscriptionId) {
    return NextResponse.json(
      { error: "Missing subscription ID" },
      { status: 400 }
    );
  }

  switch (eventType) {
    case "subscription.created":
    case "subscription.renewed": {
      const expiresAt = periodEnd
        ? new Date(periodEnd)
        : new Date(Date.now() + 30 * 86_400_000);
      activateSubscription(subscriptionId, expiresAt);
      break;
    }
    case "subscription.cancelled":
    case "subscription.expired": {
      cancelSubscription(subscriptionId);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
