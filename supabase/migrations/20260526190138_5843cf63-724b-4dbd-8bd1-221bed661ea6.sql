
-- online_users
CREATE TABLE IF NOT EXISTS public.online_users (
  user_id UUID PRIMARY KEY,
  last_ping TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.online_users TO authenticated;
GRANT ALL ON public.online_users TO service_role;
ALTER TABLE public.online_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read online" ON public.online_users;
CREATE POLICY "Authenticated can read online" ON public.online_users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users upsert own presence" ON public.online_users;
CREATE POLICY "Users upsert own presence" ON public.online_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own presence" ON public.online_users;
CREATE POLICY "Users update own presence" ON public.online_users FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own presence" ON public.online_users;
CREATE POLICY "Users delete own presence" ON public.online_users FOR DELETE TO authenticated USING (auth.uid() = user_id);
DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.online_users; EXCEPTION WHEN duplicate_object THEN NULL; END; END $$;
ALTER TABLE public.online_users REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.get_active_device(_user_id uuid)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT device_id FROM public.profiles WHERE user_id = _user_id;
$$;

-- prediction_logs
CREATE TABLE IF NOT EXISTS public.prediction_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL,
  custom_prediction_id UUID,
  input_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  reliability_avg NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prediction_logs TO authenticated;
GRANT ALL ON public.prediction_logs TO service_role;
ALTER TABLE public.prediction_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users insert own prediction logs" ON public.prediction_logs;
CREATE POLICY "Users insert own prediction logs" ON public.prediction_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users read own prediction logs" ON public.prediction_logs;
CREATE POLICY "Users read own prediction logs" ON public.prediction_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins read all prediction logs" ON public.prediction_logs;
CREATE POLICY "Admins read all prediction logs" ON public.prediction_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins delete prediction logs" ON public.prediction_logs;
CREATE POLICY "Admins delete prediction logs" ON public.prediction_logs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS prediction_logs_user_idx ON public.prediction_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS prediction_logs_mode_idx ON public.prediction_logs(mode, created_at DESC);

-- custom_predictions
CREATE TABLE IF NOT EXISTS public.custom_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'sparkles',
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_subscription BOOLEAN NOT NULL DEFAULT false,
  subscription_key TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_predictions TO authenticated;
GRANT ALL ON public.custom_predictions TO service_role;
ALTER TABLE public.custom_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read active custom predictions" ON public.custom_predictions;
CREATE POLICY "Authenticated read active custom predictions" ON public.custom_predictions FOR SELECT TO authenticated USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins manage custom predictions" ON public.custom_predictions;
CREATE POLICY "Admins manage custom predictions" ON public.custom_predictions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP TRIGGER IF EXISTS update_custom_predictions_updated_at ON public.custom_predictions;
CREATE TRIGGER update_custom_predictions_updated_at BEFORE UPDATE ON public.custom_predictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- app_config
CREATE TABLE IF NOT EXISTS public.app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT false,
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS app_config_version_idx ON public.app_config(version);
CREATE INDEX IF NOT EXISTS app_config_active_idx ON public.app_config(is_active) WHERE is_active = true;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can read configs" ON public.app_config;
CREATE POLICY "Anyone authenticated can read configs" ON public.app_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage configs" ON public.app_config;
CREATE POLICY "Admins manage configs" ON public.app_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.ensure_single_active_config()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.app_config SET is_active = false WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_single_active_config ON public.app_config;
CREATE TRIGGER trg_single_active_config
  AFTER INSERT OR UPDATE OF is_active ON public.app_config
  FOR EACH ROW WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.ensure_single_active_config();

DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config; EXCEPTION WHEN duplicate_object THEN NULL; END; END $$;
ALTER TABLE public.app_config REPLICA IDENTITY FULL;

INSERT INTO public.app_config (version, config, is_active, notes)
SELECT 1, '{"theme":{},"home":{"banners":[],"sections":[]},"games":{}}'::jsonb, true, 'Initial empty config'
WHERE NOT EXISTS (SELECT 1 FROM public.app_config);

-- ai_config_logs
CREATE TABLE IF NOT EXISTS public.ai_config_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  prompt text NOT NULL,
  response jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  config_id uuid REFERENCES public.app_config(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_config_logs TO authenticated;
GRANT ALL ON public.ai_config_logs TO service_role;
ALTER TABLE public.ai_config_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage ai logs" ON public.ai_config_logs;
CREATE POLICY "Admins manage ai logs" ON public.ai_config_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add columns + revenue function
ALTER TABLE public.game_access
  ADD COLUMN IF NOT EXISTS price_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_requested INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.password_reset_requests
  ADD COLUMN IF NOT EXISTS reset_code TEXT,
  ADD COLUMN IF NOT EXISTS new_password TEXT;

CREATE OR REPLACE FUNCTION public.get_total_revenue()
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(price_amount), 0)::numeric
  FROM public.game_access
  WHERE granted_by IS NOT NULL;
$$;

-- Protected admin auto role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Joueur'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Joueur'),
    COALESCE(NEW.email, '')
  ) ON CONFLICT (user_id) DO NOTHING;
  IF NEW.email IN ('randriamalalamahandryhery@gmail.com', 'aviatorgamespredictor@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email IN ('randriamalalamahandryhery@gmail.com', 'aviatorgamespredictor@gmail.com')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin');

-- Payment-proofs bucket tightening
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Payment proofs are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can list payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own proofs" ON storage.objects;
CREATE POLICY "Users can view their own proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (auth.uid())::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can upload their own proofs" ON storage.objects;
CREATE POLICY "Users can upload their own proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (auth.uid())::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can update their own proofs" ON storage.objects;
CREATE POLICY "Users can update their own proofs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-proofs' AND (auth.uid())::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can delete their own proofs" ON storage.objects;
CREATE POLICY "Users can delete their own proofs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((auth.uid())::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins can view all proofs" ON storage.objects;
CREATE POLICY "Admins can view all proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'admin'::app_role));
