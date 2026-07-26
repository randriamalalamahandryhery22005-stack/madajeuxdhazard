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
    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id required");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const { data: caller } = await admin.auth.getUser(token);
    if (!caller.user) throw new Error("Not authenticated");

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Admin only");

    // Check protected
    const { data: targetUser } = await admin.auth.admin.getUserById(user_id);
    const targetEmail = targetUser?.user?.email?.toLowerCase() || "";
    if (PROTECTED_EMAILS.includes(targetEmail)) {
      return new Response(
        JSON.stringify({ error: "Cet utilisateur est protégé et ne peut pas être supprimé." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cascade delete in public tables
    await admin.from("game_access").delete().eq("user_id", user_id);
    await admin.from("game_usage").delete().eq("user_id", user_id);
    await admin.from("user_points").delete().eq("user_id", user_id);
    await admin.from("predictions").delete().eq("user_id", user_id);
    await admin.from("notifications").delete().eq("target_user_id", user_id);
    await admin.from("chat_messages").delete().eq("user_id", user_id);
    await admin.from("reward_requests").delete().eq("user_id", user_id);
    await admin.from("login_history").delete().eq("user_id", user_id);
    await admin.from("online_users").delete().eq("user_id", user_id);
    await admin.from("user_roles").delete().eq("user_id", user_id);
    await admin.from("profiles").delete().eq("user_id", user_id);

    // Delete auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(user_id);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Erreur" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
