
DROP POLICY IF EXISTS "Admins can delete items" ON public.gen_store_items;
DROP POLICY IF EXISTS "Admins can insert items" ON public.gen_store_items;
DROP POLICY IF EXISTS "Admins can update items" ON public.gen_store_items;
DROP POLICY IF EXISTS "Everyone can view published items" ON public.gen_store_items;

CREATE POLICY "Anyone authenticated can view items"
  ON public.gen_store_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can insert items"
  ON public.gen_store_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone authenticated can update items"
  ON public.gen_store_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone authenticated can delete items"
  ON public.gen_store_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "J&H Store read" ON storage.objects;
DROP POLICY IF EXISTS "J&H Store write" ON storage.objects;
DROP POLICY IF EXISTS "J&H Store update" ON storage.objects;
DROP POLICY IF EXISTS "J&H Store delete" ON storage.objects;

CREATE POLICY "J&H Store read"
  ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'gen-store');
CREATE POLICY "J&H Store write"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gen-store');
CREATE POLICY "J&H Store update"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'gen-store') WITH CHECK (bucket_id = 'gen-store');
CREATE POLICY "J&H Store delete"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gen-store');
