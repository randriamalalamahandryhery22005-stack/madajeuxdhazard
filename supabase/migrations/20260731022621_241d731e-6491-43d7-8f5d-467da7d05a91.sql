
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_barrier = true) AS
SELECT
  p.user_id,
  p.name,
  p.full_name,
  p.avatar_url,
  p.country_code,
  p.region,
  p.gender,
  p.status,
  p.is_validated,
  p.created_at,
  p.last_seen_at
FROM public.profiles p;

ALTER VIEW public.public_profiles SET (security_invoker = false);

GRANT SELECT ON public.public_profiles TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'global_chat_messages','chat_message_reactions','chat_message_reads',
    'messages','conversations','conversation_members',
    'voice_calls','voice_call_signals','voice_call_rooms',
    'reward_requests','premium_bonuses','gen_store_items','login_history'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=t)
       AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t)
    THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    END IF;
  END LOOP;
END $$;
