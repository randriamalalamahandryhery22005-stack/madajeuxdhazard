-- ============================================================
-- Boutique (J&H Store) — à exécuter dans Supabase → SQL Editor
-- Rend la boutique entièrement fonctionnelle :
--  • stockage "gen-store" public (téléchargements sans restriction)
--  • publication ouverte à tout utilisateur connecté
--  • lecture des publications ouverte à tous
-- ============================================================

-- 1. Bucket public, sans limite de type de fichier
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('gen-store', 'gen-store', true, NULL, NULL)
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = NULL, allowed_mime_types = NULL;

-- 2. Politiques de stockage
DROP POLICY IF EXISTS "J&H Store read" ON storage.objects;
DROP POLICY IF EXISTS "J&H Store write" ON storage.objects;
DROP POLICY IF EXISTS "J&H Store update" ON storage.objects;
DROP POLICY IF EXISTS "J&H Store delete" ON storage.objects;

CREATE POLICY "J&H Store read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'gen-store');

CREATE POLICY "J&H Store write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gen-store');

CREATE POLICY "J&H Store update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gen-store') WITH CHECK (bucket_id = 'gen-store');

CREATE POLICY "J&H Store delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gen-store' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 3. Publications : lecture publique, écriture pour les connectés
DROP POLICY IF EXISTS "Anyone authenticated can view items" ON public.gen_store_items;
DROP POLICY IF EXISTS "Anyone authenticated can insert items" ON public.gen_store_items;
DROP POLICY IF EXISTS "Anyone authenticated can update items" ON public.gen_store_items;
DROP POLICY IF EXISTS "Anyone authenticated can delete items" ON public.gen_store_items;

CREATE POLICY "Store items readable by everyone"
  ON public.gen_store_items FOR SELECT TO anon, authenticated
  USING (is_published = true OR created_by = auth.uid());

CREATE POLICY "Authenticated can publish items"
  ON public.gen_store_items FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- compteur de téléchargements + édition de ses propres contenus
CREATE POLICY "Authenticated can update items"
  ON public.gen_store_items FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Owners can delete their items"
  ON public.gen_store_items FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.gen_store_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gen_store_items TO authenticated;
GRANT SELECT ON public.gen_store_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gen_store_reviews TO authenticated;
