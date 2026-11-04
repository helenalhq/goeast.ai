-- supabase/migrations/008_synastry_followup.sql
-- 紫微合盘追问 V1：
--   1) synastry_followups 表（append-only，镜像 consult_followups）
--   2) synastry_results 增加 action_status / review_note 两列（镜像 007）
-- 在 Supabase Dashboard SQL 编辑器执行；底部有完整回滚 SQL。

CREATE TABLE synastry_followups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES synastry_results(session_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_synastry_followups_session ON synastry_followups(session_id, turn_index);

ALTER TABLE synastry_followups ENABLE ROW LEVEL SECURITY;

-- 仅本人可读
CREATE POLICY "Users can read own synastry followups"
  ON synastry_followups FOR SELECT
  USING (auth.uid() = user_id);

-- 仅本人可插入；且报告必须属于本人（纵深防御，API 层已校验归属）
-- 无 UPDATE、无 DELETE 策略 → append-only
CREATE POLICY "Users can insert own synastry followups"
  ON synastry_followups FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM synastry_results sr
      WHERE sr.session_id = session_id AND sr.user_id = auth.uid()
    )
  );

-- 行动状态与复盘心得（同 007 的 consult_results 版本）
ALTER TABLE synastry_results
  ADD COLUMN IF NOT EXISTS action_status TEXT;

ALTER TABLE synastry_results
  ADD COLUMN IF NOT EXISTS review_note TEXT;

ALTER TABLE synastry_results
  DROP CONSTRAINT IF EXISTS synastry_results_action_status_check;

ALTER TABLE synastry_results
  ADD CONSTRAINT synastry_results_action_status_check
  CHECK (action_status IS NULL OR action_status IN ('not_started', 'in_progress', 'done'));

-- ============================================================
-- 回滚 SQL（如需撤销本迁移，整段执行）
-- ============================================================
-- ALTER TABLE synastry_results DROP CONSTRAINT IF EXISTS synastry_results_action_status_check;
-- ALTER TABLE synastry_results DROP COLUMN IF EXISTS review_note;
-- ALTER TABLE synastry_results DROP COLUMN IF EXISTS action_status;
-- DROP POLICY IF EXISTS "Users can insert own synastry followups" ON synastry_followups;
-- DROP POLICY IF EXISTS "Users can read own synastry followups" ON synastry_followups;
-- DROP TABLE IF EXISTS synastry_followups;
