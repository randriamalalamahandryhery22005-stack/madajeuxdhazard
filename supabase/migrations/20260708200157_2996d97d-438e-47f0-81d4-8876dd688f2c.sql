
DROP POLICY IF EXISTS "chat_files_read" ON storage.objects;
CREATE POLICY "chat_files_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "chat_files_upload_own" ON storage.objects;
CREATE POLICY "chat_files_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chat_files_delete_own" ON storage.objects;
CREATE POLICY "chat_files_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-files' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
