import { createFileRoute } from "@tanstack/react-router";
import UnifiedCalculator from "@/pages/UnifiedCalculator";
import { RequirePremium } from "@/components/RouteGuards";

export const Route = createFileRoute("/aviator-premium")({
  head: () => ({ meta: [
    { title: "Aviator — Jeux d'Hazard" },
    { name: "description", content: "Calculateur unifié et analyse statistique premium." },
  ] }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequirePremium>
      <UnifiedCalculator defaultGame="aviator" />
    </RequirePremium>
  );
}
