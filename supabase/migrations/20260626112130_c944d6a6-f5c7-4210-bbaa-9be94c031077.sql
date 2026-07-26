
CREATE POLICY "auth upload chat files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files');
CREATE POLICY "auth read chat files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files');
CREATE POLICY "owner delete chat files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-files' AND owner = auth.uid());
