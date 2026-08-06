
import { useState, useCallback } from "react";
import { ArrowLeft, Play, BarChart3, Zap, Activity, Signal, Radar, Sparkles, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PredictionResult } from "@/lib/predictions";
import { formatCoeff, runLevel1, type HistoryStats } from "@/lib/aviatorLevels";
import AnalysisSequence from "@/components/AnalysisSequence";
import PredictionResults from "@/components/PredictionResults";
import { useGameStats } from "@/hooks/useGameStats";

interface Props {
  showSeconds: boolean;
  accessStart: string | null;
  accessExpiry: string | null;
  stats?: HistoryStats;
  onBack: () => void;
  onNewCapture?: () => void;
}

const RealtimeLogo = () => (
  <div className="luxe-icon-badge luxe-float relative">
    <Radar className="w-5 h-5" strokeWidth={2.4} />
    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00D084] ring-2 ring-[#050505] animate-pulse" />
  </div>
);

type ZoneId = "A" | "B";

interface ZoneState {
  timeInput: string;
  coeffInput: string;
  results: PredictionResult[] | null;
  error: string;
}

const initialZone: ZoneState = { timeInput: "", coeffInput: "", results: null, error: "" };

const FALLBACK_STATS: HistoryStats = {
  count: 0, mean: 2.4, median: 1.9, max: 12, min: 1.01, volatility: 4,
  under2Ratio: 0.5, mid2to5Ratio: 0.32, high5plusRatio: 0.18, extreme20Ratio: 0.04,
  longestBlueStreak: 3, longestHotStreak: 3, roundsSinceHigh: 4, trend: "Stable",
};

