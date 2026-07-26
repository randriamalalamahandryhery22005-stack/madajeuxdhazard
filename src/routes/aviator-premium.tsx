import { createFileRoute } from "@tanstack/react-router";
import AviatorPremium from "@/pages/AviatorPremium";
import { RequirePremium } from "@/components/RouteGuards";

export const Route = createFileRoute("/aviator-premium")({
  head: () => ({
    meta: [
      { title: "Aviator Premium — Jeux d'Hazard" },
      { name: "description", content: "Aviator Premium : le niveau d'analyse le plus complet de Jeux d'Hazard." },
      { property: "og:title", content: "Aviator Premium — Jeux d'Hazard" },
      { property: "og:description", content: "Aviator Premium : le niveau d'analyse le plus complet de Jeux d'Hazard." },
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
