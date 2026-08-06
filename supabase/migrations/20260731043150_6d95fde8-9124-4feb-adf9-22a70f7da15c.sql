ALTER TABLE public.game_access
  ADD COLUMN IF NOT EXISTS days_requested integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

DROP POLICY IF EXISTS "Anyone authenticated can insert items" ON public.gen_store_items;
DROP POLICY IF EXISTS "Anyone authenticated can update items" ON public.gen_store_items;
DROP POLICY IF EXISTS "Anyone authenticated can delete items" ON public.gen_store_items;

CREATE POLICY "Anyone authenticated can insert items"
  ON public.gen_store_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone authenticated can update items"
  ON public.gen_store_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone authenticated can delete items"
  ON public.gen_store_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gen_store_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_access TO authenticated;
GRANT ALL ON public.gen_store_items TO service_role;
GRANT ALL ON public.game_access TO service_role;

DROP POLICY IF EXISTS "gen store admin write" ON storage.objects;
DROP POLICY IF EXISTS "gen store admin update" ON storage.objects;
DROP POLICY IF EXISTS "gen store admin delete" ON storage.objects;
DROP POLICY IF EXISTS "gen store write auth" ON storage.objects;
DROP POLICY IF EXISTS "gen store update auth" ON storage.objects;
DROP POLICY IF EXISTS "gen store delete auth" ON storage.objects;

CREATE POLICY "gen store write auth" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gen-store');
CREATE POLICY "gen store update auth" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gen-store') WITH CHECK (bucket_id = 'gen-store');
CREATE POLICY "gen store delete auth" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gen-store');