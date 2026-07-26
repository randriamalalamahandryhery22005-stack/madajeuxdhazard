-- Add monetary tracking columns to game_access
ALTER TABLE public.game_access
  ADD COLUMN IF NOT EXISTS price_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_requested integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Index for revenue queries
CREATE INDEX IF NOT EXISTS idx_game_access_active_expires ON public.game_access (is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_game_access_user ON public.game_access (user_id);

-- Function: get total revenue (sum of price_amount of approved subscriptions)
CREATE OR REPLACE FUNCTION public.get_total_revenue()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(price_amount), 0)::bigint
  FROM public.game_access
  WHERE granted_by IS NOT NULL;
$$;