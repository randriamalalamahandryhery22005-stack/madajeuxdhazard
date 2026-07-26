
CREATE OR REPLACE FUNCTION public.consume_user_coins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  WITH deltas AS (
    SELECT
      user_id,
      LEAST(
        balance,
        GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(last_consumed_at, now()))) / 3600.0)
          * consumption_rate_per_hour
      )::numeric AS delta
    FROM public.user_coins
    WHERE consumption_rate_per_hour > 0
      AND last_consumed_at IS NOT NULL
  )
  UPDATE public.user_coins uc
  SET
    balance = uc.balance - d.delta,
    total_consumed = uc.total_consumed + d.delta,
    last_consumed_at = now(),
    plan_type = CASE WHEN (uc.balance - d.delta) <= 0 THEN 'free' ELSE uc.plan_type END,
    consumption_rate_per_hour = CASE
      WHEN (uc.balance - d.delta) <= 0 THEN 0
      ELSE uc.consumption_rate_per_hour
    END
  FROM deltas d
  WHERE d.user_id = uc.user_id
    AND d.delta > 0;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS profiles_full_name_trgm ON public.profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_name_trgm ON public.profiles USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_email_trgm ON public.profiles USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS user_coins_user_id_idx ON public.user_coins (user_id);
