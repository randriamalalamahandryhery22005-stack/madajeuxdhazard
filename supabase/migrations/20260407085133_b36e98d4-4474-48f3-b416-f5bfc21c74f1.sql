
-- 1. activation_codes table
CREATE TABLE IF NOT EXISTS public.activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_name text NOT NULL,
  code_value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read codes" ON public.activation_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage codes" ON public.activation_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. app_updates table
CREATE TABLE IF NOT EXISTS public.app_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Mise à jour',
  update_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read updates" ON public.app_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage updates" ON public.app_updates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_mode text NOT NULL,
  message text,
  image_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own chat" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own chat" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage chat" ON public.chat_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. game_access table
CREATE TABLE IF NOT EXISTS public.game_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_mode text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid,
  payment_proof_url text
);
ALTER TABLE public.game_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own access" ON public.game_access FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own access" ON public.game_access FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage access" ON public.game_access FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. game_usage table
CREATE TABLE IF NOT EXISTS public.game_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_name text NOT NULL,
  game_mode text,
  used_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.game_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own usage" ON public.game_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own usage" ON public.game_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all usage" ON public.game_usage FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  is_global boolean NOT NULL DEFAULT true,
  is_read boolean NOT NULL DEFAULT false,
  target_user_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read notifications" ON public.notifications FOR SELECT TO authenticated USING (is_global = true OR target_user_id = auth.uid());
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. password_reset_requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own reset" ON public.password_reset_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon can insert reset" ON public.password_reset_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins can manage resets" ON public.password_reset_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. protected_admins table
CREATE TABLE IF NOT EXISTS public.protected_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.protected_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read protected admins" ON public.protected_admins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage protected admins" ON public.protected_admins FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. reward_requests table
CREATE TABLE IF NOT EXISTS public.reward_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_game text NOT NULL,
  requested_days integer NOT NULL DEFAULT 7,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reward_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own rewards" ON public.reward_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own rewards" ON public.reward_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage rewards" ON public.reward_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. user_points table
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 1,
  reason text NOT NULL DEFAULT 'game_play',
  game_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own points" ON public.user_points FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own points" ON public.user_points FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage points" ON public.user_points FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 11. Add new columns to profiles table (if not exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='full_name') THEN
    ALTER TABLE public.profiles ADD COLUMN full_name text;
    UPDATE public.profiles SET full_name = name WHERE full_name IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='country_code') THEN
    ALTER TABLE public.profiles ADD COLUMN country_code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='region') THEN
    ALTER TABLE public.profiles ADD COLUMN region text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='birth_date') THEN
    ALTER TABLE public.profiles ADD COLUMN birth_date text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

-- 12. Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.activation_codes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_access;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_usage;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_points;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 13. Update handle_new_user function to match new schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, full_name, is_validated)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    CASE WHEN NEW.email IN ('randriamalalamahandryhery@gmail.com', 'aviatorgamespredictor@gmail.com') THEN true ELSE false END
  );
  
  IF NEW.email IN ('randriamalalamahandryhery@gmail.com', 'aviatorgamespredictor@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    INSERT INTO public.protected_admins (user_id, email) VALUES (NEW.id, NEW.email)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;

-- 14. Seed initial activation codes
INSERT INTO public.activation_codes (code_name, code_value) VALUES
  ('basic', ''),
  ('app_access', ''),
  ('sub_aviator_premium', 'enabled'),
  ('sub_aviator_pro', 'enabled'),
  ('sub_cosmox', 'enabled'),
  ('sub_jetx', 'enabled'),
  ('sub_virtuel', 'enabled'),
  ('sub_aviator_studio', 'enabled'),
  ('sub_aviator_spribe', 'enabled'),
  ('seconds_basic', 'disabled'),
  ('seconds_pro', 'disabled'),
  ('seconds_premium', 'disabled'),
  ('seconds_cosmox', 'disabled'),
  ('seconds_jetx', 'disabled'),
  ('seconds_virtuel', 'disabled'),
  ('league_english', 'enabled'),
  ('league_africa', 'enabled'),
  ('league_champions', 'enabled'),
  ('league_italian', 'enabled'),
  ('league_spanish', 'enabled'),
  ('league_french', 'enabled'),
  ('league_german', 'enabled'),
  ('league_portuguese', 'enabled')
ON CONFLICT DO NOTHING;

-- 15. Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload payment proofs" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view payment proofs" ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');
