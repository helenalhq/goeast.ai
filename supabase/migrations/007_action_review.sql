-- supabase/migrations/007_action_review.sql
-- 行动记录与复盘 V1：consult_results 增加两列（复用现有报告存储，不建新表）。
-- action_status：用户主动选择的行动状态（未开始/进行中/已完成）；可空 = 从未选择。
--   绝不由访问或时间自动标记——只有用户点击才写入。
-- review_note：复盘心得（可空、可编辑、≤1000 字，默认私密）。
-- 在 Supabase Dashboard SQL 编辑器执行；底部有完整回滚 SQL。

ALTER TABLE consult_results
  ADD COLUMN IF NOT EXISTS action_status TEXT;

ALTER TABLE consult_results
  ADD COLUMN IF NOT EXISTS review_note TEXT;

-- 约束名固定，便于回滚；已有行 action_status 为 NULL，CHECK 通过
ALTER TABLE consult_results
  DROP CONSTRAINT IF EXISTS consult_results_action_status_check;

ALTER TABLE consult_results
  ADD CONSTRAINT consult_results_action_status_check
  CHECK (action_status IS NULL OR action_status IN ('not_started', 'in_progress', 'done'));

-- ============================================================
-- 回滚 SQL（如需撤销本迁移，整段执行）
-- ============================================================
-- ALTER TABLE consult_results DROP CONSTRAINT IF EXISTS consult_results_action_status_check;
-- ALTER TABLE consult_results DROP COLUMN IF EXISTS review_note;
-- ALTER TABLE consult_results DROP COLUMN IF EXISTS action_status;
