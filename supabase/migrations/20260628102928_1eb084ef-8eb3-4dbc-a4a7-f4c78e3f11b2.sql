
CREATE OR REPLACE FUNCTION public.consume_user_coins()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  WITH deltas AS (
    SELECT
      uc.user_id,
      LEAST(
        uc.balance,
        GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(uc.last_consumed_at, now()))) / 3600.0)
          * uc.consumption_rate_per_hour
      )::numeric AS delta
    FROM public.user_coins uc
    WHERE uc.consumption_rate_per_hour > 0
      AND uc.last_consumed_at IS NOT NULL
      AND NOT public.has_role(uc.user_id, 'admin'::app_role)
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
$function$;
