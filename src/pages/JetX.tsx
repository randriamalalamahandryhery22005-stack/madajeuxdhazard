import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Rocket, BarChart3, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCoefficientPrecise } from "@/lib/predictions";
import PredictionResults from "@/components/PredictionResults";
import PremiumPaywall from "@/components/PremiumPaywall";
import AnalysisDashboard from "@/components/AnalysisDashboard";
import AnalysisSequence from "@/components/AnalysisSequence";

import { PREMIUM_GAME_MODES, computeTrial } from "@/lib/premiumAccess";

import type { PredictionResult } from "@/lib/predictions";

// JetX prediction engine - similar to Aviator but with JetX-specific ranges
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  between(min: number, max: number) { return min + this.next() * (max - min); }
  floor(min: number, max: number) { return Math.floor(this.between(min, max)); }
}

const makeSeed = (a: number, b: number, c: number) =>
  Math.abs(((a * 2654435761) ^ (b * 2246822519) ^ (c * 3266489917)) % 2147483647) || 1;

const generateJetXPrediction = (hour: number, minute: number, coefficient: number, _showSeconds = true): PredictionResult[] => {
  const rng = new SeededRandom(makeSeed(hour * 60 + minute, Math.round(coefficient * 1000), 7919));
  let totalSeconds = hour * 3600 + minute * 60;

  const minCoeff = 3.00;
  const maxCoeff = 10.00;

  let addSeconds: number;
  if (coefficient < 3) addSeconds = 90 + rng.floor(-5, 15);
  else if (coefficient < 6) addSeconds = 120 + rng.floor(-8, 15);
  else if (coefficient < 15) addSeconds = 150 + rng.floor(-5, 25);
  else addSeconds = 180 + rng.floor(-10, 40);

  totalSeconds += addSeconds;
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  // Distribution équilibrée [3.00, 10.00]
  const span = maxCoeff - minCoeff;
  const r = rng.next();
  let raw: number;
  if (r < 0.45) raw = minCoeff + rng.next() * (span / 3);
  else if (r < 0.80) raw = minCoeff + span / 3 + rng.next() * (span / 3);
  else raw = minCoeff + (2 * span) / 3 + rng.next() * (span / 3);
  const resultCoeff = Math.max(minCoeff, Math.min(maxCoeff, raw));

  const baseConf = resultCoeff < 2 ? 76 : resultCoeff < 3.5 ? 68 : resultCoeff < 6 ? 58 : 48;
  const confidence = Math.min(94, Math.max(50, baseConf + rng.floor(-3, 10)));
  const stability: "Haute" | "Moyenne" | "Basse" = resultCoeff < 2 ? (confidence > 70 ? "Haute" : "Moyenne") : resultCoeff < 4 ? "Moyenne" : (confidence > 65 ? "Moyenne" : "Basse");
  const risk: "Faible" | "Modéré" | "Élevé" = resultCoeff < 2 ? "Faible" : resultCoeff < 4 ? "Modéré" : "Élevé";

  return [{
    time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    coefficient: formatCoefficientPrecise(resultCoeff),
    confidence,
    stability,
    risk,
    reliability: Math.min(94, Math.max(48, (resultCoeff < 2 ? 78 : resultCoeff < 4 ? 65 : 52) + rng.floor(-4, 9))),
  }];
};

