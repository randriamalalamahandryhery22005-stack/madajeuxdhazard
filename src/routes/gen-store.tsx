import { createFileRoute } from "@tanstack/react-router";
import GenStore from "@/pages/GenStore";
import { RequireAuth } from "@/components/RouteGuards";

export const Route = createFileRoute("/gen-store")({
  head: () => ({
    meta: [
      { title: "Gen Store — Jeux d'Hazard" },
      { name: "description", content: 'Boutique Gen : échangez vos pièces contre des avantages exclusifs.' },
      { property: "og:title", content: "Gen Store — Jeux d'Hazard" },
      { property: "og:description", content: 'Boutique Gen : échangez vos pièces contre des avantages exclusifs.' },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <GenStore />
    </RequireAuth>
  );
}
