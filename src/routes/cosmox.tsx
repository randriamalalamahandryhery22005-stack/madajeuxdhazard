import { createFileRoute } from "@tanstack/react-router";
import UnifiedCalculator from "@/pages/UnifiedCalculator";
import { RequirePremium } from "@/components/RouteGuards";

export const Route = createFileRoute("/cosmox")({
  head: () => ({ meta: [
    { title: "CosmoX — Jeux d'Hazard" },
    { name: "description", content: "Calculateur unifié et analyse statistique premium." },
  ] }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequirePremium>
      <UnifiedCalculator defaultGame="cosmox" />
    </RequirePremium>
  );
}
