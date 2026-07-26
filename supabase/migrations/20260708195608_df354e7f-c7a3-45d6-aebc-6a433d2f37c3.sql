-- Role enum
DO $wrap$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin', 'user'); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  is_validated boolean NOT NULL DEFAULT false,
  device_id text,
  last_seen_at timestamptz,
  login_count integer NOT NULL DEFAULT 0,
  device_info text,
  location text,
  full_name text,
  country_code text,
  region text,
  birth_date text,
  avatar_url text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('Expert', 'Professionnel')),
  input_time TEXT NOT NULL,
  input_coefficient NUMERIC NOT NULL,
  results JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout')),
  device_info text,
  session_id text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_history TO authenticated;
GRANT ALL ON public.login_history TO service_role;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS login_history_user_id_created_at_idx ON public.login_history (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_name text NOT NULL,
  code_value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activation_codes TO authenticated;
GRANT ALL ON public.activation_codes TO service_role;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.app_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Mise à jour',
  update_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_updates TO authenticated;
GRANT ALL ON public.app_updates TO service_role;
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.game_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_mode text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid,
  payment_proof_url text,
  price_amount NUMERIC NOT NULL DEFAULT 0,
  days_requested INTEGER NOT NULL DEFAULT 0,
  rejection_reason text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_access TO authenticated;
GRANT ALL ON public.game_access TO service_role;
ALTER TABLE public.game_access ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_game_access_active_expires ON public.game_access (is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_game_access_user ON public.game_access (user_id);

CREATE TABLE IF NOT EXISTS public.game_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_name text NOT NULL,
  game_mode text,
  used_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_usage TO authenticated;
GRANT ALL ON public.game_usage TO service_role;
ALTER TABLE public.game_usage ENABLE ROW LEVEL SECURITY;

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  resolved_by uuid,
  resolved_at timestamptz,
  reset_code TEXT,
  new_password TEXT,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.password_reset_requests TO authenticated;
GRANT INSERT ON public.password_reset_requests TO anon;
GRANT ALL ON public.password_reset_requests TO service_role;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.protected_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protected_admins TO authenticated;
GRANT ALL ON public.protected_admins TO service_role;
ALTER TABLE public.protected_admins ENABLE ROW LEVEL SECURITY;

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_requests TO authenticated;
GRANT ALL ON public.reward_requests TO service_role;
ALTER TABLE public.reward_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 1,
  reason text NOT NULL DEFAULT 'game_play',
  game_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_points TO authenticated;
GRANT ALL ON public.user_points TO service_role;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.online_users (
  user_id UUID PRIMARY KEY,
  last_ping TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.online_users TO authenticated;
GRANT ALL ON public.online_users TO service_role;
ALTER TABLE public.online_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_users REPLICA IDENTITY FULL;

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
CREATE INDEX IF NOT EXISTS prediction_logs_user_idx ON public.prediction_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS prediction_logs_mode_idx ON public.prediction_logs(mode, created_at DESC);

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
ALTER TABLE public.app_config REPLICA IDENTITY FULL;

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

CREATE TABLE IF NOT EXISTS public.football_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.football_cache TO authenticated;
GRANT ALL ON public.football_cache TO service_role;
ALTER TABLE public.football_cache ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_football_cache_expires ON public.football_cache(expires_at);

CREATE TABLE IF NOT EXISTS public.live_fixtures (
  fixture_id BIGINT PRIMARY KEY,
  league_id BIGINT,
  league_name TEXT,
  league_logo TEXT,
  country TEXT,
  home_id BIGINT,
  home_name TEXT,
  home_logo TEXT,
  away_id BIGINT,
  away_name TEXT,
  away_logo TEXT,
  home_goals INTEGER,
  away_goals INTEGER,
  status_short TEXT,
  status_long TEXT,
  minute INTEGER,
  raw JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_fixtures TO authenticated;
GRANT ALL ON public.live_fixtures TO service_role;
ALTER TABLE public.live_fixtures ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_live_fixtures_status ON public.live_fixtures(status_short);
CREATE INDEX IF NOT EXISTS idx_live_fixtures_updated ON public.live_fixtures(updated_at);
ALTER TABLE public.live_fixtures REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS public.user_coins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_granted NUMERIC NOT NULL DEFAULT 0,
  total_consumed NUMERIC NOT NULL DEFAULT 0,
  plan_type TEXT NOT NULL DEFAULT 'free',
  plan_started_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ,
  consumption_rate_per_hour NUMERIC NOT NULL DEFAULT 0,
  last_consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_coins TO authenticated;
GRANT ALL ON public.user_coins TO service_role;
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS user_coins_user_id_idx ON public.user_coins (user_id);

CREATE TABLE IF NOT EXISTS public.gen_store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  thumbnail_url TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gen_store_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gen_store_items TO authenticated;
GRANT ALL ON public.gen_store_items TO service_role;
ALTER TABLE public.gen_store_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_gen_store_items_category ON public.gen_store_items(category);
CREATE INDEX IF NOT EXISTS idx_gen_store_items_created_at ON public.gen_store_items(created_at DESC);

CREATE TABLE IF NOT EXISTS public.gen_store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.gen_store_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, user_id)
);
GRANT SELECT ON public.gen_store_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gen_store_reviews TO authenticated;
GRANT ALL ON public.gen_store_reviews TO service_role;
ALTER TABLE public.gen_store_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_gen_store_reviews_item_id ON public.gen_store_reviews(item_id);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  title text,
  avatar_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  last_read_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = _conv AND user_id = _user)
$$;

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_conv ON public.conversation_members(conversation_id);

CREATE TABLE IF NOT EXISTS public.global_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, DELETE ON public.global_chat_messages TO authenticated;
GRANT ALL ON public.global_chat_messages TO service_role;
ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_chat_messages REPLICA IDENTITY FULL;
CREATE INDEX IF NOT EXISTS global_chat_messages_created_at_idx ON public.global_chat_messages (created_at DESC);

-- ============ POLICIES ============
DO $wrap$ BEGIN CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Users can read own predictions" ON public.predictions FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can insert own predictions" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can read all predictions" ON public.predictions FOR SELECT USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can delete predictions" ON public.predictions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Authenticated can read settings" ON public.app_settings FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can insert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Users can read own login history" ON public.login_history FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can insert own login history" ON public.login_history FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can read all login history" ON public.login_history FOR SELECT USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can delete login history" ON public.login_history FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can insert login history" ON public.login_history FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Authenticated can read codes" ON public.activation_codes FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can manage codes" ON public.activation_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Authenticated can read updates" ON public.app_updates FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can manage updates" ON public.app_updates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Users can insert own chat" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can read own chat" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can manage chat" ON public.chat_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Users can read own access" ON public.game_access FOR SELECT TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can insert own access" ON public.game_access FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can manage access" ON public.game_access FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Users can insert own usage" ON public.game_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can read own usage" ON public.game_usage FOR SELECT TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can read all usage" ON public.game_usage FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Authenticated can read notifications" ON public.notifications FOR SELECT TO authenticated USING (is_global = true OR target_user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Users can insert own reset" ON public.password_reset_requests FOR INSERT TO authenticated WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Anon can insert reset" ON public.password_reset_requests FOR INSERT TO anon WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can manage resets" ON public.password_reset_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Authenticated can read protected admins" ON public.protected_admins FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can manage protected admins" ON public.protected_admins FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Users can insert own rewards" ON public.reward_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can read own rewards" ON public.reward_requests FOR SELECT TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can manage rewards" ON public.reward_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Users can insert own points" ON public.user_points FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can read own points" ON public.user_points FOR SELECT TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can manage points" ON public.user_points FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Authenticated can read online" ON public.online_users FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users upsert own presence" ON public.online_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users update own presence" ON public.online_users FOR UPDATE TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users delete own presence" ON public.online_users FOR DELETE TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Users insert own prediction logs" ON public.prediction_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users read own prediction logs" ON public.prediction_logs FOR SELECT TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins read all prediction logs" ON public.prediction_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins delete prediction logs" ON public.prediction_logs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Authenticated read active custom predictions" ON public.custom_predictions FOR SELECT TO authenticated USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins manage custom predictions" ON public.custom_predictions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Anyone authenticated can read configs" ON public.app_config FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins manage configs" ON public.app_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Admins manage ai logs" ON public.ai_config_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role)); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Authenticated can read cache" ON public.football_cache FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Authenticated can read live fixtures" ON public.live_fixtures FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Users can view their own coins" ON public.user_coins FOR SELECT TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can insert their own coins row" ON public.user_coins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can update their own coins" ON public.user_coins FOR UPDATE TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can view all coins" ON public.user_coins FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can manage all coins" ON public.user_coins FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Everyone can view published items" ON public.gen_store_items FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can insert items" ON public.gen_store_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can update items" ON public.gen_store_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can delete items" ON public.gen_store_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Everyone can view reviews" ON public.gen_store_reviews FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can insert their own reviews" ON public.gen_store_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can update their own reviews" ON public.gen_store_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can delete their own reviews" ON public.gen_store_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "members view conversations" ON public.conversations FOR SELECT TO authenticated USING (public.is_conversation_member(id, auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "users create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "creator updates conversations" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_conversation_member(id, auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "members see members" ON public.conversation_members FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id, auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "users join or be added" ON public.conversation_members FOR INSERT TO authenticated WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "user updates own membership" ON public.conversation_members FOR UPDATE TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "user leaves" ON public.conversation_members FOR DELETE TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "members read messages" ON public.messages FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id, auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "members send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "sender edits own messages" ON public.messages FOR UPDATE TO authenticated USING (sender_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "sender deletes own messages" ON public.messages FOR DELETE TO authenticated USING (sender_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

DO $wrap$ BEGIN CREATE POLICY "Authenticated can read global chat" ON public.global_chat_messages FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Authenticated can send messages" ON public.global_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Authors can delete own messages" ON public.global_chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

-- Triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_custom_predictions_updated_at ON public.custom_predictions;
CREATE TRIGGER update_custom_predictions_updated_at BEFORE UPDATE ON public.custom_predictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_user_coins_updated_at ON public.user_coins;
CREATE TRIGGER update_user_coins_updated_at BEFORE UPDATE ON public.user_coins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_gen_store_items_updated_at ON public.gen_store_items;
CREATE TRIGGER update_gen_store_items_updated_at BEFORE UPDATE ON public.gen_store_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_gen_store_reviews_updated_at ON public.gen_store_reviews;
CREATE TRIGGER update_gen_store_reviews_updated_at BEFORE UPDATE ON public.gen_store_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
CREATE TRIGGER trg_single_active_config AFTER INSERT OR UPDATE OF is_active ON public.app_config
  FOR EACH ROW WHEN (NEW.is_active = true) EXECUTE FUNCTION public.ensure_single_active_config();

CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = now(), updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_bump_conv ON public.messages;
CREATE TRIGGER trg_bump_conv AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, name, email, is_validated)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Joueur'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Joueur'),
    COALESCE(NEW.email, ''),
    CASE WHEN NEW.email IN ('randriamalalamahandryhery@gmail.com', 'aviatorgamespredictor@gmail.com') THEN true ELSE false END
  ) ON CONFLICT (user_id) DO NOTHING;
  IF NEW.email IN ('randriamalalamahandryhery@gmail.com', 'aviatorgamespredictor@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.protected_admins (user_id, email) VALUES (NEW.id, NEW.email) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.get_total_revenue()
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(price_amount), 0)::numeric FROM public.game_access WHERE granted_by IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_active_device(_user_id uuid)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT device_id FROM public.profiles WHERE user_id = _user_id;
$$;

