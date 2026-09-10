import { createFileRoute } from "@tanstack/react-router";
import UnifiedCalculator from "@/pages/UnifiedCalculator";
import { RequireAuth } from "@/components/RouteGuards";
export const Route = createFileRoute("/aviator/basic")({ head: () => ({ meta: [{ title: "Aviator — Jeux d'Hazard" }]), component: () => <RequireAuth><UnifiedCalculator defaultGame="aviator" /></RequireAuth> });
