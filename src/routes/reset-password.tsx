import { createFileRoute } from "@tanstack/react-router";
import ResetPassword from "@/pages/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Réinitialiser le mot de passe — Jeux d'Hazard" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre compte Jeux d'Hazard." },
      { property: "og:title", content: "Réinitialiser le mot de passe — Jeux d'Hazard" },
      { property: "og:description", content: "Définissez un nouveau mot de passe pour votre compte Jeux d'Hazard." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ResetPassword />
  );
}
