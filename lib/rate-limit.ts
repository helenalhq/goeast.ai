/**
 * In-memory rate limiter for the Oracle API
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Free tier: 1 request per 24 hours per IP + fingerprint
const FREE_TIER_LIMIT = 1;
const FREE_TIER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// Paid tier: 1 request per 30 seconds
const PAID_TIER_COOLDOWN_MS = 30 * 1000; // 30 seconds

// Maps for storing rate limit data
const freeLimitMap = new Map<string, RateLimitEntry>();
const paidCooldownMap = new Map<string, number>();

/**
 * Create a simple hash fingerprint from IP, User-Agent, and Accept-Language
 */
function createFingerprint(ip: string, userAgent: string, acceptLanguage: string): string {
  const data = `${ip}|${userAgent}|${acceptLanguage}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
}

/**
 * Check if a free tier user can make a request
 * @param ip - Client IP address
 * @param userAgent - User-Agent header
 * @param acceptLanguage - Accept-Language header
 * @returns Object with allowed status and remaining requests
 */
export function checkFreeLimit(
  ip: string,
  userAgent: string,
  acceptLanguage: string
): { allowed: boolean; remaining: number } {
  const key = createFingerprint(ip, userAgent, acceptLanguage);
  const now = Date.now();

  // Get or create entry
  const entry = freeLimitMap.get(key);

  // If no entry or expired, allow request
  if (!entry || entry.resetAt < now) {
    freeLimitMap.set(key, {
      count: 1,
      resetAt: now + FREE_TIER_WINDOW_MS,
    });
    return { allowed: true, remaining: 0 };
  }

  // Check if limit reached
  if (entry.count >= FREE_TIER_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  entry.count++;
  return { allowed: true, remaining: FREE_TIER_LIMIT - entry.count };
}

/**
 * Check if a paid tier user can make a request
 * @param subscriptionId - User's subscription ID
 * @returns true if allowed, false if on cooldown
 */
export function checkPaidRateLimit(subscriptionId: string): boolean {
  const now = Date.now();
  const lastRequest = paidCooldownMap.get(subscriptionId);

  // If no previous request or cooldown expired, allow
  if (!lastRequest || now - lastRequest >= PAID_TIER_COOLDOWN_MS) {
    paidCooldownMap.set(subscriptionId, now);
    return true;
  }

  // Still on cooldown
  return false;
}

/**
 * Clean up expired entries from both maps
 * Should be called periodically to prevent memory leaks
 */
export function cleanup(): void {
  const now = Date.now();

  // Clean up free tier entries
  for (const [key, entry] of freeLimitMap.entries()) {
    if (entry.resetAt < now) {
      freeLimitMap.delete(key);
    }
  }

  // Clean up paid tier entries older than 1 hour
  const paidCleanupThreshold = now - (60 * 60 * 1000);
  for (const [key, lastRequest] of paidCooldownMap.entries()) {
    if (lastRequest < paidCleanupThreshold) {
      paidCooldownMap.delete(key);
    }
  }
}

/**
 * Get current stats for monitoring/debugging
 */
export function getRateLimitStats(): {
  freeTierEntries: number;
  paidTierEntries: number;
} {
  return {
    freeTierEntries: freeLimitMap.size,
    paidTierEntries: paidCooldownMap.size,
  };
}
