CREATE TABLE IF NOT EXISTS public.account_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  step integer NOT NULL DEFAULT 1,
  id_photo_path text,
  personal_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmed boolean NOT NULL DEFAULT false,
  reject_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_reviews TO authenticated;
GRANT ALL ON public.account_reviews TO service_role;

ALTER TABLE public.account_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own review select" ON public.account_reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "own review insert" ON public.account_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "own review update" ON public.account_reviews
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid() AND status <> 'pending') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin review delete" ON public.account_reviews
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_account_reviews_updated_at
  BEFORE UPDATE ON public.account_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "verification own insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "verification own select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'verification' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "verification own update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "verification own delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'verification' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));