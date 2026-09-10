import { createFileRoute } from "@tanstack/react-router";
import UnifiedCalculator from "@/pages/UnifiedCalculator";
import { RequirePremium } from "@/components/RouteGuards";
export const Route = createFileRoute("/cosmox")({ head: () => ({ meta: [{ title: "CosmoX — Jeux d'Hazard" }, { name: "description", content: "Interface premium dédiée à CosmoX." }] }), component: () => <RequirePremium><UnifiedCalculator defaultGame="cosmox" /></RequirePremium> });
