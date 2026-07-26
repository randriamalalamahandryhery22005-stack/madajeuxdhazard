import { createFileRoute } from "@tanstack/react-router";
import Premium from "@/pages/Premium";
import { RequireAuth } from "@/components/RouteGuards";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "Premium — Jeux d'Hazard" },
      { name: "description", content: 'Votre espace Premium : tableau de bord, historique et assistance.' },
      { property: "og:title", content: "Premium — Jeux d'Hazard" },
      { property: "og:description", content: 'Votre espace Premium : tableau de bord, historique et assistance.' },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <Premium />
    </RequireAuth>
  );
}
