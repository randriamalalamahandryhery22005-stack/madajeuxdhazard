import { createFileRoute } from "@tanstack/react-router";
import UnifiedCalculator from "@/pages/UnifiedCalculator";
import { RequirePremium } from "@/components/RouteGuards";
export const Route = createFileRoute("/aviator/pro")({ head: () => ({ meta: [{ title: "Aviator — Jeux d'Hazard" }]), component: () => <RequirePremium><UnifiedCalculator defaultGame="aviator" /></RequirePremium> });
