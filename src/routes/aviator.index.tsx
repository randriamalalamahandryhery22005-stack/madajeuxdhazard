import { createFileRoute } from "@tanstack/react-router";
import UnifiedCalculator from "@/pages/UnifiedCalculator";
import { RequireAuth } from "@/components/RouteGuards";

export const Route = createFileRoute("/aviator/")({
  head: () => ({ meta: [
    { title: "Aviator — Jeux d'Hazard" },
    { name: "description", content: "Calculateur unifié et analyse statistique premium." },
  ] }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <UnifiedCalculator defaultGame="aviator" />
    </RequireAuth>
  );
}
