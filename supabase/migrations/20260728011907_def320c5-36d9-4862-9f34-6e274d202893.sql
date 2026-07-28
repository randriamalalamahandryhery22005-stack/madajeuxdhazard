ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

DROP POLICY IF EXISTS "users join or be added" ON public.conversation_members;
DROP POLICY IF EXISTS "Members added by creator or existing member" ON public.conversation_members;
CREATE POLICY "Members added by creator or existing member"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_members.conversation_id
      AND c.created_by = auth.uid()
  )
  OR public.is_conversation_member(conversation_members.conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Anyone authenticated can insert items" ON public.gen_store_items;
DROP POLICY IF EXISTS "Anyone authenticated can update items" ON public.gen_store_items;
DROP POLICY IF EXISTS "Anyone authenticated can delete items" ON public.gen_store_items;

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.relname);
  END LOOP;
END $$;

GRANT SELECT ON public.gen_store_items TO anon;
GRANT SELECT ON public.gen_store_reviews TO anon;
GRANT INSERT ON public.password_reset_requests TO anon;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated can read protected admins" ON public.protected_admins;

DROP POLICY IF EXISTS "Authenticated can read codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Authenticated can read public codes" ON public.activation_codes;
CREATE POLICY "Authenticated can read public codes"
  ON public.activation_codes
  FOR SELECT
  TO authenticated
  USING (
    code_name LIKE 'seconds_%'
    OR code_name LIKE 'sub_%'
    OR code_name IN ('basic')
  );

DROP POLICY IF EXISTS "Anon can insert reset" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Users can insert own reset" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Anyone can request password reset (validated)" ON public.password_reset_requests;
CREATE POLICY "Anyone can request password reset (validated)"
  ON public.password_reset_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_identifier IS NOT NULL
    AND length(btrim(user_identifier)) BETWEEN 3 AND 254
    AND status = 'pending'
  );