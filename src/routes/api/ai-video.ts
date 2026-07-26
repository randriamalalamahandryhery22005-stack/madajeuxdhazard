import { createFileRoute } from "@tanstack/react-router";
import { AI_WALLPAPERS } from "@/lib/aiVideoWallpapers";

/**
 * Fond d'écran vidéo par IA.
 * L'IA (passerelle Lovable AI) interprète la demande de l'utilisateur et
 * sélectionne l'ambiance vidéo générée la plus proche, avec une courte
 * explication. Repli déterministe par mots-clés si l'IA est indisponible.
 */
const keywordPick = (prompt: string) => {
  const q = prompt.toLowerCase();
  const score = (w: (typeof AI_WALLPAPERS)[number]) =>
    (w.label + " " + w.description)
      .toLowerCase()
      .split(/[^a-zà-ÿ]+/)
      .filter((t) => t.length > 3 && q.includes(t)).length;
  return [...AI_WALLPAPERS].sort((a, b) => score(b) - score(a))[0];
};

export const Route = createFileRoute("/api/ai-video")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          wallpapers: AI_WALLPAPERS.map(({ id, label, description, url }) => ({
            id,
            label,
            description,
            url,
          })),
        }),
      POST: async ({ request }) => {
        let prompt = "";
        try {
          const body = (await request.json()) as { prompt?: string };
          prompt = (body.prompt || "").toString().trim().slice(0, 400);
        } catch {
          /* corps invalide */
        }
        if (!prompt) return new Response("Missing prompt", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        let chosenId: string | null = null;
        let reason = "";

        if (key) {
          try {
            const catalogue = AI_WALLPAPERS.map(
              (w) => `- ${w.id} : ${w.label} — ${w.description}`,
            ).join("\n");
            const upstream = await fetch(
              "https://ai.gateway.lovable.dev/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${key}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    {
                      role: "system",
                      content:
                        "Tu choisis un fond d'écran vidéo pour une application de jeux premium. " +
                        "Réponds UNIQUEMENT en JSON: {\"id\":\"<id du catalogue>\",\"reason\":\"<une phrase en français>\"}.\n" +
                        `Catalogue:\n${catalogue}`,
                    },
                    { role: "user", content: prompt },
                  ],
                }),
              },
            );
            if (upstream.ok) {
              const json = (await upstream.json()) as {
                choices?: { message?: { content?: string } }[];
              };
              const raw = json?.choices?.[0]?.message?.content ?? "";
              const match = raw.match(/\{[\s\S]*\}/);
              if (match) {
                const parsed = JSON.parse(match[0]) as { id?: string; reason?: string };
                if (parsed.id && AI_WALLPAPERS.some((w) => w.id === parsed.id)) {
                  chosenId = parsed.id;
                  reason = (parsed.reason || "").toString().slice(0, 200);
                }
              }
            }
          } catch {
            /* repli ci-dessous */
          }
        }

        const wallpaper =
          AI_WALLPAPERS.find((w) => w.id === chosenId) ?? keywordPick(prompt);

        return Response.json({
          wallpaper: {
            id: wallpaper.id,
            label: wallpaper.label,
            description: wallpaper.description,
            url: wallpaper.url,
          },
          reason: reason || `Ambiance « ${wallpaper.label} » retenue pour votre demande.`,
        });
      },
    },
  },
});