const AviatorRealtimeMode = ({ showSeconds, accessStart, accessExpiry, stats, onBack, onNewCapture }: Props) => {
  const [zones, setZones] = useState<Record<ZoneId, ZoneState>>({ A: { ...initialZone }, B: { ...initialZone } });
  const [pending, setPending] = useState<{ zone: ZoneId; h: number; m: number; coeff: number } | null>(null);
  const [showSplash, setShowSplash] = useState(false);
  const { trackGameUsage } = useGameStats();

  const updateZone = (id: ZoneId, patch: Partial<ZoneState>) =>
    setZones((z) => ({ ...z, [id]: { ...z[id], ...patch } }));

  const handlePredict = (id: ZoneId) => {
    const z = zones[id];
    updateZone(id, { error: "" });
    if (!z.timeInput || !z.coeffInput) { updateZone(id, { error: "Remplissez tous les champs" }); return; }
    const [h, m] = z.timeInput.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) { updateZone(id, { error: "Format invalide" }); return; }
    const coeff = parseFloat(z.coeffInput);
    if (isNaN(coeff) || coeff < 5 || coeff > 500) { updateZone(id, { error: "Coefficient entre 5.00 et 500.00" }); return; }
    setPending({ zone: id, h, m, coeff });
    setShowSplash(true);
  };

  const handleReset = (id: ZoneId) => updateZone(id, { ...initialZone });

  const handleSplashComplete = useCallback(() => {
    if (!pending) return;
    const { zone, h, m, coeff } = pending;
    const outcome = runLevel1({ h, m, s: 0, coefficient: coeff, stats: stats ?? FALLBACK_STATS });
    const results: PredictionResult[] = outcome.rows.map((r) => ({
      // Les résultats sont toujours affichés au format HH:MM:SS (secondes générées dynamiquement).
      time: r.time,
      coefficient: formatCoeff(r.coefficient),
      confidence: r.confidence,
      stability: r.stability,
      risk: r.risk,
      reliability: r.reliability,
    }));
    setZones((z) => ({ ...z, [zone]: { ...z[zone], results, error: "" } }));
    setShowSplash(false);
    setPending(null);
    trackGameUsage("aviator-premium", "realtime");
  }, [pending, showSeconds, stats, trackGameUsage]);

  const renderZone = (id: ZoneId, label: string) => {
    const z = zones[id];
    return (
      <ZoneCard
        id={id}
        label={label}
        state={z}
        disabled={showSplash}
        onChangeTime={(v) => updateZone(id, { timeInput: v })}
        onChangeCoeff={(v) => updateZone(id, { coeffInput: v })}
        onPredict={() => handlePredict(id)}
        onReset={() => handleReset(id)}
        onClearResults={() => updateZone(id, { results: null, error: "" })}
      />
    );
  };


  return (
    <div className="min-h-screen flex flex-col luxe-page">
      {showSplash && (
        <AnalysisSequence
          variant="premium-realtime"
          duration={5000}
          onComplete={handleSplashComplete}
        />
      )}

      <div className="px-4 pt-4">
        <div className="luxe-header luxe-ring flex items-center gap-3">
          <button onClick={onBack} className="luxe-back" aria-label="Retour">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <RealtimeLogo />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg luxe-title leading-tight">Temps Réel</h1>
            <p className="text-[10px] text-white/60 flex items-center gap-1.5 truncate mt-0.5">
              <Zap className="w-3 h-3 luxe-emerald" /> Double zone d'analyse · Aviator Premium
            </p>
          </div>
          <span className="luxe-badge-live">LIVE</span>
          {onNewCapture && (
            <button onClick={onNewCapture} className="luxe-back ml-1" aria-label="Nouvelle capture">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
        {(accessStart || accessExpiry) && (
          <div className="mt-2 flex gap-3 px-2 text-[10px] text-white/40">
            {accessStart && <span>Début · {new Date(accessStart).toLocaleDateString("fr-FR")}</span>}
            {accessExpiry && <span>Expire · {new Date(accessExpiry).toLocaleDateString("fr-FR")}</span>}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Coeff. min", value: "5.00", icon: Activity },
            { label: "Coeff. max", value: "500", icon: Sparkles },
            { label: "Fiabilité", value: "97%", icon: Signal },
          ].map((k) => (
            <div key={k.label} className="luxe-stat">
              <k.icon className="w-4 h-4 luxe-emerald mx-auto mb-1.5" />
              <p className="text-xl font-black luxe-gold-text leading-none">{k.value}</p>
              <p className="text-[9px] uppercase tracking-widest text-white/50 mt-1.5 font-semibold">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="luxe-card px-4 py-3 flex items-center gap-3">
          <div className="luxe-icon-badge shrink-0"><BarChart3 className="w-4 h-4" /></div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm luxe-emerald-text leading-tight">Paramètres d'analyse</h2>
            <p className="text-[10px] text-white/55">Utilisez une ou les deux zones — elles sont indépendantes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderZone("A", "Analyse gauche")}
          {renderZone("B", "Analyse droite")}
        </div>
      </div>
    </div>
  );
};

interface ZoneCardProps {
  id: ZoneId;
  label: string;
  state: ZoneState;
  disabled: boolean;
  onChangeTime: (v: string) => void;
  onChangeCoeff: (v: string) => void;
  onPredict: () => void;
  onReset: () => void;
  onClearResults: () => void;
}

const ZoneCard = ({ id, label, state, disabled, onChangeTime, onChangeCoeff, onPredict, onReset, onClearResults }: ZoneCardProps) => {
  const hasInput = !!(state.results || state.timeInput || state.coeffInput);
  return (
    <div className="luxe-card luxe-card-emerald flex flex-col">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#F4C542]/12">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl luxe-icon-badge text-sm font-black">
            {id}
          </div>
          <div>
            <p className="text-[12px] font-bold text-white leading-tight">{label}</p>
            <p className="text-[9px] uppercase tracking-widest luxe-emerald opacity-80">Zone indépendante</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="luxe-badge-live scale-90 origin-right">LIVE</span>
          {hasInput && (
            <button
              onClick={onReset}
              className="p-1.5 rounded-md hover:bg-[#F4C542]/10 text-white/50 hover:luxe-gold transition-colors"
              aria-label="Réinitialiser"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/55 uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <Clock className="w-3 h-3 luxe-gold" /> Heure
          </Label>
          <Input
            type="time"
            value={state.timeInput}
            onChange={(e) => onChangeTime(e.target.value)}
            className="luxe-input h-12 text-center font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/55 uppercase tracking-widest font-semibold">
            Coefficient
          </Label>
          <Input
            type="number"
            step="0.01"
            min={5}
            max={500}
            placeholder="25.00"
            value={state.coeffInput}
            onChange={(e) => onChangeCoeff(e.target.value)}
            className="luxe-input h-12 text-center font-mono text-base"
          />
        </div>

        {state.error && <p className="text-destructive text-[11px] text-center font-medium">{state.error}</p>}

        <Button
          className="luxe-btn w-full h-12 text-sm"
          onClick={onPredict}
          disabled={disabled}
        >
          <Play className="w-4 h-4 mr-2" /> Analyser
        </Button>
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-2xl border border-[#00D084]/18 bg-black/40 min-h-[150px] p-3">
          {state.results ? (
            <PredictionResults
              results={state.results}
              title={`Zone ${id}`}
              variant="realtime"
              onBack={onClearResults}
            />
          ) : (
            <div className="h-full min-h-[130px] flex flex-col items-center justify-center text-center gap-2 text-white/55">
              <div className="relative">
                <div className="w-11 h-11 rounded-full border border-[#00D084]/35 flex items-center justify-center animate-pulse">
                  <BarChart3 className="w-5 h-5 luxe-emerald" />
                </div>
                <span className="absolute inset-0 rounded-full border border-[#F4C542]/30 animate-ping opacity-40" />
              </div>
              <p className="text-[12px] font-semibold text-white/80">En attente d'analyse</p>
              <p className="text-[10px] text-white/45">Les résultats de la zone {id} s'afficheront ici</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AviatorRealtimeMode;
