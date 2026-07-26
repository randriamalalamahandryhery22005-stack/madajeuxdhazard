
-- Add reset_code to password_reset_requests
ALTER TABLE public.password_reset_requests 
  ADD COLUMN IF NOT EXISTS reset_code TEXT,
  ADD COLUMN IF NOT EXISTS new_password TEXT;

-- Online presence table
CREATE TABLE IF NOT EXISTS public.online_users (
  user_id UUID PRIMARY KEY,
  last_ping TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.online_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read online" ON public.online_users;
CREATE POLICY "Authenticated can read online" ON public.online_users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users upsert own presence" ON public.online_users;
CREATE POLICY "Users upsert own presence" ON public.online_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own presence" ON public.online_users;
CREATE POLICY "Users update own presence" ON public.online_users FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own presence" ON public.online_users;
CREATE POLICY "Users delete own presence" ON public.online_users FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.online_users;
ALTER TABLE public.online_users REPLICA IDENTITY FULL;

-- Helper function for active device check (used by client)
CREATE OR REPLACE FUNCTION public.get_active_device(_user_id uuid)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT device_id FROM public.profiles WHERE user_id = _user_id;
$$;
