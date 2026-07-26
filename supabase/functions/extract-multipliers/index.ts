// Extracts multiplier history from a game screenshot (Aviator, JetX, CosmoX, etc.)
// using Lovable AI Gateway vision model.
// Body: { imageBase64: string, game?: string }
// Response: { valid: boolean, multipliers: number[], reason: string }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ valid: false, multipliers: [], reason: "AI indisponible (clé manquante)" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { imageBase64, game } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ valid: false, multipliers: [], reason: "Image requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const gameName = typeof game === "string" && game.length > 0 ? game : "crash game";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              `You are a strict OCR extractor for ${gameName} multiplier history screenshots. ` +
              "Look at the image and extract ONLY the multipliers displayed in the round history " +
              "(e.g. 1.42x, 2.09x, 5.53x, 18.70x). Ignore balances, bets, timers, UI text. " +
              "If the image does NOT clearly show a list of crash game multipliers, set valid=false. " +
              "Return strictly JSON: {\"valid\": boolean, \"multipliers\": number[], \"reason\": string}. " +
              "Multipliers must be numeric (e.g. 1.42, 18.7). Order them from most recent to oldest as they appear. " +
              "Reason must be short French (max 15 words).",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract multipliers from this screenshot." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ valid: false, multipliers: [], reason: "Trop de requêtes, réessayez dans un instant" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ valid: false, multipliers: [], reason: "Crédits IA épuisés" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ valid: false, multipliers: [], reason: "Analyse IA indisponible" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await aiResp.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { valid?: boolean; multipliers?: unknown; reason?: string } = {};
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      parsed = { valid: false, multipliers: [], reason: "Analyse impossible" };
    }

    const rawList = Array.isArray(parsed.multipliers) ? parsed.multipliers : [];
    const multipliers = rawList
      .map((v) => {
        if (typeof v === "number") return v;
        if (typeof v === "string") {
          const cleaned = v.replace(/[×xX]/g, "").replace(",", ".").trim();
          const n = parseFloat(cleaned);
          return isFinite(n) ? n : NaN;
        }
        return NaN;
      })
      .filter((n) => isFinite(n) && n >= 1 && n <= 10000);

    const valid = !!parsed.valid && multipliers.length >= 3;

    return new Response(
      JSON.stringify({
        valid,
        multipliers,
        reason:
          parsed.reason ||
          (valid
            ? "Historique détecté"
            : "Aucun historique de multiplicateurs détecté dans l'image"),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ valid: false, multipliers: [], reason: "Erreur inattendue" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
