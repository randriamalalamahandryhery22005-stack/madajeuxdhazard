import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROTECTED_EMAILS = [
  "aviatorgamespredictor@gmail.com",
  "randriamalalamahandryhery@gmail.com",
];

// Best-effort cascade cleanup — silently ignore tables that don't exist.
const USER_ID_TABLES = [
  "profiles", "notifications", "chat_messages", "user_sessions",
  "login_history", "user_access", "user_coins", "user_roles",
  "online_users", "game_access", "game_usage", "reward_requests",
  "premium_requests", "user_points", "user_devices", "global_chat_messages",
  "protected_admins",
];
const TARGET_USER_ID_TABLES = ["notifications"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) throw new Error("Missing bearer token");

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Server not configured");

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: caller, error: whoErr } = await admin.auth.getUser(token);
    if (whoErr || !caller?.user) throw new Error("Not authenticated");
    const user = caller.user;

    if (user.email && PROTECTED_EMAILS.includes(user.email.toLowerCase())) {
      throw new Error("Ce compte est protégé et ne peut pas être supprimé");
    }
    const uid = user.id;

    // Cascade cleanup of associated data. Errors on non-existent tables are ignored.
    await Promise.all([
      ...USER_ID_TABLES.map((t) =>
        admin.from(t).delete().eq("user_id", uid).then(() => null, () => null),
      ),
      ...TARGET_USER_ID_TABLES.map((t) =>
        admin.from(t).delete().eq("target_user_id", uid).then(() => null, () => null),
      ),
    ]);

    // Finally delete the auth user (this is what makes the deletion definitive).
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ ok: true, deleted_user_id: uid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("delete-account error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
