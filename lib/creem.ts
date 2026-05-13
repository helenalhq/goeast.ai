/**
 * Creem payment integration helpers
 * https://docs.creem.io
 */

// Environment variables
const CREEM_API_KEY = process.env.CREEM_API_KEY || '';
const CREEM_WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET || '';

// Types
export type SubscriptionStatus = "active" | "cancelled" | "expired";

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  expiresAt: Date;
  activatedAt: Date;
}

export interface CreemWebhookEvent {
  id: string;
  type: string;
  data: {
    subscription?: {
      id: string;
      status?: SubscriptionStatus;
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

// In-memory subscription store (MVP - no database)
const subscriptions = new Map<string, Subscription>();

/**
 * Create a Creem checkout URL for a given price ID
 * @param priceId - The Creem price ID
 * @param successUrl - URL to redirect to after successful payment
 * @returns The checkout URL
 */
export function createCheckoutUrl(priceId: string, successUrl: string): string {
  const baseUrl = 'https://checkout.creem.io';
  const params = new URLSearchParams({
    price_id: priceId,
    success_url: successUrl,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout/cancel`,
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Verify a webhook signature from Creem
 * MVP version: simple secret comparison
 * @param body - The raw webhook body as string
 * @param signature - The signature from the X-Creem-Signature header
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  // MVP: Simple secret comparison
  // In production, you should use HMAC SHA256 verification
  // as documented in https://docs.creem.io/webhooks
  if (!CREEM_WEBHOOK_SECRET) {
    console.warn('CREEM_WEBHOOK_SECRET not set');
    return false;
  }

  // Basic check: signature should contain the secret
  // This is a simplified MVP implementation
  return signature.includes(CREEM_WEBHOOK_SECRET);
}

/**
 * Activate a subscription in the store
 * @param subscriptionId - The subscription ID
 * @param expiresAt - When the subscription expires
 */
export function activateSubscription(subscriptionId: string, expiresAt: Date): void {
  const now = new Date();

  subscriptions.set(subscriptionId, {
    id: subscriptionId,
    status: 'active',
    expiresAt,
    activatedAt: now,
  });
}

/**
 * Cancel a subscription in the store
 * @param subscriptionId - The subscription ID to cancel
 */
export function cancelSubscription(subscriptionId: string): void {
  const subscription = subscriptions.get(subscriptionId);

  if (subscription) {
    subscription.status = 'cancelled';
    subscriptions.set(subscriptionId, subscription);
  }
}

/**
 * Get the status of a subscription
 * @param subscriptionId - The subscription ID
 * @returns The subscription status or null if not found
 */
export function getSubscriptionStatus(subscriptionId: string): SubscriptionStatus | null {
  const subscription = subscriptions.get(subscriptionId);

  if (!subscription) {
    return null;
  }

  // Check if subscription has expired
  if (subscription.status === 'active' && subscription.expiresAt < new Date()) {
    subscription.status = 'expired';
    subscriptions.set(subscriptionId, subscription);
  }

  return subscription.status;
}

/**
 * Get all subscriptions from the store
 * @returns Map of subscription ID to Subscription
 */
export function getAllSubscriptions(): Map<string, Subscription> {
  // Update expired subscriptions before returning
  const now = new Date();

  for (const [id, subscription] of subscriptions.entries()) {
    if (subscription.status === 'active' && subscription.expiresAt < now) {
      subscription.status = 'expired';
      subscriptions.set(id, subscription);
    }
  }

  return new Map(subscriptions);
}

/**
 * Get a single subscription by ID
 * @param subscriptionId - The subscription ID
 * @returns The subscription or null if not found
 */
export function getSubscription(subscriptionId: string): Subscription | null {
  const subscription = subscriptions.get(subscriptionId);

  if (!subscription) {
    return null;
  }

  // Update status if expired
  if (subscription.status === 'active' && subscription.expiresAt < new Date()) {
    subscription.status = 'expired';
    subscriptions.set(subscriptionId, subscription);
  }

  return subscription;
}

/**
 * Clear all subscriptions (useful for testing)
 */
export function clearAllSubscriptions(): void {
  subscriptions.clear();
}

/**
 * Check if API key is configured
 * @returns true if CREEM_API_KEY is set
 */
export function isConfigured(): boolean {
  return !!CREEM_API_KEY && !!CREEM_WEBHOOK_SECRET;
}
