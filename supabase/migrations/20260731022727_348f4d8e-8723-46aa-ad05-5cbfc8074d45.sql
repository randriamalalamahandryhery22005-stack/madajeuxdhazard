
-- CHAT FILES
CREATE POLICY "chat files insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "chat files read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files');
CREATE POLICY "chat files delete own or admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-files' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- PAYMENT PROOFS
CREATE POLICY "proofs insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "proofs read own or admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "proofs delete own or admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- GEN STORE
CREATE POLICY "gen store read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'gen-store');
CREATE POLICY "gen store admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gen-store' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "gen store admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gen-store' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "gen store admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gen-store' AND public.has_role(auth.uid(), 'admin'));
