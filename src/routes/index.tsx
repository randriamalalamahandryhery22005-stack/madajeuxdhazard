import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jeux d'Hazard — Prédictions & Analyses Premium" },
      { name: "description", content: "Plateforme Premium de prédictions et analyses avancées pour Aviator, JetX, CosmoX. Interface luxe, analyses en temps réel." },
      { property: "og:title", content: "Jeux d'Hazard — Prédictions & Analyses Premium" },
      { property: "og:description", content: "Plateforme Premium de prédictions et analyses avancées pour Aviator, JetX, CosmoX. Interface luxe, analyses en temps réel." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Index />
  );
}
