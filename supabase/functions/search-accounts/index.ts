import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const maskEmail = (e?: string | null) => {
  if (!e) return null;
  const [u, d] = e.split("@");
  if (!d) return e;
  const visible = u.slice(0, Math.min(2, u.length));
  return `${visible}${"•".repeat(Math.max(1, u.length - 2))}@${d}`;
};
const maskPhone = (p?: string | null) => {
  if (!p) return null;
  if (p.length <= 4) return p;
  return `${p.slice(0, 3)}${"•".repeat(Math.max(1, p.length - 6))}${p.slice(-3)}`;
};
const escapeLike = (s: string) => s.replace(/[%_,()]/g, " ").trim();
const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Tiny in-memory cache (20s) to make repeated keystrokes instant.
const cache = new Map<string, { at: number; data: any }>();
const TTL = 20_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { query } = await req.json().catch(() => ({ query: "" }));
    const raw = String(query || "").trim();
    if (raw.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = raw.toLowerCase();
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) {
      return new Response(JSON.stringify(hit.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const q = escapeLike(raw);
    const qNoAccent = stripAccents(q);
    const qDigits = q.replace(/\D+/g, "");
    const like = `%${q}%`;
    const likeNoAccent = `%${qNoAccent}%`;

    const filters = [
      `full_name.ilike.${like}`,
      `name.ilike.${like}`,
      `email.ilike.${like}`,
      `full_name.ilike.${likeNoAccent}`,
      `name.ilike.${likeNoAccent}`,
    ];
    if (qDigits.length >= 3) {
      // phone column not present in profiles — skip phone filter
    }

    const { data, error } = await admin
      .from("profiles")
      .select("user_id, full_name, name, avatar_url, email")
      .or(filters.join(","))
      .limit(15);
    if (error) throw error;

    // Simple relevance ranking: exact prefix matches first.
    const lower = q.toLowerCase();
    const results = (data || [])
      .map((p: any) => {
        const label = (p.full_name || p.name || "").toLowerCase();
        const email = (p.email || "").toLowerCase();
        let score = 0;
        if (label.startsWith(lower)) score += 3;
        else if (label.includes(lower)) score += 2;
        if (email.startsWith(lower)) score += 2;
        else if (email.includes(lower)) score += 1;
        return { p, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(({ p }) => ({
        user_id: p.user_id,
        full_name: p.full_name || p.name || "Utilisateur",
        avatar_url: p.avatar_url || null,
        email_masked: maskEmail(p.email),
        phone_masked: null,
        email: p.email,
      }));

    const payload = { results };
    cache.set(key, { at: Date.now(), data: payload });
    if (cache.size > 200) cache.delete(cache.keys().next().value);

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e), results: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
