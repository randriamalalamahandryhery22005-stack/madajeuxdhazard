DROP POLICY IF EXISTS "Users can edit own chat messages" ON public.global_chat_messages;
CREATE POLICY "Users can edit own chat messages"
ON public.global_chat_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));