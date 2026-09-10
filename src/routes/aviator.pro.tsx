import { createFileRoute } from "@tanstack/react-router";
import AviatorPremium from "@/pages/AviatorPremium";
import { RequirePremium } from "@/components/RouteGuards";

export const Route = createFileRoute("/aviator/pro")({
  head: () => ({
    meta: [
      { title: "Aviator Pro — Jeux d'Hazard" },
      { name: "description", content: "Mode Pro d'Aviator : analyses avancées et prédictions premium." },
      { property: "og:title", content: "Aviator Pro — Jeux d'Hazard" },
      { property: "og:description", content: "Mode Pro d'Aviator : analyses avancées et prédictions premium." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequirePremium>
      <AviatorPremium />
    </RequirePremium>
  );
}
