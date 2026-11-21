# Funnel Contract — P0/P1/P2 共用事件契约

Status: P0 wired (2026-11-21) · Audience: P1 (per-use product), P2 (measurement) · Owner: Helena

## 1. Unified event semantics ｜ 统一语义

| Contract event | Where it fires | Implementation (P0) | Notes |
|---|---|---|---|
| `entry_viewed` | Experiment entry exposed | existing `consult_entry_viewed` (Vercel Analytics, client) | Maps 1:1; consult landing only. `try_iching_clicked` covers article CTA entries |
| `free_result_viewed` | Free cast result actually displayed | **new** client event (Vercel Analytics) | Fires ONLY on a NEW cast (confirm-page cast or explicit re-cast). Refresh / login-return restore does NOT re-fire (刷新不重复计数) |
| `auth_started` | User initiates login | **new** client event on AI-button→login redirect | Existing `login_page_viewed_with_target` additionally fires on login page mount with target |
| `auth_succeeded` | Login completed | existing `login_succeeded` (client) | Has `return_target: bool` |
| `auth_failed` | Login attempt failed | **new** client event, 5 branches: `password` / `signup` / `otp_send` / `otp_verify` / `google` | No error strings attached — method enum only |
| `offer_viewed` | Paid offer actually displayed | Client event on pricing (`offer_id: pro_monthly`) | Quote and actionable CTA both in the foreground viewport; same-tab dedup for 30 minutes (including refresh when session storage is available). No impressions for loading/failed/disabled states. |
| `checkout_started` | User actually redirected to checkout | **new** client event after checkoutUrl received | `upgrade_clicked` = intent (kept); this = redirect began |
| `checkout_created` | Server created a checkout session | server log in `/api/checkout` (exists) | `{"event":"checkout_created","user_id":…}` — no email |
| `checkout_failed` | Server failed to create checkout | **new** server log in `/api/checkout` | `{"event":"checkout_failed","user_id":…,"status":…}` |
| `payment_confirmed` | Payment confirmed by processor event | **new** server log in Creem webhook | `checkout.completed`/`subscription.active` → `kind:"first"`; `subscription.paid` → `kind:"renewal"` (inference — see caveats) |
| `delivery_succeeded` | Entitlement actually granted | **new** server log — ONLY when `activateSubscription` returns `ok:true` (write verified) | DB row in `subscriptions` is the durable record |
| `delivery_skipped` | Terminal-state guard no-op (late retry after cancel) | **new** server log | Paid-but-guarded: neither delivered nor failed — exclude from both counts |
| `delivery_failed` | Entitlement grant failed | **new** server log — DB read/write failure (`read_failed`/`write_failed`) or exception | "Paid but not delivered" = payment_confirmed without a later delivery_succeeded for the same subscription_id |
| `refund_confirmed` | Refund confirmed by processor | **new** server log on `refund.*` events | Creem refund event shape UNVERIFIED (no test config) — see §5 |

Homepage loads, CTA clicks, and the payment return page (`/account?checkout=success`) are **NOT** confirmation events — the return page only renders; entitlement comes from the webhook.

## 2. Field contract ｜ 最小字段

Client events (Vercel Analytics `logEvent`) automatically carry:
- `env`: `production` / `preview` / `development` (attached by `logEvent`)
- `qa`: test-run marker when `localStorage["goeast:qa"]` is set (QA traffic filterable)

Per-event fields (all scalars; the analytics layer drops non-scalars and any
attempt to pass objects):

| Field | Values | Present on |
|---|---|---|
| `channel` | `web` | free_result_viewed, auth_started, offer_viewed |
| `path` | `consult_iching`, `pricing`, … | free_result_viewed, auth_started, offer_viewed |
| `offer_id` | `pro_monthly` (P1 adds `decision_once`) | offer_viewed, checkout_started, server payment/delivery/refund |
| `from` | entry surface (`pricing`, `oracle`, `example`, `account`) | upgrade_clicked, checkout_started |
| `kind` | `first` / `renewal` | server payment_confirmed, delivery_succeeded |
| `method` | `password`/`signup`/`otp_send`/`otp_verify`/`google` | auth_failed |
| `reason` | enum (e.g. `login_required`, `api_error`) | existing consult_generation_failed etc. |

**Forbidden everywhere** (enforced by scalar-only layer + review): question text,
names, birth data, emails, full URLs, tokens. Server logs carry opaque
`user_id` (UUID) and `subscription_id` only.

**Experiment id**: P1/P2 experiments pass `exp: "<opaque-id>"` as an optional
field on client events (not yet used in P0 — reserved).

