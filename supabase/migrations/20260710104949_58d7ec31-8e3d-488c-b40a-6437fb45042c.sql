
-- Add missing columns to gen_store_items
ALTER TABLE public.gen_store_items ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'file';
ALTER TABLE public.gen_store_items ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE public.gen_store_items ADD COLUMN IF NOT EXISTS body TEXT;

-- Create premium_bonuses table
CREATE TABLE IF NOT EXISTS public.premium_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  days INTEGER NOT NULL CHECK (days BETWEEN 1 AND 5),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.premium_bonuses TO authenticated;
GRANT ALL ON public.premium_bonuses TO service_role;
ALTER TABLE public.premium_bonuses ENABLE ROW LEVEL SECURITY;
DO $wrap$ BEGIN CREATE POLICY "Users read own bonus" ON public.premium_bonuses FOR SELECT TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins read all bonus" ON public.premium_bonuses FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins manage bonus" ON public.premium_bonuses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
CREATE INDEX IF NOT EXISTS idx_premium_bonuses_user_active ON public.premium_bonuses(user_id, is_active, expires_at);
ALTER TABLE public.premium_bonuses REPLICA IDENTITY FULL;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.premium_bonuses; EXCEPTION WHEN others THEN NULL; END $wrap$;

CREATE OR REPLACE FUNCTION public.has_active_premium_bonus(_user_id uuid)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.premium_bonuses WHERE user_id = _user_id AND is_active = true AND expires_at > now())
$$;
