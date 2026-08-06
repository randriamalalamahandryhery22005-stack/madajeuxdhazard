CREATE TABLE IF NOT EXISTS public.device_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, user_id)
);

GRANT SELECT, INSERT ON public.device_accounts TO authenticated;
GRANT ALL ON public.device_accounts TO service_role;

ALTER TABLE public.device_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own device links"
  ON public.device_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can register their own device link"
  ON public.device_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS device_accounts_device_idx ON public.device_accounts (device_id);

-- Nombre de comptes déjà créés depuis un appareil (appelable avant connexion)
CREATE OR REPLACE FUNCTION public.device_account_count(_device_id text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::int
  FROM public.device_accounts
  WHERE _device_id IS NOT NULL AND _device_id <> '' AND device_id = _device_id;
$$;

REVOKE ALL ON FUNCTION public.device_account_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.device_account_count(text) TO anon, authenticated, service_role;

-- Enregistre l'appareil pour le compte courant
CREATE OR REPLACE FUNCTION public.register_device_account(_device_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR _device_id IS NULL OR _device_id = '' THEN RETURN; END IF;
  INSERT INTO public.device_accounts (device_id, user_id)
  VALUES (_device_id, auth.uid())
  ON CONFLICT (device_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.register_device_account(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_device_account(text) TO authenticated, service_role;

-- Détecte une usurpation d'informations (nom ou numéro déjà utilisés)
CREATE OR REPLACE FUNCTION public.profile_info_conflict(_name text, _phone text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (_name IS NOT NULL AND btrim(_name) <> '' AND lower(btrim(COALESCE(p.full_name, p.name, ''))) = lower(btrim(_name)))
        OR (_phone IS NOT NULL AND btrim(_phone) <> '' AND regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') = regexp_replace(_phone, '[^0-9]', '', 'g'))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.profile_info_conflict(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_info_conflict(text, text) TO authenticated, service_role;