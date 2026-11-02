# Consult Follow-up Q&A — 继续讨论这次解读 (Design)

Date: 2026-11-02 · Branch: feat/mobile-consult-loop lineage · Status: approved sections 1–3, pending spec review

## Goal

A user opens a saved I Ching report and asks follow-up questions about the same
reading. Follow-up turns are saved with the report, survive refresh and history
reopen, and never trigger a new cast or modify the original report.

## Owner decisions (2026-11-02)

1. **Quota** — shared daily pool: each follow-up is 1 AI credit (free 3/day,
   Pro 10/day), same `checkAndIncrementUsage` + failure-refund machinery as the
   initial reading. No change to benefits or pricing.
2. **Migration** — this repo writes `006_create_consult_followups.sql`
   (create + RLS + index + full rollback, Chinese comments); the owner applies
   it in the Supabase Dashboard SQL editor (same workflow as
   `supabase/apply-migration.sql` precedent). Until applied, the endpoint
   returns a clear error instead of crashing.
3. **Per-report cap** — 20 follow-up turns per report; prompt grounds on the
   most recent 8 turns (older turns dropped, bounded context).
4. **Cap is not tiered** (2026-11-02) — free and Pro both get 20 turns/report.
   The cap is a structural guardrail, never an entitlement; tier difference
   stays expressed solely by the daily quota (3 vs 10). The daily quota counts
   ALL AI calls — an initial reading plus follow-ups share the same pool, so
   Pro's 10/day means 10 total calls, not 10 follow-ups on top of a reading.
   UI copy next to the input states "follow-ups use your daily consultation
   quota"; no remaining-counter is built (none exists today).

## Inventory summary (what is reused — no second chat/history system)

| Capability | Reuse |
|---|---|
| `/api/oracle` skeleton | auth gate, Pro check, atomic quota, refund-on-failure, SSE envelope |
| `buildIchingContextBlock` | anti-recast OVERRIDE language already present; fed from DB, not client |
| `validateIchingContext` | server-side re-validation of stored `cast_data` |
| `consult_results` | untouched — grounding source only |
| `ResultView` "My Next Step" pattern | optimistic local save, status states, stale-response guards, sessionStorage drafts |
| MyReadings → result restore path | follow-ups load with the same reopen |
| Analytics (`logEvent` union, QA marker) | new scalar-only events |
| 3B e2e harness | QA-user provisioning, usage/report-row assertions, PII-marker audit |

Missing (built by this feature): follow-up turn storage (new table), follow-up
endpoint, multi-turn prompt builder, ResultView follow-up section, events,
permission/idempotency tests.

## Data model

```sql
CREATE TABLE consult_followups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES consult_results(session_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_consult_followups_session ON consult_followups(session_id, turn_index);
-- RLS: owner-only SELECT and INSERT. No UPDATE, no DELETE → append-only.
```

- `turn_index` is server-computed (display order); concurrent tabs may each
  produce a turn — each charged, both grounded in the same report. Soft cap
  check before charging; a race may overshoot 20 by at most the tab count.
- FK on `session_id` targets `consult_results(session_id)` (UNIQUE, exists).

## API

### `POST /api/consult/followup` — body `{ sessionId, question }`

Order of operations (server-authoritative; frontend identity/cast/entitlement
never trusted):

1. Auth (Supabase session cookie) → else 401 `LOGIN_REQUIRED`
2. Load report by `session_id` + `user_id` (RLS + explicit check). Other
   user's report or missing → 404 (same response — no existence leak)
3. `validateIchingContext(report.cast_data)` → null ⇒ 422 `REPORT_DATA_MISSING`
   (explicit restriction; the model is never asked to guess the cast)
4. Question validation: non-empty, ≤500 chars (same limit as initial)
5. Turn count < 20 → else 429 `FOLLOWUP_LIMIT_REACHED`
6. Quota: `checkAndIncrementUsage` (free/Pro as today); record `chargedUserId`
7. SSE stream: `data: {"content": …}` chunks, `data: [DONE]`
8. On success: INSERT the turn **in the same request**; client refetches the
   thread after `[DONE]` (single source of truth, no client-side turn ids)
9. Failure paths refund the charge (create failure / mid-stream upstream
   failure / empty stream — client disconnects are NOT refunded), no INSERT

### `GET /api/consult/followup?session_id=` → `{ followups: […] }`

Owner-scoped list for restore. Called on result-page load when the report is
account-saved; never triggers generation.

