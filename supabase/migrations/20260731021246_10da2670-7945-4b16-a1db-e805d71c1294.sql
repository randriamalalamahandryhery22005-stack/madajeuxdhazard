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

CREATE TABLE IF NOT EXISTS public.voice_call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.voice_calls(id) ON DELETE CASCADE,
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('offer','answer','ice')),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_call_signals TO authenticated;
GRANT ALL ON public.voice_call_signals TO service_role;
ALTER TABLE public.voice_call_signals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.voice_call_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  title text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_call_rooms TO authenticated;
GRANT ALL ON public.voice_call_rooms TO service_role;
ALTER TABLE public.voice_call_rooms ENABLE ROW LEVEL SECURITY;

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

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = _conv AND user_id = _user)
$$;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = now(), updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_bump_conv ON public.messages;
CREATE TRIGGER trg_bump_conv AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_conv ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_voice_signals_call ON public.voice_call_signals(call_id, created_at);

DROP POLICY IF EXISTS "members view conversations" ON public.conversations;
CREATE POLICY "members view conversations" ON public.conversations FOR SELECT TO authenticated USING (public.is_conversation_member(id, auth.uid()));
DROP POLICY IF EXISTS "users create conversations" ON public.conversations;
CREATE POLICY "users create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "creator updates conversations" ON public.conversations;
CREATE POLICY "creator updates conversations" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_conversation_member(id, auth.uid()));

DROP POLICY IF EXISTS "members see members" ON public.conversation_members;
CREATE POLICY "members see members" ON public.conversation_members FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "Members added by creator or existing member" ON public.conversation_members;
CREATE POLICY "Members added by creator or existing member" ON public.conversation_members FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_members.conversation_id AND c.created_by = auth.uid())
  OR public.is_conversation_member(conversation_members.conversation_id, auth.uid())
);
DROP POLICY IF EXISTS "user updates own membership" ON public.conversation_members;
CREATE POLICY "user updates own membership" ON public.conversation_members FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "user leaves" ON public.conversation_members;
CREATE POLICY "user leaves" ON public.conversation_members FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "members read messages" ON public.messages;
CREATE POLICY "members read messages" ON public.messages FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "members send messages" ON public.messages;
CREATE POLICY "members send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "sender edits own messages" ON public.messages;
CREATE POLICY "sender edits own messages" ON public.messages FOR UPDATE TO authenticated USING (sender_id = auth.uid());
DROP POLICY IF EXISTS "sender deletes own messages" ON public.messages;
CREATE POLICY "sender deletes own messages" ON public.messages FOR DELETE TO authenticated USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Signals read own" ON public.voice_call_signals;
CREATE POLICY "Signals read own" ON public.voice_call_signals FOR SELECT TO authenticated USING (auth.uid() IN (from_user, to_user));
DROP POLICY IF EXISTS "Signals insert own" ON public.voice_call_signals;
CREATE POLICY "Signals insert own" ON public.voice_call_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user);

DROP POLICY IF EXISTS "Authenticated can read calls" ON public.voice_call_rooms;
CREATE POLICY "Authenticated can read calls" ON public.voice_call_rooms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can start call" ON public.voice_call_rooms;
CREATE POLICY "Authenticated can start call" ON public.voice_call_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = initiated_by);
DROP POLICY IF EXISTS "Initiator or admin can end call" ON public.voice_call_rooms;
CREATE POLICY "Initiator or admin can end call" ON public.voice_call_rooms FOR UPDATE TO authenticated
  USING (auth.uid() = initiated_by OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = initiated_by OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins manage ai logs" ON public.ai_config_logs;
CREATE POLICY "Admins manage ai logs" ON public.ai_config_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.app_config ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.app_config ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.app_config ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.app_config ADD COLUMN IF NOT EXISTS prompt text;
ALTER TABLE public.custom_predictions ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.football_cache ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.gen_store_items ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.gen_store_reviews ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS away_goals integer;
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS away_id bigint;
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS away_logo text;
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS away_name text;
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS home_goals integer;
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS home_id bigint;
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS home_logo text;
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS home_name text;
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS league_logo text;
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS raw jsonb;
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS status_long text;
ALTER TABLE public.live_fixtures ADD COLUMN IF NOT EXISTS status_short text;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.password_reset_requests ADD COLUMN IF NOT EXISTS new_password text;
ALTER TABLE public.password_reset_requests ADD COLUMN IF NOT EXISTS reset_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gen_store_last_seen_at timestamptz;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.voice_calls ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL;
ALTER TABLE public.voice_calls ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();