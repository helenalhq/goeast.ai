-- Consultation results for logged-in users — minimal persistence.
-- Ownership enforced by RLS: only the owner can read/write.
-- Note: "cast" is a PostgreSQL reserved word, so the column is named "cast_data".

CREATE TABLE consult_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}',
  cast_data JSONB NOT NULL DEFAULT '{}',
  ai_response TEXT NOT NULL,
  next_step TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consult_results_user ON consult_results(user_id, created_at DESC);

ALTER TABLE consult_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consult results"
  ON consult_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consult results"
  ON consult_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consult results"
  ON consult_results FOR UPDATE
  USING (auth.uid() = user_id);
