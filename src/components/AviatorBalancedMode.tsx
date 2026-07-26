import { useState, useCallback } from "react";
import { ArrowLeft, Play, BarChart3, Timer, Gauge, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateBalancedPrediction } from "@/lib/predictions";
import type { PredictionResult } from "@/lib/predictions";
import AnalysisSequence from "@/components/AnalysisSequence";
import { useGameStats } from "@/hooks/useGameStats";

const stabilityColor = (s: string) => s === "Haute" ? "text-green-400" : s === "Moyenne" ? "text-amber-400" : "text-red-400";
const riskColor = (r: string) => r === "Faible" ? "text-green-400" : r === "Modéré" ? "text-amber-400" : "text-red-400";
const stabilityBg = (s: string) => s === "Haute" ? "bg-green-500/10 border-green-500/20" : s === "Moyenne" ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";
const riskBg = (r: string) => r === "Faible" ? "bg-green-500/10 border-green-500/20" : r === "Modéré" ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";

interface Props {
  showSeconds: boolean;
  accessStart: string | null;
  accessExpiry: string | null;
  onBack: () => void;
}

const AviatorBalancedMode = ({ showSeconds, accessStart, accessExpiry, onBack }: Props) => {
  const [timeInput, setTimeInput] = useState("");
  const [coeffInput, setCoeffInput] = useState("");
  const [results, setResults] = useState<PredictionResult[] | null>(null);
  const [error, setError] = useState("");
  const [showSplash, setShowSplash] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [pendingPrediction, setPendingPrediction] = useState<{ h: number; m: number; coeff: number } | null>(null);
  const { trackGameUsage } = useGameStats();

  const handlePredict = () => {
    setError("");
    if (!timeInput || !coeffInput) { setError("Remplissez tous les champs"); return; }
    const [h, m] = timeInput.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) { setError("Format invalide"); return; }
    const coeff = parseFloat(coeffInput);
    if (isNaN(coeff) || coeff < 5 || coeff > 25) { setError("Coefficient entre 5.00 et 25.00"); return; }
    setPendingPrediction({ h, m, coeff });
    setShowSplash(true);
  };

  const handleSplashComplete = useCallback(() => {
    if (!pendingPrediction) return;
    const { h, m, coeff } = pendingPrediction;
    setResults(generateBalancedPrediction(h, m, coeff, showSeconds));
    setShowSplash(false);
    setShowPoints(true);
    trackGameUsage("aviator-premium", "balanced");
  }, [pendingPrediction, showSeconds, trackGameUsage]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-amber-950/10">
      {showSplash && (
        <AnalysisSequence
          variant="balanced"
          duration={5000}
          onComplete={handleSplashComplete}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-500/15 bg-gradient-to-r from-amber-500/8 via-card/80 to-orange-500/5">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Timer className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400">Temps Équilibré</span>
          </h1>
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            {accessStart && <span>Début: {new Date(accessStart).toLocaleDateString("fr-FR")}</span>}
            {accessExpiry && <span>· Expire: {new Date(accessExpiry).toLocaleDateString("fr-FR")}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
          <Scale className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-bold text-amber-400">STABLE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {!results && !showSplash && (
          <>
            <div className="p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-card/50 to-orange-500/5" style={{ animation: "fade-up 0.4s ease forwards" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Gauge className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-amber-400">Mode Temps Équilibré</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Prédictions stables avec coefficients de 5.00 à 25.00. Optimisé pour la régularité et la fiabilité.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card/80 border border-amber-500/20 backdrop-blur-sm space-y-4" style={{ animation: "fade-up 0.5s ease forwards" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <h2 className="font-bold text-sm text-amber-400">Paramètres</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Heure (HH:MM)</Label>
                  <Input type="time" value={timeInput} onChange={e => setTimeInput(e.target.value)}
                    className="h-12 bg-secondary/80 border-amber-500/15 text-center font-mono text-base focus:border-amber-500/40" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Coefficient</Label>
                  <Input type="number" step="0.01" min={5} max={25} placeholder="15.00" value={coeffInput} onChange={e => setCoeffInput(e.target.value)}
                    className="h-12 bg-secondary/80 border-amber-500/15 text-center font-mono text-base focus:border-amber-500/40" />
                </div>
              </div>

              {error && <p className="text-destructive text-xs text-center font-medium">{error}</p>}

              <Button
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white shadow-lg shadow-amber-500/20"
                onClick={handlePredict}
              >
                <Play className="w-4 h-4 mr-2" /> Lancer le calcul équilibré
              </Button>
            </div>
          </>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25"
              style={{ animation: "result-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Gauge className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-400">⚖️ Résultats Équilibrés</h3>
                  <p className="text-[10px] text-muted-foreground">{results.length} analyses stables</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
            {results.map((r, i) => (
              <div key={i} className="rounded-2xl bg-card/90 border border-amber-500/25 overflow-hidden flex flex-col"
                style={{ animation: `result-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${200 + i * 120}ms forwards`, opacity: 0 }}>
                {/* Header empilé : heure puis coefficient — pas de chevauchement */}
                <div className="px-2.5 py-2 flex items-center gap-2 bg-gradient-to-r from-amber-500/8 to-transparent border-b border-amber-500/10 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0 flex flex-col leading-tight">
                    <span className="font-mono text-[11px] font-semibold text-muted-foreground truncate">{r.time}</span>
                    <span className="font-mono text-base font-black text-amber-300 truncate">{r.coefficient}</span>
                  </div>
                </div>

                <div className="p-2 flex-1">
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="px-1.5 py-1 rounded-md bg-secondary/40 text-center border border-border/20 min-w-0">
                      <p className="text-[8px] text-muted-foreground uppercase">Conf.</p>
                      <p className="text-xs font-bold text-amber-400">{r.confidence}%</p>
                    </div>
                    <div className="px-1.5 py-1 rounded-md bg-secondary/40 text-center border border-border/20 min-w-0">
                      <p className="text-[8px] text-muted-foreground uppercase">Fiab.</p>
                      <p className="text-xs font-bold text-amber-400">{r.reliability}%</p>
                    </div>
                    <div className={`px-1.5 py-1 rounded-md text-center border min-w-0 ${stabilityBg(r.stability)}`}>
                      <p className="text-[8px] text-muted-foreground uppercase">Stab.</p>
                      <p className={`text-[10px] font-bold truncate ${stabilityColor(r.stability)}`}>{r.stability}</p>
                    </div>
                    <div className={`px-1.5 py-1 rounded-md text-center border min-w-0 ${riskBg(r.risk)}`}>
                      <p className="text-[8px] text-muted-foreground uppercase">Risque</p>
                      <p className={`text-[10px] font-bold truncate ${riskColor(r.risk)}`}>{r.risk}</p>
                    </div>
                  </div>
                </div>

                <div className="px-2.5 pb-2">
                  <div className="h-1.5 rounded-full bg-secondary/80 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-1000"
                      style={{ width: `${r.confidence}%` }} />
                  </div>
                </div>
              </div>
            ))}
            </div>

            <Button variant="premium-outline" className="w-full h-12 mt-2 text-sm" onClick={() => { setResults(null); setError(""); }}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Nouvelle analyse
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AviatorBalancedMode;
