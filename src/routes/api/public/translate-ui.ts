import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const inputSchema = z.object({
  targetLanguage: z.string().min(2).max(8).regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
  texts: z.array(z.string().min(1).max(500)).min(1).max(100),
});

const fallback: Record<string, Record<string, string>> = {
  en: {
    "Menu": "Menu",
    "Profil": "Profile",
    "Paramètres": "Settings",
    "Notifications": "Notifications",
    "Historique": "History",
    "Favoris": "Favorites",
    "Langue": "Language",
    "Thème": "Theme",
    "Confidentialité": "Privacy",
    "Aide": "Help",
    "Contact": "Contact",
    "Retour": "Back",
    "Se connecter": "Sign in",
    "Créer un nouveau compte": "Create a new account",
    "Rechercher mon compte": "Find my account",
    "Appliquer": "Apply",
    "Annuler": "Cancel",
    "Supprimer": "Delete",
    "Lecture": "Play",
    "Pause": "Pause",
    "Son activé": "Sound on",
    "Son coupé": "Muted",
    "Mode sombre": "Dark mode",
    "Sons": "Sounds",
    "Fond d'écran vidéo": "Video wallpaper",
    "Fond d'écran IA": "AI wallpaper",
    "Palette de couleurs IA": "AI color palette",
  },
  es: {
    "Menu": "Menú",
    "Profil": "Perfil",
    "Paramètres": "Ajustes",
    "Notifications": "Notificaciones",
    "Historique": "Historial",
    "Favoris": "Favoritos",
    "Langue": "Idioma",
    "Thème": "Tema",
    "Confidentialité": "Privacidad",
    "Aide": "Ayuda",
    "Contact": "Contacto",
    "Retour": "Volver",
    "Se connecter": "Iniciar sesión",
    "Créer un nouveau compte": "Crear una cuenta nueva",
    "Rechercher mon compte": "Buscar mi cuenta",
    "Appliquer": "Aplicar",
    "Annuler": "Cancelar",
    "Supprimer": "Eliminar",
    "Lecture": "Reproducir",
    "Pause": "Pausa",
    "Son activé": "Sonido activado",
    "Son coupé": "Silenciado",
    "Mode sombre": "Modo oscuro",
    "Sons": "Sonidos",
    "Fond d'écran vidéo": "Fondo de video",
    "Fond d'écran IA": "Fondo IA",
    "Palette de couleurs IA": "Paleta de colores IA",
  },
  mg: {
    "Menu": "Menio",
    "Profil": "Mombamomba",
    "Paramètres": "Fikirana",
    "Notifications": "Fampahafantarana",
    "Historique": "Tantara",
    "Favoris": "Tiana",
    "Langue": "Fiteny",
    "Thème": "Lohahevitra",
    "Confidentialité": "Tsiambaratelo",
    "Aide": "Fanampiana",
    "Contact": "Fifandraisana",
    "Retour": "Hiverina",
    "Se connecter": "Hiditra",
    "Créer un nouveau compte": "Hamorona kaonty vaovao",
    "Rechercher mon compte": "Hitady ny kaontiko",
    "Appliquer": "Ampiharo",
    "Annuler": "Foano",
    "Supprimer": "Fafao",
    "Lecture": "Alefa",
    "Pause": "Ajanony",
    "Son activé": "Feo mandeha",
    "Son coupé": "Feo tapaka",
    "Mode sombre": "Maody maizina",
    "Sons": "Feo",
    "Fond d'écran vidéo": "Sary mihetsika ambadika",
    "Fond d'écran IA": "Sary ambadika IA",
    "Palette de couleurs IA": "Loko IA",
  },
};

function fallbackTranslate(targetLanguage: string, texts: string[]) {
  const lang = targetLanguage.split("-")[0];
  const dict = fallback[lang] || {};
  return Object.fromEntries(texts.map((text) => [text, dict[text] || text]));
}

export const Route = createFileRoute("/api/public/translate-ui")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = inputSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid translation request", { status: 400 });

        const { targetLanguage, texts } = parsed.data;
        if (targetLanguage === "fr") {
          return Response.json({ translations: Object.fromEntries(texts.map((text) => [text, text])) });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ translations: fallbackTranslate(targetLanguage, texts) });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  "Translate French UI strings into the requested target language. Preserve brand names, routes, numbers, emoji, punctuation shape, and HTML-free plain text. Return only valid JSON mapping each exact source string to its translation.",
              },
              { role: "user", content: JSON.stringify({ targetLanguage, texts }) },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (!upstream.ok) return Response.json({ translations: fallbackTranslate(targetLanguage, texts) });
        const json = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
        const raw = json.choices?.[0]?.message?.content || "{}";
        try {
          const match = raw.match(/\{[\s\S]*\}/);
          const translations = JSON.parse(match ? match[0] : raw) as Record<string, string>;
          return Response.json({ translations: { ...fallbackTranslate(targetLanguage, texts), ...translations } });
        } catch {
          return Response.json({ translations: fallbackTranslate(targetLanguage, texts) });
        }
      },
    },
  },
});