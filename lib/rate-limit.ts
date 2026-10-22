/**
 * Database-backed rate limiter for AI API endpoints.
 *
 * Free tier: 3 requests per UTC day per userId
 * Pro tier: 10 requests per UTC day per userId
 *
 * Uses PostgreSQL function `increment_usage` for atomic increment + limit check
 * with row-level locking to prevent race conditions in serverless environments.
 *
 * Window resets at UTC midnight (00:00:00+00).
 * On DB failure: deny by default (fail closed) with error message.
 * On concurrent requests: serialized by SELECT FOR UPDATE, only one succeeds per limit.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const FREE_TIER_LIMIT = 3;
export const PRO_TIER_LIMIT = 10;

/** Get the UTC day boundary for a given timestamp (used as window key) */
function getUtcWindowStart(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10) + "T00:00:00+00";
}

interface UsageCheckResult {
  allowed: boolean;
  remaining: number;
  currentCount: number;
  error?: string;
}

/**
 * Atomically check and increment daily usage for a user.
 * Calls PostgreSQL function `increment_usage` which:
 *   1. Locks the row (SELECT FOR UPDATE)
 *   2. Increments count
 *   3. Checks against limit
 *   4. Rolls back if over limit
 *   5. Returns JSON with allowed/remaining/currentCount
 */
export async function checkAndIncrementUsage(
  supabase: SupabaseClient,
  userId: string,
  limit: number,
): Promise<UsageCheckResult> {
  const windowStart = getUtcWindowStart();

  const { data, error } = await supabase.rpc("increment_usage", {
    p_user_id: userId,
    p_window_start: windowStart,
    p_limit: limit,
  });

  if (error) {
    console.error("[rate-limit] RPC error:", error.message);
    return { allowed: false, remaining: 0, currentCount: 0, error: error.message };
  }

  return {
    allowed: data?.allowed ?? false,
    remaining: data?.remaining ?? 0,
    currentCount: data?.currentCount ?? 0,
  };
}

/**
 * Check current usage without incrementing (for pre-flight checks).
 * Not atomic — use checkAndIncrementUsage for actual limit enforcement.
 */
export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  limit: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = getUtcWindowStart();

  const { data, error } = await supabase
    .from("usage_log")
    .select("count")
    .eq("user_id", userId)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (error) {
    console.error("[rate-limit] check error:", error.message);
    return { allowed: false, remaining: 0 }; // fail closed
  }

  const currentCount = data?.count ?? 0;
  return {
    allowed: currentCount < limit,
    remaining: Math.max(0, limit - currentCount),
  };
}
