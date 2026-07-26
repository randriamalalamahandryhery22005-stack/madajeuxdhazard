import { createFileRoute } from "@tanstack/react-router";
import Signup from "@/pages/Signup";
import { RedirectIfAuthed } from "@/components/RouteGuards";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Créer un compte — Jeux d'Hazard" },
      { name: "description", content: "Créez votre compte Jeux d'Hazard et débloquez les analyses et prédictions avancées." },
      { property: "og:title", content: "Créer un compte — Jeux d'Hazard" },
      { property: "og:description", content: "Créez votre compte Jeux d'Hazard et débloquez les analyses et prédictions avancées." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RedirectIfAuthed>
      <Signup />
    </RedirectIfAuthed>
  );
}
