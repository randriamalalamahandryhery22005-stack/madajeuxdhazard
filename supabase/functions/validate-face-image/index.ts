// Validates that an image contains a real human face using Lovable AI Gateway.
// Body: { imageBase64: string } (data URL or raw base64)
// Response: { isFace: boolean, reason: string }

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
        JSON.stringify({ isFace: true, reason: "skip", warning: "LOVABLE_API_KEY missing" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

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
              "You are a strict image classifier. Decide if the image shows a REAL human face (photograph of a real person's face, clearly visible). " +
              "Return JSON only. Reject cartoons, drawings, anime, 3D renders, logos, animals, objects, screenshots, memes, abstract images, or images where no clear human face is visible. " +
              "Reply strictly as JSON: {\"isFace\": boolean, \"reason\": string}. The reason must be in French, short (max 15 words).",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Is this a real human face photo?" },
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
      // Fail open so upload isn't blocked by transient AI outage
      return new Response(
        JSON.stringify({ isFace: true, reason: "ai_unavailable", warning: txt.slice(0, 200) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await aiResp.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { isFace?: boolean; reason?: string } = {};
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      parsed = { isFace: false, reason: "Analyse impossible" };
    }

    return new Response(
      JSON.stringify({
        isFace: !!parsed.isFace,
        reason: parsed.reason || (parsed.isFace ? "Visage détecté" : "Visage non détecté"),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ isFace: true, reason: "error_open", warning: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
