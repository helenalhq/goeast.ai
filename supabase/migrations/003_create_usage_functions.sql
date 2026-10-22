-- supabase/migrations/003_create_usage_functions.sql
-- Atomic increment and check for daily usage limits
-- Prevents race conditions in serverless environments

CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_window_start TIMESTAMPTZ,
  p_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- runs with definer's privileges to bypass RLS
AS $$
DECLARE
  v_current_count INTEGER;
  v_new_count INTEGER;
  v_result JSONB;
BEGIN
  -- Lock the row for this user/window to serialize concurrent requests
  SELECT count INTO v_current_count
  FROM usage_log
  WHERE user_id = p_user_id AND window_start = p_window_start
  FOR UPDATE; -- row-level lock

  IF v_current_count IS NULL THEN
    -- First request in this window
    v_new_count := 1;
    INSERT INTO usage_log (user_id, window_start, count, updated_at)
    VALUES (p_user_id, p_window_start, v_new_count, NOW());
  ELSE
    -- Increment existing count
    v_new_count := v_current_count + 1;
    UPDATE usage_log
    SET count = v_new_count, updated_at = NOW()
    WHERE user_id = p_user_id AND window_start = p_window_start;
  END IF;

  -- Check if over limit
  IF v_new_count > p_limit THEN
    -- Roll back the increment
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

-- Grant execute to authenticated users (API routes use service role, but be explicit)
GRANT EXECUTE ON FUNCTION increment_usage TO authenticated, service_role;
