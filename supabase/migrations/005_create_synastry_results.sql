-- Synastry results for logged-in users — persistence for the /ziwei/synastry flow.
-- Ownership enforced by RLS: only the owner can read/write.

CREATE TABLE synastry_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_a JSONB NOT NULL,
  person_b JSONB NOT NULL,
  relationship_type TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'both',
  chart_a JSONB NOT NULL,
  chart_b JSONB NOT NULL,
  ai_response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_synastry_results_user ON synastry_results(user_id, created_at DESC);

ALTER TABLE synastry_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own synastry"
  ON synastry_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own synastry"
  ON synastry_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own synastry"
  ON synastry_results FOR UPDATE
  USING (auth.uid() = user_id);
