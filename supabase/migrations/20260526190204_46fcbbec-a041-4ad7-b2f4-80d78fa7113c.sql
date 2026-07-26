ALTER TABLE public.login_history
  ADD COLUMN IF NOT EXISTS device_info text,
  ADD COLUMN IF NOT EXISTS session_id text;
CREATE INDEX IF NOT EXISTS login_history_user_id_created_at_idx ON public.login_history (user_id, created_at DESC);