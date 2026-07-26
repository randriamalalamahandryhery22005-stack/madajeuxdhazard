-- User coins
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
DO $wrap$ BEGIN CREATE POLICY "Users can view their own coins" ON public.user_coins FOR SELECT TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can insert their own coins row" ON public.user_coins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can update their own coins" ON public.user_coins FOR UPDATE TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can view all coins" ON public.user_coins FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can manage all coins" ON public.user_coins FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DROP TRIGGER IF EXISTS update_user_coins_updated_at ON public.user_coins;
CREATE TRIGGER update_user_coins_updated_at BEFORE UPDATE ON public.user_coins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Gen store items
CREATE TABLE IF NOT EXISTS public.gen_store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  thumbnail_url TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  post_type TEXT NOT NULL DEFAULT 'file',
  link_url TEXT,
  body TEXT,
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
DO $wrap$ BEGIN CREATE POLICY "Everyone can view published items" ON public.gen_store_items FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can insert items" ON public.gen_store_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can update items" ON public.gen_store_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins can delete items" ON public.gen_store_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DROP TRIGGER IF EXISTS update_gen_store_items_updated_at ON public.gen_store_items;
CREATE TRIGGER update_gen_store_items_updated_at BEFORE UPDATE ON public.gen_store_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
DO $wrap$ BEGIN CREATE POLICY "Everyone can view reviews" ON public.gen_store_reviews FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can insert their own reviews" ON public.gen_store_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can update their own reviews" ON public.gen_store_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Users can delete their own reviews" ON public.gen_store_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

-- Conversations, members, messages
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

CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = now(), updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_bump_conv ON public.messages;
CREATE TRIGGER trg_bump_conv AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- Global chat + reactions + reads
CREATE TABLE IF NOT EXISTS public.global_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  image_url TEXT,
  reply_to_id UUID REFERENCES public.global_chat_messages(id) ON DELETE SET NULL,
  created_at timestamptz not null default now(),
  CONSTRAINT global_chat_messages_content_check CHECK (char_length(content) <= 2000)
);
GRANT SELECT, INSERT, DELETE ON public.global_chat_messages TO authenticated;
GRANT ALL ON public.global_chat_messages TO service_role;
ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_chat_messages REPLICA IDENTITY FULL;
CREATE INDEX IF NOT EXISTS global_chat_messages_created_at_idx ON public.global_chat_messages (created_at DESC);
DO $wrap$ BEGIN CREATE POLICY "Authenticated can read global chat" ON public.global_chat_messages FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Authenticated can send messages" ON public.global_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Authors can delete own messages" ON public.global_chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "chat_delete_admin" ON public.global_chat_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.global_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_message_reactions TO authenticated;
GRANT ALL ON public.chat_message_reactions TO service_role;
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_chat_reactions_msg ON public.chat_message_reactions(message_id);
DO $wrap$ BEGIN CREATE POLICY "reactions_select_all" ON public.chat_message_reactions FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "reactions_insert_own" ON public.chat_message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "reactions_delete_own_or_admin" ON public.chat_message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

CREATE TABLE IF NOT EXISTS public.chat_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.global_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_message_reads TO authenticated;
GRANT ALL ON public.chat_message_reads TO service_role;
ALTER TABLE public.chat_message_reads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_chat_reads_msg ON public.chat_message_reads(message_id);
DO $wrap$ BEGIN CREATE POLICY "reads_select_all" ON public.chat_message_reads FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "reads_insert_own" ON public.chat_message_reads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

-- Premium bonuses
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
CREATE INDEX IF NOT EXISTS idx_premium_bonuses_user_active ON public.premium_bonuses(user_id, is_active, expires_at);
ALTER TABLE public.premium_bonuses REPLICA IDENTITY FULL;
DO $wrap$ BEGIN CREATE POLICY "Users read own bonus" ON public.premium_bonuses FOR SELECT TO authenticated USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins read all bonus" ON public.premium_bonuses FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Admins manage bonus" ON public.premium_bonuses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

