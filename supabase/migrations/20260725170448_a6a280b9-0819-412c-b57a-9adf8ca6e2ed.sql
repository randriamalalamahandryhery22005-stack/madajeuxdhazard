DROP FUNCTION IF EXISTS public.get_total_revenue();
CREATE OR REPLACE FUNCTION public.get_total_revenue()
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(price_amount), 0)::numeric FROM public.game_access WHERE granted_by IS NOT NULL;
$$;
DROP FUNCTION IF EXISTS public._mig_exec(text);