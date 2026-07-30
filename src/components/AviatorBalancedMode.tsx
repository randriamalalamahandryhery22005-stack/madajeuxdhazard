import { useState, useCallback } from "react";
import { ArrowLeft, Play, BarChart3, Timer, Gauge, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateBalancedPrediction } from "@/lib/predictions";
import type { PredictionResult } from "@/lib/predictions";
import AnalysisSequence from "@/components/AnalysisSequence";
import { useGameStats } from "@/hooks/useGameStats";

const stabilityColor = (s: string) => s === "Haute" ? "text-[#6BF0BA]" : s === "Moyenne" ? "text-[#F4C542]" : "text-red-400";
const riskColor = (r: string) => r === "Faible" ? "text-[#6BF0BA]" : r === "Modéré" ? "text-[#F4C542]" : "text-red-400";
const stabilityBg = (s: string) => s === "Haute" ? "bg-[#00D084]/10 border-[#00D084]/25" : s === "Moyenne" ? "bg-[#F4C542]/10 border-[#F4C542]/25" : "bg-red-500/10 border-red-500/25";
const riskBg = (r: string) => r === "Faible" ? "bg-[#00D084]/10 border-[#00D084]/25" : r === "Modéré" ? "bg-[#F4C542]/10 border-[#F4C542]/25" : "bg-red-500/10 border-red-500/25";

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
    <div className="min-h-screen flex flex-col luxe-page">
      {showSplash && (
        <AnalysisSequence
          variant="balanced"
          duration={5000}
          onComplete={handleSplashComplete}
        />
      )}

      <div className="px-4 pt-4">
        <div className="luxe-header luxe-ring flex items-center gap-3">
          <button onClick={onBack} className="luxe-back" aria-label="Retour">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="luxe-icon-badge-gold luxe-icon-badge luxe-float">
            <Timer className="w-5 h-5" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg luxe-title leading-tight">Temps Équilibré</h1>
            <div className="flex gap-2 text-[10px] text-white/55 mt-0.5">
              {accessStart && <span>Début · {new Date(accessStart).toLocaleDateString("fr-FR")}</span>}
              {accessExpiry && <span>Expire · {new Date(accessExpiry).toLocaleDateString("fr-FR")}</span>}
            </div>
          </div>
          <span className="luxe-badge-premium"><Scale className="w-3 h-3" /> STABLE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {!results && !showSplash && (
          <>
            <div className="luxe-card luxe-card-gold p-4" style={{ animation: "fade-up 0.4s ease forwards" }}>
              <div className="flex items-start gap-3">
                <div className="luxe-icon-badge luxe-icon-badge-gold shrink-0">
                  <Gauge className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold luxe-gold-text">Mode Temps Équilibré</h3>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Prédictions stables avec coefficients de 5.00 à 25.00. Optimisé pour la régularité et la fiabilité.
                  </p>
                </div>
              </div>
            </div>

            <div className="luxe-card luxe-card-lg p-5 space-y-4" style={{ animation: "fade-up 0.5s ease forwards" }}>
              <div className="flex items-center gap-2.5">
                <div className="luxe-icon-badge luxe-icon-badge-gold"><BarChart3 className="w-4 h-4" /></div>
                <h2 className="font-bold text-sm luxe-gold-text">Paramètres</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-white/55 uppercase tracking-widest font-semibold">Heure (HH:MM)</Label>
                  <Input type="time" value={timeInput} onChange={e => setTimeInput(e.target.value)}
                    className="luxe-input h-12 text-center font-mono text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-white/55 uppercase tracking-widest font-semibold">Coefficient</Label>
                  <Input type="number" step="0.01" min={5} max={25} placeholder="15.00" value={coeffInput} onChange={e => setCoeffInput(e.target.value)}
                    className="luxe-input h-12 text-center font-mono text-base" />
                </div>
              </div>

              {error && <p className="text-destructive text-xs text-center font-medium">{error}</p>}

              <Button
                className="luxe-btn w-full h-12 text-sm"
                onClick={handlePredict}
              >
                <Play className="w-4 h-4 mr-2" /> Lancer le calcul équilibré
              </Button>
            </div>
          </>
        )}

        {results && (
          <div className="space-y-4">
            <div className="luxe-card luxe-card-gold p-4"
              style={{ animation: "result-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
              <div className="flex items-center gap-2.5">
                <div className="luxe-icon-badge luxe-icon-badge-gold"><Gauge className="w-4 h-4" /></div>
                <div>
                  <h3 className="text-sm font-bold luxe-gold-text">Résultats Équilibrés</h3>
                  <p className="text-[10px] text-white/55">{results.length} analyses stables</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
            {results.map((r, i) => (
              <div key={i} className="luxe-card luxe-card-gold flex flex-col overflow-hidden"
                style={{ animation: `result-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${200 + i * 120}ms forwards`, opacity: 0 }}>
                <div className="px-2.5 py-2 flex items-center gap-2 border-b border-[#F4C542]/15 min-w-0">
                  <div className="w-7 h-7 rounded-lg luxe-icon-badge luxe-icon-badge-gold text-[11px] font-bold flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0 flex flex-col leading-tight">
                    <span className="font-mono text-[11px] font-semibold text-white/55 truncate">{r.time}</span>
                    <span className="font-mono text-base font-black luxe-gold-text truncate">{r.coefficient}</span>
                  </div>
                </div>

                <div className="p-2 flex-1">
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="px-1.5 py-1 rounded-md bg-black/30 text-center border border-white/10 min-w-0">
                      <p className="text-[8px] text-white/50 uppercase">Conf.</p>
                      <p className="text-xs font-bold luxe-gold">{r.confidence}%</p>
                    </div>
                    <div className="px-1.5 py-1 rounded-md bg-black/30 text-center border border-white/10 min-w-0">
                      <p className="text-[8px] text-white/50 uppercase">Fiab.</p>
                      <p className="text-xs font-bold luxe-gold">{r.reliability}%</p>
                    </div>
                    <div className={`px-1.5 py-1 rounded-md text-center border min-w-0 ${stabilityBg(r.stability)}`}>
                      <p className="text-[8px] text-white/50 uppercase">Stab.</p>
                      <p className={`text-[10px] font-bold truncate ${stabilityColor(r.stability)}`}>{r.stability}</p>
                    </div>
                    <div className={`px-1.5 py-1 rounded-md text-center border min-w-0 ${riskBg(r.risk)}`}>
                      <p className="text-[8px] text-white/50 uppercase">Risque</p>
                      <p className={`text-[10px] font-bold truncate ${riskColor(r.risk)}`}>{r.risk}</p>
                    </div>
                  </div>
                </div>

                <div className="px-2.5 pb-2">
                  <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#00D084] to-[#F4C542] transition-all duration-1000"
                      style={{ width: `${r.confidence}%` }} />
                  </div>
                </div>
              </div>
            ))}
            </div>

            <Button className="luxe-btn-outline w-full h-12 mt-2 text-sm" onClick={() => { setResults(null); setError(""); }}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Nouvelle analyse
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AviatorBalancedMode;
