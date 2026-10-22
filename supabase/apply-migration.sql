-- ============================================================
-- GoEast 数据库迁移 — 在 Supabase Dashboard SQL 编辑器中执行
-- 项目: vdmpcrgpvjeuozbalbpt
-- 目的: 创建 usage_log 表和 increment_usage 函数
-- 回滚: 文件底部有完整的回滚 SQL
-- ============================================================

-- 1. 创建 usage_log 表（跨实例每日额度计数）
CREATE TABLE IF NOT EXISTS usage_log (
  user_id UUID NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, window_start)
);

-- 2. 索引（按日期查询效率）
CREATE INDEX IF NOT EXISTS idx_usage_log_window ON usage_log(window_start DESC);

-- 3. 启用行级安全（仅服务端通过 service role 访问）
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;

-- 不创建任何 policy → 只有 service_role 可以绕过 RLS 读写
-- 客户端（anon key）无法读写此表

-- 4. 创建原子增量函数（带固定 search_path 防止搜索路径劫持）
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_window_start TIMESTAMPTZ,
  p_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_count INTEGER;
  v_new_count INTEGER;
  v_result JSONB;
BEGIN
  SELECT count INTO v_current_count
  FROM usage_log
  WHERE user_id = p_user_id AND window_start = p_window_start
  FOR UPDATE;

  IF v_current_count IS NULL THEN
    v_new_count := 1;
    INSERT INTO usage_log (user_id, window_start, count, updated_at)
    VALUES (p_user_id, p_window_start, v_new_count, NOW());
  ELSE
    v_new_count := v_current_count + 1;
    UPDATE usage_log
    SET count = v_new_count, updated_at = NOW()
    WHERE user_id = p_user_id AND window_start = p_window_start;
  END IF;

  IF v_new_count > p_limit THEN
    UPDATE usage_log
    SET count = v_current_count, updated_at = NOW()
    WHERE user_id = p_user_id AND window_start = p_window_start;
    v_result := jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'currentCount', v_current_count,
      'reason', 'limit_exceeded'
    );
  ELSE
    v_result := jsonb_build_object(
      'allowed', true,
      'remaining', p_limit - v_new_count,
      'currentCount', v_new_count
    );
  END IF;

  RETURN v_result;
END;
$$;

-- 5. 执行权限：仅服务端角色
REVOKE EXECUTE ON FUNCTION increment_usage FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_usage TO authenticated, service_role;

-- ============================================================
-- 验证（执行后运行以下查询确认）
-- ============================================================
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'usage_log';
-- SELECT routine_name FROM information_schema.routines WHERE routine_name = 'increment_usage';
-- SELECT * FROM pg_policies WHERE tablename = 'usage_log';  -- 应返回 0 行（无 policy = 仅 service_role）

-- ============================================================
-- 回滚 SQL（如需回退）
-- ============================================================
-- DROP FUNCTION IF EXISTS increment_usage(UUID, TIMESTAMPTZ, INTEGER);
-- DROP TABLE IF EXISTS usage_log;
