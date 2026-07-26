import { createFileRoute } from "@tanstack/react-router";
import AviatorBasic from "@/pages/AviatorBasic";
import { RequireAuth } from "@/components/RouteGuards";

export const Route = createFileRoute("/aviator/basic")({
  head: () => ({
    meta: [
      { title: "Aviator Basic — Jeux d'Hazard" },
      { name: "description", content: "Mode Basic d'Aviator : prédictions accessibles et analyses simplifiées." },
      { property: "og:title", content: "Aviator Basic — Jeux d'Hazard" },
      { property: "og:description", content: "Mode Basic d'Aviator : prédictions accessibles et analyses simplifiées." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <AviatorBasic />
    </RequireAuth>
  );
}
