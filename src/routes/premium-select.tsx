import { createFileRoute } from "@tanstack/react-router";
import PremiumSelect from "@/pages/PremiumSelect";
import { RequireAuth } from "@/components/RouteGuards";

export const Route = createFileRoute("/premium-select")({
  head: () => ({
    meta: [
      { title: "Choisir un forfait Premium — Jeux d'Hazard" },
      { name: "description", content: 'Comparez et choisissez le forfait Premium adapté à votre jeu.' },
      { property: "og:title", content: "Choisir un forfait Premium — Jeux d'Hazard" },
      { property: "og:description", content: 'Comparez et choisissez le forfait Premium adapté à votre jeu.' },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <PremiumSelect />
    </RequireAuth>
  );
}
