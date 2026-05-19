/**
 * Creem payment integration — Supabase-backed
 * https://docs.creem.io
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// Environment variables
const CREEM_API_KEY = process.env.CREEM_API_KEY || "";
const CREEM_WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET || "";

// Types
export type SubscriptionStatus =
  | "inactive"
  | "active"
  | "scheduled_cancel"
  | "cancelled"
  | "expired"
  | "past_due";

export interface Subscription {
  id: string;
  user_id: string;
  creem_subscription_id: string | null;
  creem_customer_id: string | null;
  customer_email: string | null;
  status: SubscriptionStatus;
  activated_at: string | null;
  expires_at: string | null;
}

export interface CreemWebhookEvent {
  id: string;
  event_type: string;
  data: {
    object?: {
      id?: string;
      current_period_end?: string;
      customer?: {
        id?: string;
        email?: string;
      };
    };
    subscription?: {
      id: string;
      status?: string;
      expires_at?: string;
    };
    customer?: {
      id: string;
      email?: string;
    };
    [key: string]: unknown;
  };
  created_at: string;
  signature?: string;
}

/**
 * Verify a webhook signature from Creem using HMAC-SHA256
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
): boolean {
  if (!CREEM_WEBHOOK_SECRET) {
    console.warn("CREEM_WEBHOOK_SECRET not set");
    return false;
  }
  const crypto = require("crypto");
  const computed = crypto
    .createHmac("sha256", CREEM_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return computed === signature;
}

/**
 * Check if API key is configured
 */
export function isConfigured(): boolean {
  return !!CREEM_API_KEY && !!CREEM_WEBHOOK_SECRET;
}

/**
 * Activate a subscription in Supabase, linking to user
 */
export async function activateSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
  customerId: string | undefined,
  customerEmail: string | undefined,
  expiresAt: Date,
  knownUserId?: string,
): Promise<void> {
  // Use the userId from checkout metadata if available (most reliable)
  let userId: string | null = knownUserId ?? null;

  // Fallback: find user by email in profiles
  if (!userId && customerEmail) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .maybeSingle();
    userId = profile?.id ?? null;
  }

  // Fallback: find user by email in auth.users
  if (!userId && customerEmail) {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("customer_email", customerEmail)
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }

  const result = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      creem_subscription_id: subscriptionId,
      creem_customer_id: customerId ?? null,
      customer_email: customerEmail ?? null,
      status: "active",
      activated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "creem_subscription_id" },
  );
  if (result.error) {
    console.error("[creem] upsert error:", result.error.message);
  }
}

/**
 * Cancel / expire a subscription in Supabase
 */
export async function cancelSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
  newStatus: "cancelled" | "expired" = "cancelled",
): Promise<void> {
  await supabase
    .from("subscriptions")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("creem_subscription_id", subscriptionId);
}

/**
 * Get a user's subscription by user ID
 */
export async function getSubscriptionByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<Subscription | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as Subscription | null;
}