## Follow-up prompt (server-assembled, DB-only inputs)

Zhou Gong base persona (`prologue-zhougong`) + original question + iching
context block (from validated DB cast — includes the existing "never recast"
OVERRIDE) + full original reading text + last 8 follow-up turns + guardrails:

- Same cast only; never introduce or cast a new hexagram
- Quote classical text ONLY when provided above; referencing anything else
  must be phrased as interpretation ("my reading of Line N is…"), never as a
  quotation
- Explanation and reflection only: no deterministic predictions, no invented
  user history, no pressure
- ≤400 words (initial readings are ≤800)
- This is for entertainment and reflection; no medical/legal/financial advice

## UI (ResultView, new section between "Questions to Sit With" and "My Next Step")

- No turns yet: single button "继续讨论这次解读" expands the input area
- Input: textarea ≥16px (no iOS focus-zoom), send button; unused draft kept in
  sessionStorage (next-step pattern) so refresh preserves typing
- Thread: alternating Q/A, answers via ReactMarkdown (same as report body)
- States `idle → streaming → saved`; during streaming the input is hidden and
  send disabled (GuidedFlow duplicate-click guard pattern)
- Failure: error banner + retry; **input preserved**; quota already refunded
- Local-only report (not account-saved / logged out): explanatory copy + login
  link, no input box
- First-consult flow (GuidedFlow), original report rendering, and next-step
  save are untouched — additive section only

## Error matrix

| Scenario | Behavior |
|---|---|
| Not logged in | 401 → login link; draft survives the round-trip |
| Other user's report | 404 (same as missing) |
| `cast_data` missing/malformed | 422 `REPORT_DATA_MISSING`, fixed copy, model not called |
| Daily quota exhausted | 429 `LIMIT_REACHED` → same copy as initial reading + Pro link |
| 20-turn cap | 429 `FOLLOWUP_LIMIT_REACHED` → link to start a new reading (will recast) |
| Timeout / network cut mid-stream | error + retry, input preserved, charge refunded |
| INSERT fails after a completed stream | `consult_followup_failed{reason:"save_failed"}`; show generated content with "refresh may lose this turn" notice; charge kept (content delivered) — surfaced honestly |
| Refresh / history reopen | read-only restore; zero oracle calls, zero charges |

## Analytics (scalars only — no questions, answers, or personal data)

New events: `consult_followup_started`, `consult_followup_completed`,
`consult_followup_failed {reason}`. QA marker (`qa:"<label>"`) and `env`
attach automatically via `logEvent`.

## Testing

- **Unit (vitest)**: prompt builder (grounding contents, 8-turn truncation,
  guardrail phrases), route validation matrix (401/404/422/429/empty/oversize),
  other-account 404 (mocked supabase, oracle-route.test.ts pattern)
- **E2E group D** (real backend, extends `mobile-consult-e2e.mjs`): two
  consecutive follow-ups → DB-assert original report row unchanged
  (question/ai_response/updated_at) and hexagram unchanged; refresh restores
  full thread with 0 oracle POSTs and no extra charge; double-click → one
  POST/charge/row; second account → 404 on read and follow-up; PII-marker audit
- **Regression**: 3B groups A/B/C re-run (initial flow, refund, duplicate
  submission unchanged)

## Out of scope (this round)

Other login flows, synastry follow-ups, PDF export, public sharing, reminder
emails, calendar, complex review systems. The existing next-step save stays
as-is. OracleOverlay is not touched (its Pro upsell copy already advertises
follow-ups; unifying that entry point is future work).

**Known copy issue (RESOLVED 2026-11-02):** the OracleOverlay Pro-unlock bullet
previously read "Deep conversation mode — follow-up questions", implying
follow-ups were Pro-exclusive while report follow-ups work for free users
within their daily pool. Replaced with an accurate quota bullet
("10 readings/day — including follow-up questions on saved readings"); overlay
entry-point unification remains future work.

## Acceptance criteria mapping

1. Two follow-ups on one report → original cast + report unchanged → e2e DB diff
2. Refresh & history reopen → thread restored, no re-charge → e2e POST/usage asserts
3. Cross-account read/follow-up blocked server-side → 404 e2e + unit tests
4. Timeout/save-failure/quota/duplicate handled with no dup records/charges → error matrix + e2e
5. Mobile input & long answers operable; no regressions in first consult / report / next-step → group D + A/B/C regression
6. Analytics carry no questions/answers/profiles → PII-marker audit + scalar-only logEvent
