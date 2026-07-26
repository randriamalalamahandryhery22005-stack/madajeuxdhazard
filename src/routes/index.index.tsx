import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/index/")({
  head: () => ({
    meta: [
      { title: "Jeux d'Hazard — Accueil" },
      { name: "description", content: "Accueil de Jeux d'Hazard : prédictions et analyses premium pour vos jeux favoris." },
      { property: "og:title", content: "Jeux d'Hazard — Accueil" },
      { property: "og:description", content: "Accueil de Jeux d'Hazard : prédictions et analyses premium pour vos jeux favoris." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Index />
  );
}
