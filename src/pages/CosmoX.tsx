import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, BarChart3, Sparkles, Radar, Brain, Signal, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateCosmoXPrediction } from "@/lib/predictions";
import PredictionResults from "@/components/PredictionResults";
import PremiumPaywall from "@/components/PremiumPaywall";
import AnalysisDashboard from "@/components/AnalysisDashboard";
import AnalysisSequence from "@/components/AnalysisSequence";

import { PREMIUM_GAME_MODES, computeTrial } from "@/lib/premiumAccess";

import type { PredictionResult } from "@/lib/predictions";

const CosmoX = () => {
  const navigate = useNavigate();
  const { user, isAdmin, profile } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [subEnabled, setSubEnabled] = useState(true);
  const [timeInput, setTimeInput] = useState("");
  const [coeffInput, setCoeffInput] = useState("");
  const [results, setResults] = useState<PredictionResult[] | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [showSeconds, setShowSeconds] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const [pending, setPending] = useState<{ h: number; m: number; s: number; coeff: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    checkAccess();
    supabase.from("activation_codes").select("code_value").eq("code_name", "seconds_cosmox").maybeSingle()
      .then(({ data }) => setShowSeconds(data?.code_value === "enabled"));
    supabase.from("activation_codes").select("code_value").eq("code_name", "sub_cosmox").maybeSingle()
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
    setHasAccess(!!active);
  };

  

  const handlePredict = () => {
    setError("");
    if (!timeInput || !coeffInput) { setError("Veuillez remplir tous les champs"); return; }
    const parts = timeInput.split(":");
    const h = parseInt(parts[0]), m = parseInt(parts[1]), s = parseInt(parts[2] || "0");
    if (isNaN(h) || isNaN(m) || isNaN(s)) { setError("Format invalide (HH:MM:SS)"); return; }
    const coeff = parseFloat(coeffInput);
    if (isNaN(coeff) || coeff < 1 || coeff > 50) { setError("Coefficient entre 1.00 et 50.00"); return; }
    setPending({ h, m, s, coeff });
    setShowSplash(true);
  };

  const handleSplashComplete = useCallback(() => {
    if (!pending) return;
    const { h, m, s, coeff } = pending;
    const r = generateCosmoXPrediction(h, m, s, coeff, showSeconds);
    setResults(r);
    setHistory((prev) => [...prev, ...r.map((x) => parseFloat(String(x.coefficient).replace(",", ".")))].slice(-100));
    setShowSplash(false);
  }, [pending, showSeconds]);

  if (!user) { navigate("/login"); return null; }

  if (hasAccess === null) {
    return <div className="min-h-screen flex items-center justify-center luxe-page"><div className="w-8 h-8 border-2 border-[#00D084]/30 border-t-[#00D084] rounded-full animate-spin" /></div>;
  }

  if (!hasAccess && subEnabled) {
    return <PremiumPaywall gameName="CosmoX" icon={<Sparkles className="w-5 h-5 luxe-emerald" />} />;
  }

  return (
    <div className="min-h-screen flex flex-col luxe-page">
      {showSplash && (
        <AnalysisSequence variant="cosmox" duration={5000} onComplete={handleSplashComplete} />
      )}
      <div className="px-4 pt-4">
        <div className="luxe-header luxe-ring flex items-center gap-3">
          <button onClick={() => navigate("/games")} className="luxe-back" aria-label="Retour">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="luxe-icon-badge luxe-float">
            <Sparkles className="w-5 h-5" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg luxe-title leading-tight flex items-center gap-2">
              CosmoX <span className="luxe-badge-premium">Premium</span>
            </h1>
            <p className="text-[10px] luxe-emerald uppercase tracking-widest mt-0.5 opacity-80">Prédictions cosmiques</p>
          </div>
          <span className="luxe-badge-live">LIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-5 space-y-5">
        <div className="px-4 space-y-5">

        <button
          onClick={() => navigate("/analyse/cosmox")}
          className="w-full flex items-center gap-3 p-4 luxe-card luxe-card-emerald transition-transform active:scale-[0.98]"
        >
          <div className="luxe-icon-badge shrink-0">
            <Radar className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-bold text-sm text-white">Analyse du tour actuel</p>
            <p className="text-[10px] text-white/55 leading-snug">Verdict IA à partir d'une capture</p>
          </div>
          <span className="luxe-badge-premium shrink-0">Lancer</span>
        </button>

        {!results ? (
          <div className="luxe-card luxe-card-lg luxe-card-emerald p-5 space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div className="flex items-center gap-2.5">
              <div className="luxe-icon-badge"><BarChart3 className="w-4 h-4" /></div>
              <h2 className="font-bold text-sm luxe-emerald-text">Paramètres CosmoX</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-white/55 uppercase tracking-widest font-semibold">Heure (HH:MM:SS)</Label>
                <Input type="time" step="1" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} className="luxe-input h-12 text-center font-mono text-base" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-white/55 uppercase tracking-widest font-semibold">Coefficient</Label>
                <Input type="number" step="0.01" min="1" max="50" placeholder="3.50" value={coeffInput} onChange={(e) => setCoeffInput(e.target.value)} className="luxe-input h-12 text-center font-mono text-base" />
              </div>
            </div>
            {error && <p className="text-destructive text-xs text-center font-medium">{error}</p>}
            <Button className="luxe-btn w-full h-12 text-sm" onClick={handlePredict}>
              <Play className="w-4 h-4 mr-2" /> Générer les prédictions
            </Button>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { icon: Brain, label: "IA cosmique", d: "Avancée" },
                { icon: Target, label: "Précis", d: "Haute fiabilité" },
                { icon: Signal, label: "Temps réel", d: "Données live" },
              ].map(({ icon: Icon, label, d }) => (
                <div key={label} className="luxe-stat">
                  <Icon className="w-4 h-4 luxe-gold mx-auto mb-1" />
                  <p className="text-[11px] font-bold luxe-emerald-text leading-none">{label}</p>
                  <p className="text-[9px] text-white/50 mt-1">{d}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <AnalysisDashboard
              history={history}
              nextCoefficient={results[0] ? parseFloat(String(results[0].coefficient).replace(",", ".")) : undefined}
              tone="cosmox"
              label="CosmoX"
            />
            <PredictionResults results={results} title="Résultats CosmoX" variant="cosmox" onBack={() => setResults(null)} />
          </div>
        )}
        </div>
      </div>
      <div className="h-20" />
      <BottomNav />
    </div>
  );
};

export default CosmoX;
