import { createFileRoute } from "@tanstack/react-router";
import AnalyseRound from "@/pages/AnalyseRound";
import { RequireAuth } from "@/components/RouteGuards";

export const Route = createFileRoute("/analyse/$game")({
  head: () => ({
    meta: [
      { title: "Analyse du round — Jeux d'Hazard" },
      { name: "description", content: 'Analyse détaillée du round en cours pour votre jeu.' },
      { property: "og:title", content: "Analyse du round — Jeux d'Hazard" },
      { property: "og:description", content: 'Analyse détaillée du round en cours pour votre jeu.' },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <AnalyseRound />
    </RequireAuth>
  );
}
