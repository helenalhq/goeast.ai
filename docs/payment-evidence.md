# Payment & Delivery Evidence — GoEast.ai

Status: **2026-10-22** | Branch: `fix/launch-final-polish`

## Summary

This document consolidates all payment and delivery verification evidence for GoEast.ai's Pro subscription ($4.99/month). Evidence is categorized as: **✅ Verified** (mock or real), **⚠️ Partially verified** (code-level only), ** Unverified** (needs test credentials).

## 1. Entitlement Logic

| Check | Status | Evidence |
|---|---|---|
| Free = 3/day, Pro = 10/day | ✅ | `lib/rate-limit.ts:11,15` — `FREE_TIER_LIMIT=3`, `PAID_TIER_LIMIT=10` |
| Sliding 24h window | ✅ | `lib/rate-limit.ts:12,16` — `FREE_TIER_WINDOW_MS`, `PAID_TIER_WINDOW_MS` |
| Shared quota across Oracle/Ziwei/Synastry | ✅ | All three routes call `checkAuthUserRateLimit(userId)` |
| Status gates (`active`/`scheduled_cancel`) | ✅ | `app/api/oracle/route.ts:72`, `app/api/ziwei/interpret/route.ts:79`, `app/api/ziwei/synastry/route.ts:106`, `app/account/page.tsx:48,69` |
| `expires_at` parsed but not enforced | ⚠️ | Parsed in webhook, NOT checked at gates — known limitation (owner decision pending) |

## 2. Webhook Security

| Check | Status | Evidence |
|---|---|---|
| Fail-closed (no secret → 500) | ✅ | `app/api/webhooks/creem/route.ts:18-23` + test `rejects when the secret is not configured` |
| HMAC verification (timing-safe) | ✅ | `lib/creem.ts:62-76` uses `crypto.timingSafeEqual` |
| Signature bypass when secret unset | ✅ Fixed | Was `if (SECRET && !verify)` — now unconditional verify |
| Event replay idempotence | ✅ | Upsert on `creem_subscription_id` (`lib/creem.ts:121-133`) |
| Cancel/expired routing | ✅ | Tests: `subscription.canceled routes to cancelSubscription`, `subscription.expired routes to cancelSubscription` |

## 3. Checkout Flow

| Check | Status | Evidence |
|---|---|---|
| Unauthenticated → 401 | ✅ | `lib/__tests__/checkout-route.test.ts` |
| Authenticated → Creem API call | ✅ | Test asserts `metadata.userId`, `success_url: /account?checkout=success` |
| Provider error → 502 | ✅ | Test asserts 502 on `!ok` response |
| Network failure → non-2xx | ✅ | Test asserts ≥500 on fetch throw |
| Success URL includes `?checkout=success` | ✅ | `app/api/checkout/route.ts:40` |

## 4. Account Page (Post-Checkout)

| Check | Status | Evidence |
|---|---|---|
| Pending state (`?checkout=success` + no access) | ✅ | Amber card "Returning from checkout — confirming…" replaces Upgrade button |
| Auto-refresh (5s, 3-min cap) | ✅ | `app/account/pending-refresher.tsx` — `router.refresh()` + interval cleanup |
| No auto-recheckout | ✅ | UpgradeButton hidden when `checkoutPending` |
| Entitlement from DB only | ✅ | `hasAccess` from `supabase.from("subscriptions")` — URL param is presentation-only |

## 5. Pro Entitlement (What Pro Actually Adds)

| Feature | Free | Pro |
|---|---|---|
| Oracle consultations/day | 3 | 10 |
| Oracle output | Standard (3 sections: Traditional/Interpretation/Reflection) | Deep (+ GOING DEEPER section, deeper Reflection, follow-up invitation; ~2× token budget) |
| Zi Wei reading tokens | 3000 | 6000 |
| Zi Wei deep sections | No | Yes (Decades & Timing 大限流年, Palace Interactions 宫位互参) |
| Synastry tokens | 4000 | 8000 |
| Synastry deep sections | No | Yes (+ both-charts qualifier) |

**Byte-identical free output**: Verified by tests — `getOraclePrompt(slug)` without `{deep}` returns the exact same config object as before round 2.

## 6. End-to-End Payment Flow

| Step | Status | Notes |
|---|---|---|
| Login → `/pricing` → Upgrade click | ⚠️ Code verified, no live test | `upgrade_clicked` event fires |
| `/api/checkout` → Creem | ⚠️ Mock verified | Requires Creem test-mode key for live test |
| Creem → webhook → `subscriptions` row | ⚠️ Mock verified | Requires webhook tunnel for live test |
| `/account?checkout=success` → pending card → Pro view | ⚠️ Code verified | Requires test account + webhook delivery |
| Pro user → Oracle deep reading | ⚠️ Code verified | Requires test account + Pro status in DB |

**Blocking items for full E2E verification:**
1. Creem test-mode API key + test product (`.env.example` documents `CREEM_API_BASE=https://test-api.creem.io`)
2. Non-production Supabase project (or owner-designated test account)
3. Webhook tunnel to local/preview app (e.g. `vercel dev` or public tunnel)

**Without these, no live payment test is possible.** Do not use production credentials or real charges.

## 7. Analytics Funnel

| Event | Type | Where |
|---|---|---|
| `iching_cast_completed` | Client | `IChingDivination` (6th cast only) |
| `oracle_consult_started` | Client | `OracleOverlay.consult` (post login-gate) |
| `oracle_reading_delivered` | Client | `OracleOverlay` SSE `[DONE]` (success only) |
| `pricing_example_viewed` | Client | `app/pricing/example-viewed.tsx` (Intersection Observer, 30% threshold) |
| `upgrade_clicked` | Client | Three upgrade buttons (pricing/oracle/account) |
| `checkout_created` | Server | `/api/checkout` after Creem returns URL (logs `user_id` only) |
| `subscription_activated` | Server | Webhook after `activateSubscription` (logs `subscription_id` only) |
| `subscription_cancelled` | Server | Webhook cancel branches |

**Privacy**: All events are scalar-only (no emails, questions, birth data). Server logs contain only IDs.

**Test vs production traffic**: Client events auto-tag `env` attribute (`production`/`preview`/`development`) via `logEvent`.

## 8. Refund Policy

From `app/terms/page.tsx` §"Cancellation and Refunds":
- Cancel anytime from account page, effective end of billing period
- "Refunds are provided at our sole discretion, unless required by applicable law"

**Pricing page disclosure**: "$4.99/month · auto-renews · cancel anytime in Account · Terms & refund policy. Taxes, if any, are calculated at checkout."

## 9. Known Limitations (Owner Decisions Pending)

1. **`expires_at` not enforced at gates** — if Creem fails to deliver `subscription.expired`, access continues indefinitely. Options: (a) add expiry check with grace period, (b) cron job to flip expired rows.
2. **Email self-claim on `/account`** — any account with matching email auto-claims subscription (no ownership proof).
3. **No event-id dedup** — replayed activation events re-upsert (harmless but not tracked).
4. **In-memory quota store** — doesn't share across serverless instances, resets on deploy.

---

*Document auto-generated from code review. Last updated: 2026-10-22.*
