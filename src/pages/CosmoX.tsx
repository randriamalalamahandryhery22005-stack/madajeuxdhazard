import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, BarChart3, Sparkles, Radar } from "lucide-react";
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
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!hasAccess && subEnabled) {
    return <PremiumPaywall gameName="CosmoX" icon={<Sparkles className="w-5 h-5 text-primary" />} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {showSplash && (
        <AnalysisSequence variant="cosmox" duration={5000} onComplete={handleSplashComplete} />
      )}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
        <button onClick={() => navigate("/games")} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">CosmoX <Sparkles className="w-4 h-4 text-primary" /></h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prédictions cosmiques</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        <div className="px-5 space-y-6">

        {/* Analyse du tour actuel — dédiée */}
        <button
          onClick={() => navigate("/analyse/cosmox")}
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

        {!results ? (
          <div className="p-5 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-bold text-sm">Paramètres CosmoX</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Heure (HH:MM:SS)</Label>
                <Input type="time" step="1" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} className="h-12 bg-secondary/80 border-border/40 text-center font-mono text-base" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Coefficient</Label>
                <Input type="number" step="0.01" min="1" max="50" placeholder="3.50" value={coeffInput} onChange={(e) => setCoeffInput(e.target.value)} className="h-12 bg-secondary/80 border-border/40 text-center font-mono text-base" />
              </div>
            </div>
            {error && <p className="text-destructive text-xs text-center font-medium">{error}</p>}
            <Button variant="premium" className="w-full h-12 text-sm" onClick={handlePredict}>
              <Play className="w-4 h-4 mr-2" /> Générer les prédictions
            </Button>
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
