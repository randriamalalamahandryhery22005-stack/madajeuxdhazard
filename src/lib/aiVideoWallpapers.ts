// Catalogue de fonds d'écran vidéo générés par IA, embarqués dans l'application.
// Utilisé par la sélection manuelle (galerie) et par la génération assistée par IA
// (/api/ai-video choisit l'ambiance la plus proche de la demande de l'utilisateur).
import emerald from "@/assets/ai-wallpaper-emerald.mp4.asset.json";
import skyline from "@/assets/ai-wallpaper-skyline.mp4.asset.json";
import grid from "@/assets/ai-wallpaper-grid.mp4.asset.json";

export interface AiWallpaper {
  id: string;
  label: string;
  description: string;
  url: string;
}

export const AI_WALLPAPERS: AiWallpaper[] = [
  {
    id: "emerald",
    label: "Encre Émeraude",
    description: "Encre or et émeraude tourbillonnant lentement dans l'eau sombre, luxueux et calme.",
    url: emerald.url,
  },
  {
    id: "skyline",
    label: "Nuit Néon",
    description: "Vol au-dessus de nuages néon bleu-violet, rayons de lumière, ambiance nocturne aérienne.",
    url: skyline.url,
  },
  {
    id: "grid",
    label: "Grille Ambre",
    description: "Grille de données futuriste sombre avec traînées de lumière ambre et particules.",
    url: grid.url,
  },
];

export const findWallpaper = (id?: string | null) =>
  AI_WALLPAPERS.find((w) => w.id === id) ?? null;
