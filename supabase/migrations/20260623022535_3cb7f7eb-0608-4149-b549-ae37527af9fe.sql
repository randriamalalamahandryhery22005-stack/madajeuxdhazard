
-- =========================================================
-- USER COINS (subscription → coins, progressive consumption)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_coins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_granted NUMERIC NOT NULL DEFAULT 0,
  total_consumed NUMERIC NOT NULL DEFAULT 0,
  plan_type TEXT NOT NULL DEFAULT 'free',
  plan_started_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ,
  consumption_rate_per_hour NUMERIC NOT NULL DEFAULT 0,
  last_consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_coins TO authenticated;
GRANT ALL ON public.user_coins TO service_role;

ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coins"
  ON public.user_coins FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coins row"
  ON public.user_coins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coins"
  ON public.user_coins FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all coins"
  ON public.user_coins FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all coins"
  ON public.user_coins FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_coins_updated_at
  BEFORE UPDATE ON public.user_coins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- GEN STORE ITEMS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.gen_store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  thumbnail_url TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gen_store_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gen_store_items TO authenticated;
GRANT ALL ON public.gen_store_items TO service_role;

ALTER TABLE public.gen_store_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view published items"
  ON public.gen_store_items FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert items"
  ON public.gen_store_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update items"
  ON public.gen_store_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete items"
  ON public.gen_store_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_gen_store_items_updated_at
  BEFORE UPDATE ON public.gen_store_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_gen_store_items_category ON public.gen_store_items(category);
CREATE INDEX IF NOT EXISTS idx_gen_store_items_created_at ON public.gen_store_items(created_at DESC);

-- =========================================================
-- GEN STORE REVIEWS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.gen_store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.gen_store_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, user_id)
);

GRANT SELECT ON public.gen_store_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gen_store_reviews TO authenticated;
GRANT ALL ON public.gen_store_reviews TO service_role;

ALTER TABLE public.gen_store_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view reviews"
  ON public.gen_store_reviews FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reviews"
  ON public.gen_store_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.gen_store_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.gen_store_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_gen_store_reviews_updated_at
  BEFORE UPDATE ON public.gen_store_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_gen_store_reviews_item_id ON public.gen_store_reviews(item_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_coins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gen_store_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gen_store_reviews;
