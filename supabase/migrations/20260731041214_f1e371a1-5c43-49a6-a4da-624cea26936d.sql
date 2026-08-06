CREATE OR REPLACE FUNCTION public.app_access_code_required()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.activation_codes WHERE code_name = 'app_access' AND COALESCE(code_value, '') <> '');
$fn$;

CREATE OR REPLACE FUNCTION public.verify_app_access_code(_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.activation_codes WHERE code_name = 'app_access' AND code_value = _code);
$fn$;

GRANT EXECUTE ON FUNCTION public.app_access_code_required() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_app_access_code(text) TO anon, authenticated, service_role;
REVOKE SELECT ON public.activation_codes FROM anon;

DROP FUNCTION IF EXISTS public.__import_exec(text);