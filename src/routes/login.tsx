import { createFileRoute } from "@tanstack/react-router";
import Login from "@/pages/Login";
import { RedirectIfAuthed } from "@/components/RouteGuards";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — Jeux d'Hazard" },
      { name: "description", content: "Connectez-vous à votre compte Jeux d'Hazard pour accéder aux prédictions premium." },
      { property: "og:title", content: "Connexion — Jeux d'Hazard" },
      { property: "og:description", content: "Connectez-vous à votre compte Jeux d'Hazard pour accéder aux prédictions premium." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RedirectIfAuthed>
      <Login />
    </RedirectIfAuthed>
  );
}
