
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.consume_user_coins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_coins
  SET
    balance = GREATEST(0, balance - (
      EXTRACT(EPOCH FROM (now() - COALESCE(last_consumed_at, now()))) / 3600.0
    ) * consumption_rate_per_hour),
    total_consumed = total_consumed + LEAST(balance, (
      EXTRACT(EPOCH FROM (now() - COALESCE(last_consumed_at, now()))) / 3600.0
    ) * consumption_rate_per_hour),
    last_consumed_at = now(),
    plan_type = CASE
      WHEN GREATEST(0, balance - (
        EXTRACT(EPOCH FROM (now() - COALESCE(last_consumed_at, now()))) / 3600.0
      ) * consumption_rate_per_hour) <= 0 THEN 'free'
      ELSE plan_type
    END,
    consumption_rate_per_hour = CASE
      WHEN GREATEST(0, balance - (
        EXTRACT(EPOCH FROM (now() - COALESCE(last_consumed_at, now()))) / 3600.0
      ) * consumption_rate_per_hour) <= 0 THEN 0
      ELSE consumption_rate_per_hour
    END
  WHERE consumption_rate_per_hour > 0
    AND last_consumed_at IS NOT NULL;
END;
$$;

-- Unschedule any previous job with the same name (ignore errors)
DO $$
BEGIN
  PERFORM cron.unschedule('consume-user-coins-every-5-min');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'consume-user-coins-every-5-min',
  '*/5 * * * *',
  $$ SELECT public.consume_user_coins(); $$
);
