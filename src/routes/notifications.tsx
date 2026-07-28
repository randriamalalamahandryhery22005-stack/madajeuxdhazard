import { createFileRoute } from "@tanstack/react-router";
import NotificationsPage from "@/pages/Notifications";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Jeux d'Hazard" },
      { name: "description", content: "Toutes vos notifications de l'application Jeux d'Hazard en temps réel." },
      { property: "og:title", content: "Notifications — Jeux d'Hazard" },
      { property: "og:description", content: "Toutes vos notifications de l'application Jeux d'Hazard en temps réel." },
    ],
  }),
  component: NotificationsPage,
});
