import { createFileRoute } from "@tanstack/react-router";
import JetX from "@/pages/JetX";
import { RequirePremium } from "@/components/RouteGuards";

export const Route = createFileRoute("/jetx")({
  head: () => ({
    meta: [
      { title: "JetX — Jeux d'Hazard" },
      { name: "description", content: "Prédictions et analyses JetX sur Jeux d'Hazard." },
      { property: "og:title", content: "JetX — Jeux d'Hazard" },
      { property: "og:description", content: "Prédictions et analyses JetX sur Jeux d'Hazard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequirePremium>
      <JetX />
    </RequirePremium>
  );
}
