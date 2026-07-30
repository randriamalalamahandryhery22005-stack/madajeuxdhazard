REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_user_coins() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_total_revenue() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_active_device(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_active_premium_bonus(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM anon, authenticated;