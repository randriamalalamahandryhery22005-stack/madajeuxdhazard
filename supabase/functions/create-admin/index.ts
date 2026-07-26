import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const email = "randriamalalamahandryhery@gmail.com";
    const password = "rand2104";
    const phoneDigits = "261336756185"; // no leading '+'
    const phoneDisplay = "+261336756185";
    const fullName = "Admin KLS";

    // Find user by paginating
    let existing: any = null;
    let page = 1;
    while (page < 20) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      existing = data.users.find((u) => u.email === email || u.phone === phoneDigits);
      if (existing || data.users.length < 200) break;
      page++;
    }

    let userId: string;
    let action: string;
    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        email,
        password,
        phone: phoneDigits,
        email_confirm: true,
        phone_confirm: true,
      });
      if (error) throw error;
      userId = existing.id;
      action = "updated";
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        phone: phoneDigits,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) throw error;
      userId = data.user!.id;
      action = "created";
    }

    await admin.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" }
    );
    await admin.from("profiles").upsert(
      { user_id: userId, full_name: fullName, name: fullName, email, phone: phoneDisplay, is_validated: true },
      { onConflict: "user_id" }
    );
    await admin.from("protected_admins").upsert(
      { user_id: userId, email },
      { onConflict: "user_id" }
    );

    return new Response(JSON.stringify({ ok: true, action, id: userId, email, phone: phoneDisplay }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
