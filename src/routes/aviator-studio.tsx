import { createFileRoute } from "@tanstack/react-router";
import AviatorStudio from "@/pages/AviatorStudio";
import { RequirePremium } from "@/components/RouteGuards";

export const Route = createFileRoute("/aviator-studio")({
  head: () => ({
    meta: [
      { title: "Aviator Studio — Jeux d'Hazard" },
      { name: "description", content: 'Prédictions Aviator Studio avec analyses dédiées.' },
      { property: "og:title", content: "Aviator Studio — Jeux d'Hazard" },
      { property: "og:description", content: 'Prédictions Aviator Studio avec analyses dédiées.' },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequirePremium>
      <AviatorStudio />
    </RequirePremium>
  );
}
