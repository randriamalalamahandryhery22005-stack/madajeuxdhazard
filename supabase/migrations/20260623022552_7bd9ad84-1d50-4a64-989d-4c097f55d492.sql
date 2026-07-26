
CREATE POLICY "Anyone can read gen-store files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gen-store');

CREATE POLICY "Admins can upload gen-store files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gen-store' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update gen-store files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gen-store' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gen-store files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gen-store' AND public.has_role(auth.uid(), 'admin'));
