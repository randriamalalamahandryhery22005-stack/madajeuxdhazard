import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un générateur de configuration JSON pour une app de prédictions de jeux Aviator/Crash.
Tu reçois la config actuelle et un prompt admin en français. Tu retournes UNIQUEMENT la nouvelle config complète via l'outil "update_app_config".

Schéma:
{
  "theme": {
    "primary": "hsl string ex '45 90% 55%'",
    "background": "hsl string",
    "accent": "hsl string",
    "radius": "0.5rem"
  },
  "home": {
    "hero": { "title": "...", "subtitle": "...", "ctaLabel": "...", "ctaHref": "..." },
    "banners": [{ "id": "b1", "type": "info|success|warning", "title": "...", "message": "...", "dismissible": true }],
    "sections": [
      { "id": "s1", "kind": "cards", "title": "...", "items": [{ "title":"", "description":"", "icon":"sparkles|zap|trophy|shield|rocket", "href":"" }] },
      { "id": "s2", "kind": "text", "title": "...", "body": "markdown..." }
    ]
  },
  "games": {
    "highlightedSlugs": ["aviator","jetx"],
    "labels": { "aviator": "Aviator Pro", "jetx": "Jet X" },
    "descriptions": { "aviator": "..." }
  }
}

Garde tout ce qui n'est pas demandé inchangé. Modifie uniquement ce que le prompt demande.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return j({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) return j({ error: "Forbidden — admin only" }, 403);

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") return j({ error: "Prompt required" }, 400);

    const { data: current } = await admin.from("app_config").select("config, version").eq("is_active", true).maybeSingle();
    const currentConfig = current?.config ?? {};
    const currentVersion = current?.version ?? 0;

    const { data: logRow } = await admin.from("ai_config_logs").insert({
      user_id: userId, prompt, status: "pending"
    }).select().single();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Config actuelle:\n${JSON.stringify(currentConfig)}\n\nDemande admin:\n${prompt}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "update_app_config",
            description: "Retourne la nouvelle configuration complète de l'app",
            parameters: {
              type: "object",
              properties: {
                config: { type: "object", description: "Configuration JSON complète" },
                summary: { type: "string", description: "Résumé court des changements en français" },
              },
              required: ["config", "summary"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "update_app_config" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      await admin.from("ai_config_logs").update({ status: "error", error: errText }).eq("id", logRow!.id);
      if (aiResp.status === 429) return j({ error: "Limite IA atteinte, réessayez plus tard." }, 429);
      if (aiResp.status === 402) return j({ error: "Crédits IA épuisés, ajoutez des fonds." }, 402);
      return j({ error: "Erreur IA: " + errText }, 500);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      await admin.from("ai_config_logs").update({ status: "error", error: "No tool call returned" }).eq("id", logRow!.id);
      return j({ error: "L'IA n'a pas retourné de configuration." }, 500);
    }

    const args = JSON.parse(toolCall.function.arguments);
    const newConfig = args.config;
    const summary = args.summary || prompt.slice(0, 100);

    const { data: inserted, error: insErr } = await admin.from("app_config").insert({
      version: currentVersion + 1,
      config: newConfig,
      prompt,
      created_by: userId,
      is_active: true,
      notes: summary,
    }).select().single();

    if (insErr) {
      await admin.from("ai_config_logs").update({ status: "error", error: insErr.message }).eq("id", logRow!.id);
      return j({ error: insErr.message }, 500);
    }

    await admin.from("ai_config_logs").update({
      status: "success", response: args, config_id: inserted.id,
    }).eq("id", logRow!.id);

    return j({ success: true, version: inserted.version, summary, config: newConfig });
  } catch (e) {
    console.error(e);
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