-- Realtime
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.activation_codes; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.game_access; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.game_usage; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_points; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.app_updates; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.online_users; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.live_fixtures; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_coins; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gen_store_items; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gen_store_reviews; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_messages; EXCEPTION WHEN others THEN NULL; END $wrap$;

-- Seed
INSERT INTO public.app_settings (key, value) VALUES ('validation_code', 'Team KLS') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.activation_codes (code_name, code_value) VALUES
  ('basic', ''), ('app_access', ''),
  ('sub_aviator_premium', 'enabled'), ('sub_aviator_pro', 'enabled'),
  ('sub_cosmox', 'enabled'), ('sub_jetx', 'enabled'),
  ('sub_virtuel', 'enabled'), ('sub_aviator_studio', 'enabled'),
  ('sub_aviator_spribe', 'enabled'),
  ('seconds_basic', 'disabled'), ('seconds_pro', 'disabled'),
  ('seconds_premium', 'disabled'), ('seconds_cosmox', 'disabled'),
  ('seconds_jetx', 'disabled'), ('seconds_virtuel', 'disabled'),
  ('league_english', 'enabled'), ('league_africa', 'enabled'),
  ('league_champions', 'enabled'), ('league_italian', 'enabled'),
  ('league_spanish', 'enabled'), ('league_french', 'enabled'),
  ('league_german', 'enabled'), ('league_portuguese', 'enabled')
ON CONFLICT DO NOTHING;
INSERT INTO public.app_config (version, config, is_active, notes)
SELECT 1, '{"theme":{},"home":{"banners":[],"sections":[]},"games":{}}'::jsonb, true, 'Initial empty config'
WHERE NOT EXISTS (SELECT 1 FROM public.app_config);