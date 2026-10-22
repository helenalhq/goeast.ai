# Conversion Funnel Events

Minimal funnel instrumentation added in round 2 — no new backend. Client events go
through `lib/analytics.ts` (`logEvent`) which forwards to Vercel Analytics
(`track`) with **scalars only** (emails, questions, birth data, and chart
payloads are structurally impossible to pass), never throws, and prints a
`[analytics]` debug line outside production for local evidence. Payment
confirmation is a **server-side** structured log (Vercel runtime logs), not a
client event — the browser never claims a payment happened.

## Funnel steps → events

| Funnel step | Event | Data | Fired where |
|---|---|---|---|
| Tool: cast a hexagram | `iching_cast_completed` | `{has_changing}` | `IChingDivination.handleCast` (6th cast only) |
| Tool: generate Zi Wei chart | `ziwei_chart_generated` | `{}` | `ZiweiChart.handleGenerate` (success only) |
| Tool: start Zi Wei reading | `ziwei_reading_started` | `{}` | `ZiweiInterpretation.handleInterpret` (post login-gate) |
| Tool: start synastry | `synastry_analysis_started` | `{}` | `ZiweiSynastry.handleAnalyze` (post gate + validation) |
| Enter Oracle with a cast | `oracle_opened_with_hexagram` | `{mode: "cast"\|"study"}` | `OracleOverlay` mount effect (context restored) |
| Consultation starts | `oracle_consult_started` | `{philosopher, with_context}` | `OracleOverlay.consult` (post login-gate) |
| Reading delivered | `oracle_reading_delivered` | `{philosopher}` | `OracleOverlay` SSE `[DONE]` (success only) |
| Quota exhausted | `oracle_limit_reached` | `{subscribed}` | `OracleOverlay` LIMIT_REACHED branch |
| Login page opened with a destination | `login_page_viewed_with_target` | `{}` (no path value) | login page mount when `next ≠ /account` — measures login-page opens with a return destination (NOT success) |
| Login succeeded | `login_succeeded` | `{return_target}` (boolean) | password login success, right before redirect. OAuth success is **not measurable client-side** (lands via server-side `/auth/callback` → target page) — noted gap |
| Upgrade intent | `upgrade_clicked` | `{from: "pricing"\|"oracle"\|"account"}` | three upgrade buttons |
| Payment confirmed (server) | — `console.log({event:"subscription_activated", subscription_id})` | — | Creem webhook after successful activate |
| Subscription cancelled (server) | — `console.log({event:"subscription_cancelled", subscription_id})` | — | webhook cancel branches |
| Newsletter signup | `newsletter_subscribed` | `{source}` | `EmailCapture` success branch — new subscriptions only; repeat submits (`alreadySubscribed`) do not fire |

## How to read the funnel

- **Client events**: Vercel dashboard → project `go-east` → **Analytics → Events** (custom events appear after the first production deploy with this code; VA collects only in production).
- **Payment events**: Vercel dashboard → **Logs** (runtime) → filter `subscription_activated` / `subscription_cancelled`. This is the server-authoritative payment record — the checkout success page is never treated as proof.
- Drop-off reading: login funnel = `login_page_viewed_with_target → login_succeeded → (tool events resume)`. `casts → consult_started` (tool-to-oracle conversion), `consult_started → reading_delivered` (AI delivery success), `limit_reached → upgrade_clicked` (paywall conversion), `upgrade_clicked → subscription_activated` (checkout completion, server-side).

## Retry / double-count protections

- Consult/upgrade/start events fire inside click handlers guarded by loading state; failures never emit downstream events.
- `oracle_reading_delivered` fires exactly once per successful stream; failed streams emit nothing.
- `iching_cast_completed` fires only on the 6th cast (restored drafts don't re-emit).
- `login_page_viewed_with_target` is ref-guarded to once per mount; `login_succeeded` fires only on successful password login. `newsletter_subscribed` fires only for genuinely new subscriptions.

## Privacy

Only enum-like strings (`philosopher` slug, `mode`, `from`, `source`), booleans, and counts. No emails, questions, birth data, or chart content can reach analytics — the wrapper drops non-scalars (unit-tested in `lib/__tests__/analytics.test.ts`).

## Local evidence (2026-10-22)

`scripts/acceptance/e4-analytics-evidence.mjs` drives a headless browser through
cast → Oracle-with-context → chart-generation against the dev server and prints
the captured `[analytics]` console lines. Captured:

```
[analytics] iching_cast_completed {has_changing: true}
[analytics] oracle_opened_with_hexagram {mode: cast}
[analytics] ziwei_chart_generated {}
```

Notes:
- `oracle_opened_with_hexagram` appears **twice in dev** because React
  StrictMode double-invokes effects in development; production runs it once.
- `oracle_consult_started` / `oracle_reading_delivered` / `oracle_limit_reached`
  require a logged-in session (they fire after the login gate) — live evidence
  pending a test account; wiring is unit-tested and code-reviewed.
- `newsletter_subscribed` requires a real subscribe POST (writes to the
  newsletter table) — not fired in local evidence to avoid production writes.
- Server payment logs are webhook-side; verified by the mocked webhook tests
  (`lib/__tests__/creem-webhook.test.ts`), live evidence pending Creem test mode.
