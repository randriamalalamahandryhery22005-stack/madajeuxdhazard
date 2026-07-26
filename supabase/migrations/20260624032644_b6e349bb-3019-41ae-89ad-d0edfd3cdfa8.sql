
REVOKE ALL ON FUNCTION public.consume_user_coins() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_user_coins() TO service_role;
