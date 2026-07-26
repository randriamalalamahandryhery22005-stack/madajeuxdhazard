import { createFileRoute } from "@tanstack/react-router";
import Aviator from "@/pages/Aviator";
import { RequireAuth } from "@/components/RouteGuards";

export const Route = createFileRoute("/aviator/")({
  head: () => ({
    meta: [
      { title: "Aviator — Jeux d'Hazard" },
      { name: "description", content: "Prédictions et analyses Aviator en temps réel sur Jeux d'Hazard." },
      { property: "og:title", content: "Aviator — Jeux d'Hazard" },
      { property: "og:description", content: "Prédictions et analyses Aviator en temps réel sur Jeux d'Hazard." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <Aviator />
    </RequireAuth>
  );
}
