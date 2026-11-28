-- Apply after install.sql in an explicitly authorized candidate database.
BEGIN;
ALTER TABLE arrival_orders.orders ADD COLUMN intake_attempt uuid;
ALTER TABLE arrival_orders.orders ADD CONSTRAINT arrival_intake_owner_attempt UNIQUE(owner_id,intake_attempt);
CREATE TABLE arrival_orders.notices (
  order_id uuid NOT NULL REFERENCES arrival_orders.orders(id),
  stage text NOT NULL CHECK(stage IN ('quote','paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  first_attempt_at timestamptz,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  provider_id text,
  accepted_at timestamptz,
  PRIMARY KEY(order_id,stage),
  CHECK ((provider_id IS NULL) = (accepted_at IS NULL))
);
CREATE INDEX arrival_unaccepted_notice_idx ON arrival_orders.notices(created_at) WHERE accepted_at IS NULL;
ALTER TABLE arrival_orders.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY arrival_notice_runtime ON arrival_orders.notices TO goeast_arrival_orders_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE arrival_orders.notices FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE arrival_orders.notices TO goeast_arrival_orders_runtime;
GRANT UPDATE(first_attempt_at,lease_until,attempts,provider_id,accepted_at) ON arrival_orders.notices TO goeast_arrival_orders_runtime;
COMMIT;
