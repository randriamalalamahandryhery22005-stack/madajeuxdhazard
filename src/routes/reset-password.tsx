import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Réinitialiser le mot de passe — Jeux d'Hazard" },
      { name: "description", content: "Réinitialisez votre mot de passe après vérification d'identité." },
      { property: "og:title", content: "Réinitialiser le mot de passe — Jeux d'Hazard" },
      { property: "og:description", content: "Réinitialisez votre mot de passe après vérification d'identité." },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <Navigate to="/forgot-password" replace />;
}
