// Update auth fields (email, phone, password) for the calling user.
// Re-issues a session so the client can stay signed in.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await anon.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const { email, phone, password } = body as {
      email?: string;
      phone?: string;
      password?: string;
    };

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const updatePayload: Record<string, unknown> = {};
    if (email && typeof email === "string") updatePayload.email = email.trim().toLowerCase();
    if (phone && typeof phone === "string") updatePayload.phone = phone.trim();
    if (password && typeof password === "string") {
      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "Mot de passe trop court (min 6)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      updatePayload.password = password;
    }
    if (email) updatePayload.email_confirm = true;
    if (phone) updatePayload.phone_confirm = true;

    if (Object.keys(updatePayload).length === 0) {
      return new Response(JSON.stringify({ error: "Aucun changement" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, updatePayload);
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mirror to profiles for the UI
    const profileUpdate: Record<string, unknown> = {};
    if (email) profileUpdate.email = (updatePayload.email as string);
    if (phone) profileUpdate.phone = (updatePayload.phone as string);
    if (Object.keys(profileUpdate).length > 0) {
      await admin.from("profiles").update(profileUpdate).eq("user_id", userId);
    }

    // Generate a fresh session if password changed (otherwise existing token still works)
    let session: unknown = null;
    if (password) {
      const emailForLogin = (updatePayload.email as string) || userRes.user.email;
      if (emailForLogin) {
        const { data: signin } = await admin.auth.signInWithPassword({
          email: emailForLogin,
          password,
        });
        session = signin?.session ?? null;
      }
    }

    return new Response(JSON.stringify({ ok: true, session }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
