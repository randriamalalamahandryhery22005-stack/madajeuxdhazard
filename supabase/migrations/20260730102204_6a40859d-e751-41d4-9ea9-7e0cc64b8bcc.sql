-- 1) Rétablir les GRANTs manquants sur tout le schéma public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- 2) Fonctions sécurisées pour le code d'accès application
CREATE OR REPLACE FUNCTION public.app_access_code_required()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.activation_codes
    WHERE code_name = 'app_access' AND COALESCE(code_value, '') <> ''
  );
$$;

CREATE OR REPLACE FUNCTION public.verify_app_access_code(_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.activation_codes
    WHERE code_name = 'app_access' AND code_value = _code
  );
$$;

GRANT EXECUTE ON FUNCTION public.app_access_code_required() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_app_access_code(text) TO anon, authenticated, service_role;

-- 3) Le code d'accès ne doit pas être lisible directement par les clients
REVOKE SELECT ON public.activation_codes FROM anon;