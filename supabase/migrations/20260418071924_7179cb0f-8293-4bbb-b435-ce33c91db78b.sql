ALTER TABLE public.login_history
  ADD COLUMN IF NOT EXISTS device_info text,
  ADD COLUMN IF NOT EXISTS session_id text;

CREATE INDEX IF NOT EXISTS login_history_user_id_created_at_idx
  ON public.login_history (user_id, created_at DESC);

DROP POLICY IF EXISTS "Admins can insert login history" ON public.login_history;
CREATE POLICY "Admins can insert login history"
  ON public.login_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));