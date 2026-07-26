import { createFileRoute } from "@tanstack/react-router";
import CustomPrediction from "@/pages/CustomPrediction";
import { RequireAuth } from "@/components/RouteGuards";

export const Route = createFileRoute("/custom/$slug")({
  head: () => ({
    meta: [
      { title: "Prédiction personnalisée — Jeux d'Hazard" },
      { name: "description", content: "Accédez à une prédiction personnalisée configurée sur Jeux d'Hazard." },
      { property: "og:title", content: "Prédiction personnalisée — Jeux d'Hazard" },
      { property: "og:description", content: "Accédez à une prédiction personnalisée configurée sur Jeux d'Hazard." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <CustomPrediction />
    </RequireAuth>
  );
}
