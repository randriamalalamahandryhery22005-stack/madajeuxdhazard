import { createFileRoute } from "@tanstack/react-router";

/**
 * Generate an app background image using the Lovable AI Gateway.
 * Non-streaming: returns { dataUrl } once the final PNG is ready.
 */
export const Route = createFileRoute("/api/ai-background")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let prompt = "";
        try {
          const body = (await request.json()) as { prompt?: string };
          prompt = (body.prompt || "").toString().trim();
        } catch {}
        if (!prompt) return new Response("Missing prompt", { status: 400 });

        const finalPrompt = `Fond d'écran mobile pour une application premium de prédictions de jeux (aviator, jetx). Ambiance sombre luxueuse, or et vert émeraude, adapté à la lisibilité du texte par-dessus. Sans texte. ${prompt}`;

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/images/generations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image",
              messages: [{ role: "user", content: finalPrompt }],
              modalities: ["image", "text"],
            }),
          },
        );

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }
        const json = (await upstream.json()) as {
          data?: { b64_json?: string }[];
        };
        const b64 = json?.data?.[0]?.b64_json;
        if (!b64) return new Response("No image returned", { status: 502 });
        return Response.json({ dataUrl: `data:image/png;base64,${b64}` });
      },
    },
  },
});