## 3. Where each stage actually happens ｜ 各阶段发生位置

| Stage | Location |
|---|---|
| 体验 (free cast) | Client-side only in `GuidedFlow`/`CastView` — no API, no quota |
| 登录 | `/login` (password/OTP) or Google OAuth → `/auth/callback?next=…` → back to `/consult/iching` |
| 结账创建 | Server: `POST /api/checkout` → Creem checkout session (log `checkout_created`) |
| 支付 | **Off-site at Creem** — confirmed only via Creem webhook (`checkout.completed`/`subscription.paid`) |
| 交付 | Server: webhook → `activateSubscription` → `subscriptions` row upsert (log `delivery_succeeded`) |

## 4. Query samples for P2 ｜ 聚合查询样例

Client funnel (Vercel Analytics dashboard or export; events filtered `env=production`, `qa` absent):

```
-- conceptual: daily funnel by path
SELECT date, event, count(*) 
FROM analytics_events
WHERE env='production' AND qa IS NULL
  AND event IN ('consult_entry_viewed','free_result_viewed','auth_started',
                'auth_succeeded','consult_generation_completed',
                'offer_viewed','checkout_started')
GROUP BY date, event ORDER BY date, event;
```

Server events (Vercel log drain → your store; JSON lines):

```
-- payment/delivery/refund from webhook logs, deduped by subscription+kind per day
SELECT event, kind, count(DISTINCT subscription_id)
FROM server_logs
WHERE event IN ('payment_confirmed','delivery_succeeded','delivery_failed','refund_confirmed')
  AND json:env != 'test'
GROUP BY event, kind;
```

Entitlement truth (Supabase — the authoritative delivery record):

```sql
-- active Pro entitlements (delivery ground truth)
select count(*) from subscriptions
where status in ('active','scheduled_cancel')
  and (expires_at is null or expires_at > now());

-- first vs renewal approximation from webhook log kinds; cross-check:
select creem_subscription_id, min(created_at) as first_delivery, count(*) as events
from subscriptions group by 1; -- renewals upsert the same row: 1 row per subscription
```

## 5. Coverage, dedup, and known gaps ｜ 口径与缺口（如实）

1. **Dedup — client events**: `free_result_viewed` fires once per NEW cast
   (refresh/restore does not re-fire). Vercel Analytics dedupes per
   session/day; **it cannot identify users across days** — treat client counts
   as event counts, not unique humans. Do NOT splice browser ids to fake
   uniques. Cross-day unique-user math must come from authenticated DB state
   (e.g. `auth.users`, `consult_results.user_id`).
2. **Dedup — payment/delivery**: webhook `activateSubscription` upserts by
   `creem_subscription_id`, so **entitlement delivery is idempotent under
   callback replay**. Event-level analytics dedup should key on
   `(subscription_id, event, kind, day)`. **Gap**: we do NOT store Creem
   event ids, so exact once-per-webhook-event dedup for LOG counting is not
   possible today; P1 should add an `webhook_events` table keyed on event id.
3. **First vs renewal**: inferred from event type (`subscription.paid` →
   renewal). **Unverified against Creem docs** (no test config) — treat as
   approximate until verified; authoritative renewal counting should compare
   `updated_at` vs `created_at` on the subscriptions row.
4. **Refunds**: `refund.*` handler logs `refund_confirmed`, but **whether
   Creem sends these event types, and their payload shape, is UNVERIFIED —
   no payment test config exists in this environment**. Refund truth today =
   manual reconciliation in Creem dashboard. Not claimed as tested.
5. **Test exclusion**: client events carry `env` + `qa`; QA runs (scripts set
   `goeast:qa`) are excluded by `qa IS NULL`. Server logs: mark test-mode
   traffic — **gap**: webhook logs don't yet carry an explicit test flag;
   test payments should use test-mode Creem keys (separate project env) so
   production logs stay clean.
6. **Missing data**: Vercel Analytics retention/window limits apply to client
   events; server logs drain only if a log drain is configured (**gap**: no
   drain configured in this environment — logs are view-only in dashboard**).
   Payment-authoritative data lives in Creem + `subscriptions` table; we can
   read the latter, not the former (no Creem API credentials in this task's
   scope — do not bypass).

## 6. P1 integration notes

- `decision_once` (per-use) branches: same event names, `offer_id:
  "decision_once"`, one delivery per order id (dedup by order, not
  subscription). The `checkout_started`/`checkout_created` pair already
  supports it — pass the offer id through `/api/checkout`.
