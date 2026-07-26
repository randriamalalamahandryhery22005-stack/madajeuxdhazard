import { createFileRoute } from "@tanstack/react-router";
import AviatorSpribe from "@/pages/AviatorSpribe";
import { RequirePremium } from "@/components/RouteGuards";

export const Route = createFileRoute("/aviator-spribe")({
  head: () => ({
    meta: [
      { title: "Aviator Spribe — Jeux d'Hazard" },
      { name: "description", content: 'Prédictions Aviator Spribe et analyses en temps réel.' },
      { property: "og:title", content: "Aviator Spribe — Jeux d'Hazard" },
      { property: "og:description", content: 'Prédictions Aviator Spribe et analyses en temps réel.' },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequirePremium>
      <AviatorSpribe />
    </RequirePremium>
  );
}
