import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Called RIGHT AFTER a successful sign-in to enforce single-device login.
 * Behavior: NEW DEVICE WINS. The old device is forced out via the profiles
 * watcher on the previous device (it sees device_id changed and signs out).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user_id, device_id, device_info } = await req.json();
    if (!user_id || !device_id) throw new Error("user_id and device_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Always claim the device for the new login (new device wins).
    await admin
      .from("profiles")
      .update({
        device_id,
        device_info: device_info ?? null,
        last_seen_at: new Date().toISOString(),
      })
      .eq("user_id", user_id);

    // Log the login event in history
    await admin.from("login_history").insert({
      user_id,
      event_type: "login",
      device_info: device_info ?? null,
      session_id: device_id,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
