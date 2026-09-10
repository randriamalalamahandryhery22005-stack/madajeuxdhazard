import { createFileRoute } from "@tanstack/react-router";
import UnifiedCalculator from "@/pages/UnifiedCalculator";
import { RequirePremium } from "@/components/RouteGuards";
export const Route = createFileRoute("/jetx")({ head: () => ({ meta: [{ title: "JetX — Jeux d'Hazard" }, { name: "description", content: "Interface premium dédiée à JetX." }] }), component: () => <RequirePremium><UnifiedCalculator defaultGame="jetx" /></RequirePremium> });
