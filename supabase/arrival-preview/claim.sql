-- Preview-only; the named isolated QA table is the only object changed.
BEGIN;
SET LOCAL lock_timeout = '2s';
ALTER TABLE arrival_preview.jobs
  ADD COLUMN claim_until timestamptz,
  ADD COLUMN claim_token uuid,
  ADD COLUMN claim_version integer,
  ADD CONSTRAINT arrival_preview_claim_consistent CHECK (
    (claim_until IS NULL AND claim_token IS NULL AND claim_version IS NULL) OR
    (claim_until IS NOT NULL AND claim_token IS NOT NULL AND claim_version IS NOT NULL)
  );
COMMIT;
