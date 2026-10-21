# Entitlements Reference — Free vs Pro

This document describes exactly what Pro ($4.99/month) unlocks, faithful to the implementation on this branch. Free output is byte-identical to what the site shipped before Pro existed.

## 1. Capability table

| Capability | Free | Pro |
|---|---|---|
| Oracle consultation | Standard reading (~600–800 words/philosopher) | Deep reading (~2× length, ~1200–1600 words) |
| I Ching casting | Same hexagram engine, same output | Same — no difference |
| Zi Wei chart calculation | Same chart | Same — no difference |
| Zi Wei AI reading | Standard interpretation (token budget 3000) | Deep mode: decades & timing, palace interactions, reflection (token budget 6000) |
| Synastry (compatibility) | Same addendum + both-charts qualifier (token budget 4000) | Same content, token budget 8000 (longer output) |
| Quota | 3 requests / 24h | 10 requests / 24h |
| Quota window | Sliding 24h window from first request | Same window, higher cap |
| Quota storage | In-memory, per server instance, shared across Oracle / Zi Wei / Synastry endpoints per user | Same store, higher cap |

## 2. What Pro deep mode adds per tool

- **Oracle** — Same engine and sources. Pro adds a DEEP READING MODE:
  - "GOING DEEPER" section: a second angle on the question
  - 3 REFLECTION questions (instead of 2–3)
  - One follow-up invitation
  - ~2× length (maxWords ×2; token budget roughly 1200 → 2400)
- **Zi Wei reading** — Pro adds:
  - DECADES & TIMING (大限流年) section
  - PALACE INTERACTIONS (宫位互参) section
  - REFLECTION section
  - Token budget 3000 → 6000
- **Synastry** — Same addendum and both-charts qualifier; token budget 4000 → 8000 (longer output, no structural sections added).
- **I Ching casting / Zi Wei chart** — identical between tiers; only quota differs.

## 3. Entitlement pipeline

1. User clicks upgrade → `/api/checkout` creates a Creem checkout session ($4.99/mo).
2. Creem sends subscription lifecycle events to the webhook endpoint.
3. The webhook is the **only** source of truth for entitlement: it upserts a row keyed on `creem_subscription_id`.
4. Statuses `active` and `scheduled_cancel` grant Pro access at the gates; anything else does not.
5. `expires_at` is parsed from events but not yet enforced at the gates (see limitations).

## 4. Known limitations & pending owner decisions

- **Quota store is in-memory per server instance.** Quotas reset on deploy/restart and are not shared across instances. Known limitation.
- **`expires_at` not enforced at gates.** It is parsed from webhook events, but access checks do not yet expire entitlements on it. Pending owner decision.
- **/account email self-claim.** A user can claim a Creem customer by matching `customer_email` (auto-link). Unfixed by decision; documented caveat.
- **Creem expiry field name to confirm in test mode** before enabling `expires_at` enforcement.
