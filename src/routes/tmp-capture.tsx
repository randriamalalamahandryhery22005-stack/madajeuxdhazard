import { createFileRoute } from "@tanstack/react-router";
import GamePredictionResults from "@/components/game/GamePredictionResults";
import PredictionResults from "@/components/PredictionResults";
import type { PredictionResult } from "@/lib/predictions";

export const Route = createFileRoute("/tmp-capture")({
  component: () => (
    <div className="min-h-screen bg-background p-4 space-y-8">
      <section className="max-w-3xl mx-auto space-y-3">
        <h2 className="text-sm font-bold">Current shared renderer — Aviator (3 rows)</h2>
        <GamePredictionResults
          title="Résultats Aviator"
          tone="aviator"
          rows={[
            { time: "14:32:00", coefficient: "3.25x", confidence: 84, reliability: 78, stability: "Haute", risk: "Faible", label: "Fenêtre estimée" },
            { time: "15:10:00", coefficient: "2.87x", confidence: 79, reliability: 72, stability: "Moyenne", risk: "Modéré", label: "Fenêtre estimée" },
            { time: "15:48:00", coefficient: "4.12x", confidence: 88, reliability: 81, stability: "Haute", risk: "Faible", label: "Indice" },
          ]}
          onRestart={() => {}}
        />
        <h2 className="text-sm font-bold">Legacy renderer — JetX variant (1 row)</h2>
        <div className="max-w-md">
          <PredictionResults
            title="JetX"
            variant="jetx"
            results={[
              { time: "18:45:22", coefficient: "6.40x", confidence: 91, reliability: 85, stability: "Haute", risk: "Faible" } as PredictionResult,
            ]}
            onBack={() => {}}
          />
        </div>
      </section>
    </div>
  ),
});
