import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Rocket, BarChart3, Radar, Brain, Zap, Target } from "lucide-react";
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
    return <div className="min-h-screen flex items-center justify-center luxe-page"><div className="w-8 h-8 border-2 border-[#F4C542]/30 border-t-[#F4C542] rounded-full animate-spin" /></div>;
  }

  if (!hasAccess && subEnabled) {
    return <PremiumPaywall gameName="JetX" icon={<Rocket className="w-5 h-5 luxe-gold" />} />;
  }

  return (
    <div className="min-h-screen flex flex-col luxe-page">
      {showSplash && (
        <AnalysisSequence variant="jetx" duration={5000} onComplete={handleSplashComplete} />
      )}
      <div className="px-4 pt-4">
        <div className="luxe-header luxe-ring flex items-center gap-3">
          <button onClick={() => navigate("/games")} className="luxe-back" aria-label="Retour">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="luxe-icon-badge luxe-icon-badge-gold luxe-float">
            <Rocket className="w-5 h-5" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg luxe-title leading-tight flex items-center gap-2">
              JetX <span className="luxe-badge-premium">Premium</span>
            </h1>
            <div className="flex gap-2 text-[10px] text-white/55 mt-0.5">
              {accessStart && <span>Début · {new Date(accessStart).toLocaleDateString("fr-FR")}</span>}
              {accessExpiry && <span>Expire · {new Date(accessExpiry).toLocaleDateString("fr-FR")}</span>}
            </div>
          </div>
          <span className="luxe-badge-live">LIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-5 space-y-5">
        <div className="px-4 space-y-5">

        <button
          onClick={() => navigate("/analyse/jetx")}
          className="w-full flex items-center gap-3 p-4 luxe-card luxe-card-gold transition-transform active:scale-[0.98]"
        >
          <div className="luxe-icon-badge luxe-icon-badge-gold shrink-0">
            <Radar className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-bold text-sm text-white">Analyse du tour actuel</p>
            <p className="text-[10px] text-white/55 leading-snug">Verdict IA à partir d'une capture</p>
          </div>
          <span className="luxe-badge-premium shrink-0">Lancer</span>
        </button>

        {!results && (
          <div className="luxe-card luxe-card-lg luxe-card-gold p-5 space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div className="flex items-center gap-2.5">
              <div className="luxe-icon-badge luxe-icon-badge-gold"><BarChart3 className="w-4 h-4" /></div>
              <h2 className="font-bold text-sm luxe-gold-text">Prédiction JetX</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-white/55 uppercase tracking-widest font-semibold">Heure (HH:MM)</Label>
                <Input type="time" value={timeInput} onChange={e => setTimeInput(e.target.value)} className="luxe-input h-12 text-center font-mono text-base" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-white/55 uppercase tracking-widest font-semibold">Coefficient</Label>
                <Input type="number" step="0.01" min={1.5} max={100} placeholder="5.00" value={coeffInput} onChange={e => setCoeffInput(e.target.value)} className="luxe-input h-12 text-center font-mono text-base" />
              </div>
            </div>
            {error && <p className="text-destructive text-xs text-center font-medium">{error}</p>}
            <Button className="luxe-btn w-full h-12 text-sm" onClick={handlePredict}>
              <Play className="w-4 h-4 mr-2" /> Générer les prédictions
            </Button>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { icon: Brain, label: "IA avancée", d: "Puissante" },
                { icon: Zap, label: "Rapide", d: "Instantané" },
                { icon: Target, label: "Précis", d: "Haute fiabilité" },
              ].map(({ icon: Icon, label, d }) => (
                <div key={label} className="luxe-stat">
                  <Icon className="w-4 h-4 luxe-emerald mx-auto mb-1" />
                  <p className="text-[11px] font-bold luxe-gold-text leading-none">{label}</p>
                  <p className="text-[9px] text-white/50 mt-1">{d}</p>
                </div>
              ))}
            </div>
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
