
-- Reactions
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
DROP POLICY IF EXISTS "reactions_select_all" ON public.chat_message_reactions;
CREATE POLICY "reactions_select_all" ON public.chat_message_reactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reactions_insert_own" ON public.chat_message_reactions;
CREATE POLICY "reactions_insert_own" ON public.chat_message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reactions_delete_own_or_admin" ON public.chat_message_reactions;
CREATE POLICY "reactions_delete_own_or_admin" ON public.chat_message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_chat_reactions_msg ON public.chat_message_reactions(message_id);

-- Read receipts
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
DROP POLICY IF EXISTS "reads_select_all" ON public.chat_message_reads;
CREATE POLICY "reads_select_all" ON public.chat_message_reads FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reads_insert_own" ON public.chat_message_reads;
CREATE POLICY "reads_insert_own" ON public.chat_message_reads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_chat_reads_msg ON public.chat_message_reads(message_id);

-- Allow admin to delete any global chat message
DROP POLICY IF EXISTS "chat_delete_admin" ON public.global_chat_messages;
CREATE POLICY "chat_delete_admin" ON public.global_chat_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reads;
