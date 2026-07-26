import { createFileRoute } from "@tanstack/react-router";
import Games from "@/pages/Games";
import { RequireAuth } from "@/components/RouteGuards";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Mes jeux — Jeux d'Hazard" },
      { name: "description", content: 'Accédez à tous les jeux disponibles : Aviator, JetX, CosmoX, Spribe, Studio et plus.' },
      { property: "og:title", content: "Mes jeux — Jeux d'Hazard" },
      { property: "og:description", content: 'Accédez à tous les jeux disponibles : Aviator, JetX, CosmoX, Spribe, Studio et plus.' },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <Games />
    </RequireAuth>
  );
}
