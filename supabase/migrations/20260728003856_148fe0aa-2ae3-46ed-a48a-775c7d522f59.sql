-- conversation_members : restreindre l'ajout de membres
DROP POLICY IF EXISTS "users join or be added" ON public.conversation_members;

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

-- gen_store_items : réserver l'écriture aux administrateurs
DROP POLICY IF EXISTS "Anyone authenticated can insert items" ON public.gen_store_items;
DROP POLICY IF EXISTS "Anyone authenticated can update items" ON public.gen_store_items;
DROP POLICY IF EXISTS "Anyone authenticated can delete items" ON public.gen_store_items;