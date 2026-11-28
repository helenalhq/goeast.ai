-- Apply only to an isolated test database. Never add this to production migrations.
BEGIN;
CREATE SCHEMA IF NOT EXISTS arrival_preview;
REVOKE ALL ON SCHEMA arrival_preview FROM PUBLIC;
CREATE TABLE IF NOT EXISTS arrival_preview.jobs (
  id text PRIMARY KEY,
  trip jsonb NOT NULL CHECK (trip->>'synthetic' = 'true'),
  "itineraryVersion" integer NOT NULL DEFAULT 1,
  expires timestamptz NOT NULL,
  deadline timestamptz NOT NULL CHECK (deadline > expires),
  checkout text UNIQUE,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','paid','held')),
  "providerOrder" text UNIQUE,
  paid_at timestamptz,
  notice_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((state <> 'paid') OR ("providerOrder" IS NOT NULL AND paid_at IS NOT NULL))
);
REVOKE ALL ON TABLE arrival_preview.jobs FROM PUBLIC;
COMMIT;