const JetX = () => {
  const navigate = useNavigate();
  const { user, isAdmin, profile } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [subEnabled, setSubEnabled] = useState(false);
  const [showSeconds, setShowSeconds] = useState(true);
  const [timeInput, setTimeInput] = useState("");
  const [coeffInput, setCoeffInput] = useState("");
  const [results, setResults] = useState<PredictionResult[] | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [accessExpiry, setAccessExpiry] = useState<string | null>(null);
  const [accessStart, setAccessStart] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(false);
  const [pending, setPending] = useState<{ h: number; m: number; coeff: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    checkAccess();
    supabase.from("activation_codes").select("code_value").eq("code_name", "seconds_jetx").maybeSingle()
      .then(({ data }) => setShowSeconds(data?.code_value === "enabled"));
    supabase.from("activation_codes").select("code_value").eq("code_name", "sub_jetx").maybeSingle()
      .then(({ data }) => setSubEnabled(data?.code_value === "enabled"));
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;
    const trial = computeTrial(profile?.trial_started_at ?? null);
    if (isAdmin || trial.active) { setHasAccess(true); return; }
    const { data } = await supabase
      .from("game_access").select("*")
      .eq("user_id", user.id)
      .in("game_mode", PREMIUM_GAME_MODES as unknown as string[])
      .eq("is_active", true);
    const active = data?.find(d => !!d.granted_by && (!d.expires_at || new Date(d.expires_at) > new Date()));
    if (active) { setHasAccess(true); setAccessExpiry(active.expires_at); setAccessStart(active.granted_at); }
    else setHasAccess(false);
  };

  if (!user) { navigate("/login"); return null; }

  const handlePredict = () => {
    setError("");
    if (!timeInput || !coeffInput) { setError("Remplissez tous les champs"); return; }
    const [h, m] = timeInput.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) { setError("Format invalide"); return; }
    const coeff = parseFloat(coeffInput);
    if (isNaN(coeff) || coeff < 1.5 || coeff > 100) { setError("Coefficient entre 1.50 et 100.00"); return; }
    setPending({ h, m, coeff });
    setShowSplash(true);
  };

  const handleSplashComplete = useCallback(() => {
    if (!pending) return;
    const { h, m, coeff } = pending;
    const r = generateJetXPrediction(h, m, coeff, showSeconds);
    setResults(r);
    setHistory((prev) => [...prev, ...r.map((x) => parseFloat(String(x.coefficient).replace(",", ".")))].slice(-100));
    setShowSplash(false);
  }, [pending, showSeconds]);


  if (hasAccess === null) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!hasAccess && subEnabled) {
    return <PremiumPaywall gameName="JetX" icon={<Rocket className="w-5 h-5 text-amber-400" />} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {showSplash && (
        <AnalysisSequence variant="jetx" duration={5000} onComplete={handleSplashComplete} />
      )}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
        <button onClick={() => navigate("/games")} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Rocket className="w-5 h-5 text-amber-400" /> JetX
          </h1>
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            {accessStart && <span>Début: {new Date(accessStart).toLocaleDateString("fr-FR")}</span>}
            {accessExpiry && <span>· Expire: {new Date(accessExpiry).toLocaleDateString("fr-FR")}</span>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        <div className="px-5 space-y-6">

        {/* Analyse du tour actuel — dédiée */}
        <button
          onClick={() => navigate("/analyse/jetx")}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-card to-card border border-amber-400/40 hover:border-amber-400/70 transition-all active:scale-[0.98]"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-500 flex items-center justify-center shrink-0 shadow-lg">
            <Radar className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-bold text-sm">Analyse du tour actuel</p>
            <p className="text-[10px] text-muted-foreground leading-snug">Verdict IA à partir d'une capture</p>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 shrink-0">Lancer</span>
        </button>

        {!results && (
          <div className="p-5 rounded-2xl bg-card/80 border border-amber-500/30 backdrop-blur-sm space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-500 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-bold text-sm text-amber-400">Prédiction JetX</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Heure (HH:MM)</Label>
                <Input type="time" value={timeInput} onChange={e => setTimeInput(e.target.value)} className="h-12 bg-secondary/80 border-border/40 text-center font-mono text-base" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Coefficient</Label>
                <Input type="number" step="0.01" min={1.5} max={100} placeholder="5.00" value={coeffInput} onChange={e => setCoeffInput(e.target.value)} className="h-12 bg-secondary/80 border-border/40 text-center font-mono text-base" />
              </div>
            </div>
            {error && <p className="text-destructive text-xs text-center font-medium">{error}</p>}
            <Button className="w-full h-12 text-sm bg-gradient-to-r from-amber-500 to-amber-500 hover:from-amber-400 hover:to-amber-400 text-white font-bold shadow-lg" onClick={handlePredict}>
              <Play className="w-4 h-4 mr-2" /> Générer les prédictions
            </Button>
          </div>
        )}

        {results && (
          <div className="space-y-5">
            <AnalysisDashboard
              history={history}
              nextCoefficient={parseFloat(String(results[0].coefficient).replace(",", "."))}
              tone="jetx"
              label="JetX"
            />
            <PredictionResults results={results} title="🚀 JetX" variant="jetx" onBack={() => { setResults(null); setError(""); }} />
          </div>
        )}
        </div>
      </div>
      <div className="h-20" />
      <BottomNav />
    </div>
  );
};

export default JetX;
