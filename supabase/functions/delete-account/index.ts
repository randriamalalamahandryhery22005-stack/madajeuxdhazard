import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROTECTED_EMAILS = [
  "aviatorgamespredictor@gmail.com",
  "randriamalalamahandryhery@gmail.com",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: caller } = await admin.auth.getUser(token);
    const user = caller.user;
    if (!user) throw new Error("Not authenticated");
    if (user.email && PROTECTED_EMAILS.includes(user.email)) {
      throw new Error("Ce compte est protégé");
    }
    const uid = user.id;
    // Best-effort cleanup of user rows across common tables
    const tables = [
      "profiles", "notifications", "chat_messages", "user_sessions",
      "login_history", "user_access", "user_coins", "user_roles",
    ];
    await Promise.all(tables.map((t) => admin.from(t).delete().eq("user_id", uid).then(() => null, () => null)));
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
