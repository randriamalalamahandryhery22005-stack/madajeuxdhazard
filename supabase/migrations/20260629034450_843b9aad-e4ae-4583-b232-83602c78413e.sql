CREATE TABLE IF NOT EXISTS public.global_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, DELETE ON public.global_chat_messages TO authenticated;
GRANT ALL ON public.global_chat_messages TO service_role;

ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read global chat" ON public.global_chat_messages;
CREATE POLICY "Authenticated can read global chat"
  ON public.global_chat_messages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can send messages" ON public.global_chat_messages;
CREATE POLICY "Authenticated can send messages"
  ON public.global_chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authors can delete own messages" ON public.global_chat_messages;
CREATE POLICY "Authors can delete own messages"
  ON public.global_chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS global_chat_messages_created_at_idx
  ON public.global_chat_messages (created_at DESC);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.global_chat_messages REPLICA IDENTITY FULL;