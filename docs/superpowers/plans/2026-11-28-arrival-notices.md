# Intake retry and internal work notices

- Preserve one opaque intake attempt UUID on network/response failure; scope to authenticated buyer and replay existing order before rate cap. Conflicting attempt returns 409. Test duplicate and deliberate fresh order.
- Insert quote/payment work notice atomically with actual state changes, never with a held/revoked payment. Trigger an exact Test-only mail attempt after commit, explicit protected retry and visible work queue. No customer emails; do not enable Live.
- Exercise lost intake response, provider failure/retry, duplicate callback, blocking on dispute and the existing exact buyer/report flow in Postgres tests. A provider receipt is not a verified Gmail wake. Do not reuse previous Preview schema or change live settings.
