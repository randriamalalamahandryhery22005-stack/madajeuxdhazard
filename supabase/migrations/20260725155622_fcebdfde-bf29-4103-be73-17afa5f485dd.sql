
CREATE POLICY "chat-files authenticated read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files');

CREATE POLICY "chat-files owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-files owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-files owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-files' AND (auth.uid())::text = (storage.foldername(name))[1]);