CREATE OR REPLACE FUNCTION public.has_active_premium_bonus(_user_id uuid)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.premium_bonuses WHERE user_id = _user_id AND is_active = true AND expires_at > now())
$$;

-- Voice calls (1-to-1)
CREATE TABLE IF NOT EXISTS public.voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','accepted','rejected','missed','ended','cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.voice_calls TO authenticated;
GRANT ALL ON public.voice_calls TO service_role;
ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_voice_calls_callee_status ON public.voice_calls(callee_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_calls_caller_status ON public.voice_calls(caller_id, status, created_at DESC);
ALTER TABLE public.voice_calls REPLICA IDENTITY FULL;
DO $wrap$ BEGIN CREATE POLICY "Participants read calls" ON public.voice_calls FOR SELECT TO authenticated USING (auth.uid() IN (caller_id, callee_id)); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Callers insert calls" ON public.voice_calls FOR INSERT TO authenticated WITH CHECK (auth.uid() = caller_id); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Participants update calls" ON public.voice_calls FOR UPDATE TO authenticated USING (auth.uid() IN (caller_id, callee_id)); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DROP TRIGGER IF EXISTS update_voice_calls_updated_at ON public.voice_calls;
CREATE TRIGGER update_voice_calls_updated_at BEFORE UPDATE ON public.voice_calls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.voice_call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.voice_calls(id) ON DELETE CASCADE,
  from_user UUID NOT NULL,
  to_user UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('offer','answer','ice')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.voice_call_signals TO authenticated;
GRANT ALL ON public.voice_call_signals TO service_role;
ALTER TABLE public.voice_call_signals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_voice_signals_call ON public.voice_call_signals(call_id, created_at);
ALTER TABLE public.voice_call_signals REPLICA IDENTITY FULL;
DO $wrap$ BEGIN CREATE POLICY "Signals read own" ON public.voice_call_signals FOR SELECT TO authenticated USING (auth.uid() IN (from_user, to_user)); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Signals insert own" ON public.voice_call_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

-- Group voice call rooms
CREATE TABLE IF NOT EXISTS public.voice_call_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  title TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.voice_call_rooms TO authenticated;
GRANT ALL ON public.voice_call_rooms TO service_role;
ALTER TABLE public.voice_call_rooms ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_call_rooms_single_active ON public.voice_call_rooms ((status)) WHERE status = 'active';
ALTER TABLE public.voice_call_rooms REPLICA IDENTITY FULL;
DO $wrap$ BEGIN CREATE POLICY "Authenticated can read calls" ON public.voice_call_rooms FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Authenticated can start call" ON public.voice_call_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = initiated_by); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;
DO $wrap$ BEGIN CREATE POLICY "Initiator or admin can end call" ON public.voice_call_rooms FOR UPDATE TO authenticated USING (auth.uid() = initiated_by OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = initiated_by OR public.has_role(auth.uid(),'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $wrap$;

-- Profile columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gen_store_last_seen_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
UPDATE public.profiles SET trial_started_at = COALESCE(trial_started_at, created_at, now());

-- Update handle_new_user to include trial_started_at
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, name, email, is_validated, trial_started_at)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Joueur'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Joueur'),
    COALESCE(NEW.email, ''),
    CASE WHEN NEW.email IN ('randriamalalamahandryhery@gmail.com', 'aviatorgamespredictor@gmail.com') THEN true ELSE false END,
    now()
  ) ON CONFLICT (user_id) DO NOTHING;
  IF NEW.email IN ('randriamalalamahandryhery@gmail.com', 'aviatorgamespredictor@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.protected_admins (user_id, email) VALUES (NEW.id, NEW.email) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Realtime
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_coins; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gen_store_items; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gen_store_reviews; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_messages; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reads; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.premium_bonuses; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_calls; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_call_signals; EXCEPTION WHEN others THEN NULL; END $wrap$;
DO $wrap$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_call_rooms; EXCEPTION WHEN others THEN NULL; END $wrap$;