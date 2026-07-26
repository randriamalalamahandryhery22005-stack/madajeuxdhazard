import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { identifier, code, new_password } = await req.json();
    if (!identifier || !code || !new_password) throw new Error("Champs requis manquants");
    if (new_password.length < 6) throw new Error("Mot de passe trop court (min 6)");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: req2 } = await admin
      .from("password_reset_requests")
      .select("id, reset_code, status, user_identifier")
      .eq("user_identifier", identifier)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!req2 || req2.reset_code !== code.toUpperCase()) {
      return new Response(JSON.stringify({ ok: false, error: "Code invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find user
    const { data: list } = await admin.auth.admin.listUsers();
    const user = list.users.find((u) => u.email === identifier || u.phone === identifier);
    if (!user) throw new Error("Utilisateur introuvable");

    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });
    if (updErr) throw updErr;

    // Burn the code & free the device so user can sign in fresh
    await admin
      .from("password_reset_requests")
      .update({ status: "completed", reset_code: null })
      .eq("id", req2.id);
    await admin.from("profiles").update({ device_id: null }).eq("user_id", user.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
