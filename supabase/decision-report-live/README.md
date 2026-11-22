# GoEast P1 Live storage

Manual, additive migration for the approved existing GoEast PostgreSQL project. No automatic runner, hosted change, LOGIN, password, deploy flags, Creem credentials or hardcoded SKU. Production and Preview do not share a report schema or roles. This migration is not a deploy operation and does not open sales.

1. An authorized operator confirms the GoEast project and runs `preflight-public.sql` in **BEGIN READ ONLY**; zero rows is necessary, not sufficient. Never change unrelated grants, RLS or Data API exposure to make this pass. Stop on a mismatch. The migration additionally verifies effective catalog rights for all four new roles; role memberships must have no access path. Confirm exact operator production PG version and role rights, and that the private schema is not exposed through PostgREST.
2. Only after separate authorization, take a verified backup/restore point, apply `001.sql` as the authorized migration operator, and check exact schema/RPC/owner, RLS and role/ACL evidence. It intentionally leaves all roles NOLOGIN. The two application logins are configured separately via a provider-approved secret workflow only after the runtime is ready; use same-project, hostname-pinned TLS with the proper certificate chain. Definer roles stay NOLOGIN. Check actual pooler `session_user`, `current_user`, DB and `isolation_ok()` in the same transaction as an RPC; no service-role or generic connection fallback.
3. Verify the merchant has no independent unbound checkout surface. Do not enable new sales before fulfillment, callbacks/refunds and operational reconciliation are live. Pausing sales never drops tables, reverses applied grants automatically, deactivates owner reads, or disables existing verified callback and fulfillment. P1 requires a fulfillment-capable previous deployment for an app rollback; do not use QA drop scripts.
4. The app derives its owner UUID exclusively from a verified Supabase session; the shared server connection remains a trust boundary. The callback credential must never be reachable in a user handler. Privileged functions pin their search path; runtime credentials get no direct relation privileges. The DB compares verified purchase facts to the checkout intent; it does not replace the application's raw-body signature and authoritative provider validation. A 90-second generation lease allows retry on crash, with a durable three-attempt cap; support must resolve exhausted paid orders or refund, not silently take a different payment. Action notes are restricted to delivered orders.

The `event_reconciliation` table stores only event type, bounded opaque IDs, coded reason and timestamp. Establish an authorized operations queue, SLA and dismissal evidence before sales. Ambiguous/out-of-order events do not grant entitlement. Fully authenticated early refunds only tombstone an already-linked local checkout. The read-side adapter must use no shared cache for private data.

Run in-memory PGlite (version 0.5.17), no database URL:

```sh
PGLITE_MODULE=/tmp/goeast-live-pglite/node_modules/@electric-sql/pglite/dist/index.js \
  node scripts/verify-decision-live-migration.mjs
PGLITE_MODULE=/tmp/goeast-live-pglite/node_modules/@electric-sql/pglite/dist/index.js \
  node scripts/verify-decision-live-migration.mjs --non-superuser-migrator
```

The disposable fixture covers core SQL transitions and role separation with synthetic identifiers. The non-superuser migration fixture uses a disposable PostgreSQL operator with CREATEROLE and CREATE on the database and checks that only admin-without-access provisioning memberships remain. This does not verify hosted Supabase role management/pooler, authenticated HTTP boundaries, multiple concurrent hosted sessions, a Live financial event, production continuity or real model delivery.
