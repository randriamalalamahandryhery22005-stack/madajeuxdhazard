
import { useState, useCallback } from "react";
import { ArrowLeft, Play, BarChart3, Zap, Activity, Signal, Radar, Sparkles, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePremiumPrediction } from "@/lib/predictions";
import type { PredictionResult } from "@/lib/predictions";
import AnalysisSequence from "@/components/AnalysisSequence";
import PredictionResults from "@/components/PredictionResults";
import { useGameStats } from "@/hooks/useGameStats";

interface Props {
  showSeconds: boolean;
  accessStart: string | null;
  accessExpiry: string | null;
  onBack: () => void;
}

const RealtimeLogo = () => (
  <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/40 ring-1 ring-emerald-300/30">
    <Radar className="w-5 h-5 text-white drop-shadow" />
    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-300 border-2 border-background animate-pulse" />
    <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
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

const AviatorRealtimeMode = ({ showSeconds, accessStart, accessExpiry, onBack }: Props) => {
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
    const results = generatePremiumPrediction(h, m, coeff, showSeconds);
    setZones((z) => ({ ...z, [zone]: { ...z[zone], results, error: "" } }));
    setShowSplash(false);
    setPending(null);
    trackGameUsage("aviator-premium", "realtime");
  }, [pending, showSeconds, trackGameUsage]);

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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-emerald-950/15">
      {showSplash && (
        <AnalysisSequence
          variant="premium-realtime"
          duration={5000}
          onComplete={handleSplashComplete}
        />
      )}

      <div className="relative overflow-hidden border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-card/90 to-emerald-500/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_hsl(160_85%_45%/0.15),transparent_55%)] pointer-events-none" />
        <div className="relative flex items-center gap-3 px-5 py-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <RealtimeLogo />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black flex items-center gap-2">
              <span className="bg-gradient-to-r from-emerald-300 via-emerald-200 to-green-300 bg-clip-text text-transparent">Temps Réel</span>
            </h1>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 truncate">
              <Zap className="w-3 h-3 text-emerald-400" /> Double zone d'analyse · Aviator Premium
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-300 tracking-wider">LIVE</span>
          </div>
        </div>
        {(accessStart || accessExpiry) && (
          <div className="relative flex gap-2 px-5 pb-2 text-[10px] text-muted-foreground">
            {accessStart && <span>Début · {new Date(accessStart).toLocaleDateString("fr-FR")}</span>}
            {accessExpiry && <span>Expire · {new Date(accessExpiry).toLocaleDateString("fr-FR")}</span>}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Coeff. min", value: "5.00", icon: Activity },
            { label: "Coeff. max", value: "500", icon: Sparkles },
            { label: "Fiabilité", value: "97%", icon: Signal },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-card/60 p-3 text-center">
              <k.icon className="w-3.5 h-3.5 text-emerald-300 mx-auto mb-1" />
              <p className="text-base font-black text-emerald-200">{k.value}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-emerald-300 leading-tight">Paramètres d'analyse</h2>
            <p className="text-[10px] text-muted-foreground">Utilisez une ou les deux zones — elles sont indépendantes</p>
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
    <div className="rounded-2xl border border-emerald-500/25 bg-card/80 backdrop-blur-sm shadow-lg shadow-emerald-500/5 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/15 bg-gradient-to-r from-emerald-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-black text-xs">
            {id}
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-200 leading-tight">{label}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Zone indépendante</p>
          </div>
        </div>
        {hasInput && (
          <button
            onClick={onReset}
            className="p-1.5 rounded-md hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-300 transition-colors"
            aria-label="Réinitialiser"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Heure
          </Label>
          <Input
            type="time"
            value={state.timeInput}
            onChange={(e) => onChangeTime(e.target.value)}
            className="h-11 bg-secondary/80 border-emerald-500/20 text-center font-mono text-sm focus:border-emerald-500/50"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
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
            className="h-11 bg-secondary/80 border-emerald-500/20 text-center font-mono text-sm focus:border-emerald-500/50"
          />
        </div>

        {state.error && <p className="text-destructive text-[11px] text-center font-medium">{state.error}</p>}

        <Button
          className="w-full h-11 text-xs font-bold bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white shadow-md shadow-emerald-500/25 transition-all active:scale-[0.98]"
          onClick={onPredict}
          disabled={disabled}
        >
          <Play className="w-3.5 h-3.5 mr-1.5" /> Analyser
        </Button>
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-xl border border-emerald-500/15 bg-background/40 min-h-[140px] p-3">
          {state.results ? (
            <PredictionResults
              results={state.results}
              title={`Zone ${id}`}
              variant="realtime"
              onBack={onClearResults}
            />
          ) : (
            <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center gap-1.5 text-muted-foreground">
              <Signal className="w-5 h-5 opacity-40" />
              <p className="text-[11px]">En attente d'analyse</p>
              <p className="text-[9px] opacity-70">Les résultats de la zone {id} s'afficheront ici</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AviatorRealtimeMode;

