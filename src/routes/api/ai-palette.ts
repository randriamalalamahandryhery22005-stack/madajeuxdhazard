import { createFileRoute } from "@tanstack/react-router";

/**
 * Generate an app color palette from a natural-language description.
 * Returns HSL triplets (no "hsl()" wrapper) ready for CSS variables.
 */
export const Route = createFileRoute("/api/ai-palette")({
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

        const sys = `Tu génères une palette de couleurs pour une application mobile premium. Réponds UNIQUEMENT en JSON valide, aucun texte autour, format :
{"primary":"H S% L%","background":"H S% L%","accent":"H S% L%","foreground":"H S% L%","card":"H S% L%","radius":"0.75rem"}
Les valeurs doivent être des triplets HSL (sans hsl()). Le background doit être sombre (L entre 4% et 12%), le foreground clair (L>=92%), primary saturé (S>=70%). Radius entre 0.25rem et 1.25rem.`;

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3.6-flash",
              messages: [
                { role: "system", content: sys },
                { role: "user", content: prompt },
              ],
              response_format: { type: "json_object" },
            }),
          },
        );

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }
        const json = (await upstream.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const raw = json?.choices?.[0]?.message?.content || "";
        let palette: Record<string, string> = {};
        try {
          const match = raw.match(/\{[\s\S]*\}/);
          palette = JSON.parse(match ? match[0] : raw);
        } catch {
          return new Response("Invalid AI response", { status: 502 });
        }
        return Response.json({ palette });
      },
    },
  },
});
