import { createFileRoute } from "@tanstack/react-router";
import NotFound from "@/pages/NotFound";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Page introuvable — Jeux d'Hazard" },
      { name: "description", content: "Cette page n'existe pas ou a été déplacée." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotFound,
});
