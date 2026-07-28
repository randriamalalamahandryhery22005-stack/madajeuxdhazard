import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jeux d'Hazard — Prédictions & Analyses Premium" },
      { name: "description", content: "Plateforme Premium de Prédictions et Analyses Avancées pour Aviator, JetX, CosmoX.\nInterface Luxe, Analyses en Temps Réel. Tous droits réservés - Copyright 2017" },
      { property: "og:title", content: "Jeux d'Hazard — Prédictions & Analyses Premium" },
      { property: "og:description", content: "Plateforme Premium de Prédictions et Analyses Avancées pour Aviator, JetX, CosmoX.\nInterface Luxe, Analyses en Temps Réel. Tous droits réservés - Copyright 2017" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Index />
  );
}
