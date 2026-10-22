-- supabase/migrations/002_create_usage_log_table.sql
-- Daily usage counter for AI consultations (Oracle + Zi Wei shared quota)
-- Free: 3/day, Pro: 10/day. Window resets at UTC midnight.

CREATE TABLE usage_log (
  user_id UUID NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL, -- UTC day boundary (e.g., 2026-10-22 00:00:00+00)
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, window_start)
);

CREATE INDEX idx_usage_log_window ON usage_log(window_start DESC);

-- Row Level Security
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;

-- Service role can manage all rows (API routes use service role)
-- No user-facing access needed — this is server-side only
