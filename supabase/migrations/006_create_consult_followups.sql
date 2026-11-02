-- supabase/migrations/006_create_consult_followups.sql
-- 追问记录表（append-only）：每轮追问一行，RLS 仅本人可读/插入。
-- 原报告表 consult_results 零改动 —— “不覆盖原报告”由结构保证。
-- 在 Supabase Dashboard SQL 编辑器执行；底部有完整回滚 SQL。

CREATE TABLE consult_followups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES consult_results(session_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consult_followups_session ON consult_followups(session_id, turn_index);

ALTER TABLE consult_followups ENABLE ROW LEVEL SECURITY;

-- 仅本人可读
CREATE POLICY "Users can read own followups"
  ON consult_followups FOR SELECT
  USING (auth.uid() = user_id);

-- 仅本人可插入；且 session 必须属于本人（纵深防御，API 层已校验归属）
-- 无 UPDATE、无 DELETE 策略 → append-only
CREATE POLICY "Users can insert own followups"
  ON consult_followups FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM consult_results cr
      WHERE cr.session_id = session_id AND cr.user_id = auth.uid()
    )
  );

-- ============================================================
-- 回滚 SQL（如需撤销本迁移，整段执行）
-- ============================================================
-- DROP POLICY IF EXISTS "Users can insert own followups" ON consult_followups;
-- DROP POLICY IF EXISTS "Users can read own followups" ON consult_followups;
-- DROP TABLE IF EXISTS consult_followups;
