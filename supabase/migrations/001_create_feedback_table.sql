-- supabase/migrations/001_create_feedback_table.sql
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('suggestion', 'problem', 'feature')),
  content TEXT NOT NULL,
  page_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feedback_type ON feedback(feedback_type);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);
