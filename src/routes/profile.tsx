import { createFileRoute } from "@tanstack/react-router";
import Profile from "@/pages/Profile";
import { RequireAuth } from "@/components/RouteGuards";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Mon profil — Jeux d'Hazard" },
      { name: "description", content: 'Gérez votre profil, vos informations et vos préférences.' },
      { property: "og:title", content: "Mon profil — Jeux d'Hazard" },
      { property: "og:description", content: 'Gérez votre profil, vos informations et vos préférences.' },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <Profile />
    </RequireAuth>
  );
}
