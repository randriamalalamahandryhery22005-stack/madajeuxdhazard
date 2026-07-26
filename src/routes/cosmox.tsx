import { createFileRoute } from "@tanstack/react-router";
import CosmoX from "@/pages/CosmoX";
import { RequirePremium } from "@/components/RouteGuards";

export const Route = createFileRoute("/cosmox")({
  head: () => ({
    meta: [
      { title: "CosmoX — Jeux d'Hazard" },
      { name: "description", content: "Prédictions et analyses CosmoX sur Jeux d'Hazard." },
      { property: "og:title", content: "CosmoX — Jeux d'Hazard" },
      { property: "og:description", content: "Prédictions et analyses CosmoX sur Jeux d'Hazard." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequirePremium>
      <CosmoX />
    </RequirePremium>
  );
}
