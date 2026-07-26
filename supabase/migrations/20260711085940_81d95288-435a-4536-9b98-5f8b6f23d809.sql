
-- Add gen_store_last_seen_at to profiles for unread store badge
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gen_store_last_seen_at TIMESTAMPTZ DEFAULT NULL;

-- Ensure realtime publication covers the chat + store tables (idempotent)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_messages';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reads';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.gen_store_items';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

-- Ensure REPLICA IDENTITY FULL so payloads include row identity
ALTER TABLE public.global_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_reads REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.gen_store_items REPLICA IDENTITY FULL;
