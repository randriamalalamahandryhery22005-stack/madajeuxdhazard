import { createFileRoute } from "@tanstack/react-router";
import ForgotPassword from "@/pages/ForgotPassword";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — Jeux d'Hazard" },
      { name: "description", content: "Réinitialisez le mot de passe de votre compte Jeux d'Hazard en quelques étapes." },
      { property: "og:title", content: "Mot de passe oublié — Jeux d'Hazard" },
      { property: "og:description", content: "Réinitialisez le mot de passe de votre compte Jeux d'Hazard en quelques étapes." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ForgotPassword />
  );
}
