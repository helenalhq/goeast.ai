/**
 * In-memory rate limiter for the Oracle API
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Free tier: 3 requests per 24 hours per IP + fingerprint
const FREE_TIER_LIMIT = 3;
const FREE_TIER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// Paid tier: 10 requests per 24 hours per user
const PAID_TIER_LIMIT = 10;
const PAID_TIER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// Maps for storing rate limit data
const freeLimitMap = new Map<string, RateLimitEntry>();
const paidLimitMap = new Map<string, RateLimitEntry>();

function createFingerprint(ip: string, userAgent: string, acceptLanguage: string): string {
  const data = `${ip}|${userAgent}|${acceptLanguage}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString();
}

/**
 * Check if a free tier user can make a request
 */
export function checkFreeLimit(
  ip: string,
  userAgent: string,
  acceptLanguage: string,
): { allowed: boolean; remaining: number } {
  const key = createFingerprint(ip, userAgent, acceptLanguage);
  const now = Date.now();
  const entry = freeLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    freeLimitMap.set(key, { count: 1, resetAt: now + FREE_TIER_WINDOW_MS });
    return { allowed: true, remaining: FREE_TIER_LIMIT - 1 };
  }

  if (entry.count >= FREE_TIER_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: FREE_TIER_LIMIT - entry.count };
}

/**
 * Check if an authenticated user can make a request (daily limit)
 */
export function checkAuthUserRateLimit(
  userId: string,
): { allowed: boolean; remaining: number } {
  const key = `user:${userId}`;
  const now = Date.now();
  const entry = paidLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    paidLimitMap.set(key, { count: 1, resetAt: now + PAID_TIER_WINDOW_MS });
    return { allowed: true, remaining: PAID_TIER_LIMIT - 1 };
  }

  if (entry.count >= PAID_TIER_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: PAID_TIER_LIMIT - entry.count };
}

/**
 * Clean up expired entries to prevent memory leaks
 */
export function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of freeLimitMap.entries()) {
    if (entry.resetAt < now) freeLimitMap.delete(key);
  }
  for (const [key, entry] of paidLimitMap.entries()) {
    if (entry.resetAt < now) paidLimitMap.delete(key);
  }
}

export function getRateLimitStats(): {
  freeTierEntries: number;
  paidTierEntries: number;
} {
  return {
    freeTierEntries: freeLimitMap.size,
    paidTierEntries: paidLimitMap.size,
  };
}
