-- Candidate migration. Run against a separately authorized database only.
-- Create goeast_arrival_orders_runtime separately as a dedicated NOINHERIT role.
BEGIN;
CREATE SCHEMA arrival_orders;
REVOKE ALL ON SCHEMA arrival_orders FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE arrival_orders.orders (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version = 1),
  trip jsonb NOT NULL CHECK (jsonb_typeof(trip) = 'object' AND trip->>'airport' = 'PVG'),
  product text NOT NULL,
  subtotal integer NOT NULL CHECK (subtotal = 1290),
  currency text NOT NULL CHECK (currency = 'USD'),
  terms_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  state text NOT NULL DEFAULT 'submitted' CHECK (state IN ('submitted','quoted','paid','ready','held','revoked')),
  verified jsonb,
  quote_expires timestamptz,
  due_at timestamptz,
  checkout_started_at timestamptz,
  checkout_id text UNIQUE,
  checkout_url text,
  provider_order text UNIQUE,
  transaction_id text UNIQUE,
  paid_at timestamptz,
  gross integer CHECK (gross IS NULL OR gross >= subtotal),
  CHECK ((quote_expires IS NULL AND due_at IS NULL AND verified IS NULL) OR
         (quote_expires IS NOT NULL AND due_at IS NOT NULL AND quote_expires < due_at AND verified IS NOT NULL)),
  CHECK ((checkout_id IS NULL) = (checkout_url IS NULL)),
  CHECK ((provider_order IS NULL AND transaction_id IS NULL AND paid_at IS NULL AND gross IS NULL)
      OR (provider_order IS NOT NULL AND transaction_id IS NOT NULL AND paid_at IS NOT NULL AND gross IS NOT NULL)),
  CHECK (state NOT IN ('paid','ready') OR transaction_id IS NOT NULL),
  UNIQUE (id, version)
);
CREATE INDEX arrival_order_owner_idx ON arrival_orders.orders (owner_id, created_at DESC);
CREATE TABLE arrival_orders.reports (
  order_id uuid NOT NULL,
  version integer NOT NULL,
  manifest jsonb NOT NULL,
  pdf bytea NOT NULL CHECK (octet_length(pdf) BETWEEN 8 AND 2000000),
  png bytea NOT NULL CHECK (octet_length(png) BETWEEN 8 AND 750000),
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, version),
  FOREIGN KEY (order_id, version) REFERENCES arrival_orders.orders(id, version)
);
CREATE TABLE arrival_orders.blocks (
  transaction_id text PRIMARY KEY,
  event_id text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('refund.created','dispute.created')),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE arrival_orders.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrival_orders.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrival_orders.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY arrival_orders_runtime ON arrival_orders.orders TO goeast_arrival_orders_runtime USING (true) WITH CHECK (true);
CREATE POLICY arrival_reports_runtime ON arrival_orders.reports TO goeast_arrival_orders_runtime USING (true) WITH CHECK (true);
CREATE POLICY arrival_blocks_runtime ON arrival_orders.blocks TO goeast_arrival_orders_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON ALL TABLES IN SCHEMA arrival_orders FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA arrival_orders TO goeast_arrival_orders_runtime;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA arrival_orders TO goeast_arrival_orders_runtime;
GRANT UPDATE (state,verified,quote_expires,due_at,checkout_started_at,checkout_id,checkout_url,provider_order,transaction_id,paid_at,gross)
 ON arrival_orders.orders TO goeast_arrival_orders_runtime;
COMMIT;
