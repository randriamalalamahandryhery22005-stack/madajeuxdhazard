import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/pages/Admin";
import { RequireAdmin } from "@/components/RouteGuards";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Jeux d'Hazard" },
      { name: "description", content: "Console d'administration de la plateforme Jeux d'Hazard." },
      { property: "og:title", content: "Administration — Jeux d'Hazard" },
      { property: "og:description", content: "Console d'administration de la plateforme Jeux d'Hazard." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAdmin>
      <Admin />
    </RequireAdmin>
  );
}
