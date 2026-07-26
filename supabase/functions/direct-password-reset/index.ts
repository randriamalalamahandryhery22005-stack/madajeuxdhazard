import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const norm = (s: string) => s.trim().toLowerCase();
const normPhone = (s: string) => s.replace(/[^\d+]/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = String(body.identifier || "").trim();
    const new_password = String(body.new_password || "");
    if (!identifier || !new_password) throw new Error("Champs requis manquants");
    if (new_password.length < 6) throw new Error("Mot de passe trop court (min 6)");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const isEmail = identifier.includes("@");
    const idEmail = norm(identifier);
    const idPhone = normPhone(identifier);

    let foundUser: { id: string; email?: string; phone?: string } | null = null;

    // 1) Fast path: profiles table lookup (email only — no phone column)
    if (isEmail) {
      const { data: prof } = await admin
        .from("profiles")
        .select("user_id, email")
        .ilike("email", idEmail)
        .limit(1)
        .maybeSingle();
      if (prof?.user_id) {
        const { data: u } = await admin.auth.admin.getUserById(prof.user_id);
        if (u?.user) foundUser = { id: u.user.id, email: u.user.email ?? undefined, phone: u.user.phone ?? undefined };
      }
    }

    // 2) Fallback: paginate auth.users
    if (!foundUser) {
      let page = 1;
      while (page <= 25 && !foundUser) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        if (!data?.users?.length) break;
        const match = data.users.find((u: any) => {
          if (isEmail) return norm(u.email || "") === idEmail;
          return normPhone(u.phone || "") === idPhone || normPhone(u.phone || "").endsWith(idPhone);
        });
        if (match) foundUser = { id: match.id, email: match.email ?? undefined, phone: match.phone ?? undefined };
        if (data.users.length < 200) break;
        page++;
      }
    }

    if (!foundUser) {
      return new Response(JSON.stringify({ ok: false, error: "Aucun compte trouvé pour cet identifiant" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(foundUser.id, { password: new_password });
    if (updErr) throw updErr;

    // Free device lock so the user can log in elsewhere
    await admin.from("profiles").update({ device_id: null }).eq("user_id", foundUser.id);

    return new Response(
      JSON.stringify({ ok: true, email: foundUser.email || null, phone: foundUser.phone || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
