-- 1) Pièces jointes multiples
ALTER TABLE public.global_chat_messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Storage : chat-files
DROP POLICY IF EXISTS "chat files insert own" ON storage.objects;
DROP POLICY IF EXISTS "chat files read authenticated" ON storage.objects;
DROP POLICY IF EXISTS "chat files delete own or admin" ON storage.objects;
DROP POLICY IF EXISTS "chat files update own" ON storage.objects;

CREATE POLICY "chat files insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "chat files read authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-files');

CREATE POLICY "chat files update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "chat files delete own or admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-files'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
);

-- 3) Storage : payment-proofs
DROP POLICY IF EXISTS "proofs insert own" ON storage.objects;
DROP POLICY IF EXISTS "proofs read own or admin" ON storage.objects;
DROP POLICY IF EXISTS "proofs update own" ON storage.objects;
DROP POLICY IF EXISTS "proofs delete own or admin" ON storage.objects;

CREATE POLICY "proofs insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "proofs read own or admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "proofs update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "proofs delete own or admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
);

-- 4) Messagerie privée admin <-> utilisateur uniquement
CREATE OR REPLACE FUNCTION public.open_admin_dm(_peer uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _conv uuid;
  _me_admin boolean;
  _peer_admin boolean;
BEGIN
  IF _me IS NULL OR _peer IS NULL OR _me = _peer THEN
    RAISE EXCEPTION 'Conversation privée invalide';
  END IF;

  _me_admin := public.has_role(_me, 'admin');
  _peer_admin := public.has_role(_peer, 'admin');

  IF NOT (_me_admin OR _peer_admin) THEN
    RAISE EXCEPTION 'Les messages privés sont réservés aux échanges avec un administrateur';
  END IF;

  SELECT c.id INTO _conv
  FROM public.conversations c
  WHERE c.is_group = false
    AND EXISTS (SELECT 1 FROM public.conversation_members m WHERE m.conversation_id = c.id AND m.user_id = _me)
    AND EXISTS (SELECT 1 FROM public.conversation_members m WHERE m.conversation_id = c.id AND m.user_id = _peer)
    AND (SELECT COUNT(*) FROM public.conversation_members m WHERE m.conversation_id = c.id) = 2
  ORDER BY c.created_at
  LIMIT 1;

  IF _conv IS NOT NULL THEN
    RETURN _conv;
  END IF;

  INSERT INTO public.conversations (is_group, title, created_by)
  VALUES (false, NULL, _me)
  RETURNING id INTO _conv;

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (_conv, _me, CASE WHEN _me_admin THEN 'admin' ELSE 'member' END),
         (_conv, _peer, CASE WHEN _peer_admin THEN 'admin' ELSE 'member' END);

  RETURN _conv;
END;
$$;

REVOKE ALL ON FUNCTION public.open_admin_dm(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_admin_dm(uuid) TO authenticated;

-- 5) Temps réel pour la messagerie privée
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;