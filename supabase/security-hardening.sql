-- =====================================================================
-- Durcissement sécurité — Comptes, Administration, Abonnements
-- À exécuter une fois dans l'éditeur SQL du backend.
-- Idempotent : peut être relancé sans risque.
-- =====================================================================
-- 1) game_access      : plus d'auto-attribution d'abonnement Premium
-- 2) game_access      : l'utilisateur peut seulement joindre sa preuve de paiement
-- 3) user_coins       : les soldes ne sont plus modifiables depuis le client
-- 4) activation_codes : le code d'accès application devient secret
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 & 2. game_access
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own access" ON public.game_access;

-- Une demande créée par un utilisateur est TOUJOURS inactive et non validée.
DROP POLICY IF EXISTS "Users can request own access" ON public.game_access;
CREATE POLICY "Users can request own access"
ON public.game_access
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND is_active = false
  AND granted_by IS NULL
  AND rejection_reason IS NULL
);

-- L'utilisateur peut compléter sa propre demande en attente (preuve de paiement).
DROP POLICY IF EXISTS "Users can attach proof to own pending request" ON public.game_access;
CREATE POLICY "Users can attach proof to own pending request"
ON public.game_access
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_active = false AND granted_by IS NULL)
WITH CHECK (auth.uid() = user_id AND is_active = false AND granted_by IS NULL);

-- Garde-fou : seules les colonnes non privilégiées sont modifiables par
-- l'utilisateur propriétaire. Admin et service_role restent libres.
CREATE OR REPLACE FUNCTION public.game_access_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.user_id          := OLD.user_id;
    NEW.game_mode        := OLD.game_mode;
    NEW.is_active        := OLD.is_active;
    NEW.granted_by       := OLD.granted_by;
    NEW.granted_at       := OLD.granted_at;
    NEW.expires_at       := OLD.expires_at;
    NEW.price_amount     := OLD.price_amount;
    NEW.days_requested   := OLD.days_requested;
    NEW.rejection_reason := OLD.rejection_reason;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.is_active        := false;
    NEW.granted_by       := NULL;
    NEW.rejection_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS game_access_guard_trg ON public.game_access;
CREATE TRIGGER game_access_guard_trg
BEFORE INSERT OR UPDATE ON public.game_access
FOR EACH ROW EXECUTE FUNCTION public.game_access_guard();

-- ---------------------------------------------------------------------
-- 3. user_coins : plus d'écriture libre côté client
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their own coins" ON public.user_coins;
DROP POLICY IF EXISTS "Users can insert their own coins row" ON public.user_coins;

-- Création autorisée uniquement d'une ligne vide (plan gratuit).
DROP POLICY IF EXISTS "Users can create empty own coins row" ON public.user_coins;
CREATE POLICY "Users can create empty own coins row"
ON public.user_coins
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(balance, 0) = 0
  AND COALESCE(total_granted, 0) = 0
  AND COALESCE(total_consumed, 0) = 0
  AND COALESCE(plan_type, 'free') = 'free'
);

-- L'attribution des jetons d'abonnement est calculée côté serveur et
-- exige un abonnement réellement validé par un administrateur.
CREATE OR REPLACE FUNCTION public.grant_subscription_coins()
RETURNS TABLE (balance numeric, plan_type text, plan_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  acc record;
  days numeric;
  coins numeric;
  rate numeric;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT * INTO acc
  FROM public.game_access
  WHERE user_id = uid
    AND is_active = true
    AND granted_by IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY granted_at DESC
  LIMIT 1;

  IF acc IS NULL THEN
    RAISE EXCEPTION 'Aucun abonnement actif';
  END IF;

  IF acc.expires_at IS NULL THEN
    coins := 1000000; rate := 0;
  ELSE
    days  := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (acc.expires_at - now())) / 86400));
    coins := GREATEST(1, days * 24);
    rate  := 1;
  END IF;

  INSERT INTO public.user_coins AS uc (
    user_id, balance, total_granted, total_consumed, plan_type,
    plan_started_at, plan_expires_at, consumption_rate_per_hour, last_consumed_at
  ) VALUES (
    uid, coins, coins, 0, 'premium', now(), acc.expires_at, rate, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    balance = CASE
      WHEN uc.plan_expires_at IS DISTINCT FROM acc.expires_at OR uc.plan_type <> 'premium'
        THEN coins
      ELSE GREATEST(uc.balance, coins)
    END,
    total_granted = uc.total_granted + CASE
      WHEN uc.plan_expires_at IS DISTINCT FROM acc.expires_at OR uc.plan_type <> 'premium'
        THEN coins ELSE 0 END,
    plan_type = 'premium',
    plan_started_at = COALESCE(uc.plan_started_at, now()),
    plan_expires_at = acc.expires_at,
    consumption_rate_per_hour = rate,
    last_consumed_at = now();

  RETURN QUERY
  SELECT uc.balance, uc.plan_type, uc.plan_expires_at
  FROM public.user_coins uc WHERE uc.user_id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_subscription_coins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_subscription_coins() TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4. activation_codes : le code d'accès application devient secret
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Authenticated can read non secret codes" ON public.activation_codes;
CREATE POLICY "Authenticated can read non secret codes"
ON public.activation_codes
FOR SELECT
TO authenticated
USING (code_name <> 'app_access');

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
    WHERE code_name = 'app_access'
      AND COALESCE(code_value, '') <> ''
      AND code_value = _code
  );
$$;

REVOKE ALL ON FUNCTION public.app_access_code_required() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_app_access_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_access_code_required() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_app_access_code(text) TO authenticated, service_role;
