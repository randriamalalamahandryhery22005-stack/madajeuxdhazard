
-- protected_admins: revoke public read; keep admin-only management
DROP POLICY IF EXISTS "Authenticated can read protected admins" ON public.protected_admins;

-- activation_codes: only expose non-sensitive gameplay codes to authenticated users
DROP POLICY IF EXISTS "Authenticated can read codes" ON public.activation_codes;
CREATE POLICY "Authenticated can read public codes"
  ON public.activation_codes
  FOR SELECT
  TO authenticated
  USING (
    code_name LIKE 'seconds_%'
    OR code_name LIKE 'sub_%'
    OR code_name IN ('basic')
  );

-- password_reset_requests: validate the identifier to prevent flooding with junk
DROP POLICY IF EXISTS "Anon can insert reset" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Users can insert own reset" ON public.password_reset_requests;

CREATE POLICY "Anyone can request password reset (validated)"
  ON public.password_reset_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_identifier IS NOT NULL
    AND length(btrim(user_identifier)) BETWEEN 3 AND 254
    AND status = 'pending'
  );
