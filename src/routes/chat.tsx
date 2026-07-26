import { createFileRoute } from "@tanstack/react-router";
import Chat from "@/pages/Chat";
import { RequireAuth } from "@/components/RouteGuards";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Jeux d'Hazard" },
      { name: "description", content: "Échangez avec le support et la communauté Jeux d'Hazard." },
      { property: "og:title", content: "Chat — Jeux d'Hazard" },
      { property: "og:description", content: "Échangez avec le support et la communauté Jeux d'Hazard." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <Chat />
    </RequireAuth>
  );
}
