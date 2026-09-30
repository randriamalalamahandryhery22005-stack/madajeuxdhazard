import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { Play, Sparkles, Radar, Orbit, Timer, Gauge, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateCosmoXPrediction } from "@/lib/predictions";
import GamePredictionResults from "@/components/game/GamePredictionResults";
import PremiumPaywall from "@/components/PremiumPaywall";
import AnalysisDashboard from "@/components/AnalysisDashboard";
import AnalysisSequence from "@/components/AnalysisSequence";

import { PREMIUM_GAME_MODES, computeTrial } from "@/lib/premiumAccess";

import type { PredictionResult } from "@/lib/predictions";
import GameControlHeader from "@/components/game/GameControlHeader";

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
  const [showSplash, setShowSplash] = useState(false);
  const [pending, setPending] = useState<{ h: number; m: number; s: number; coeff: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    checkAccess();
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
    if (isNaN(h) || isNaN(m)) { setError("Format invalide (HH:MM)"); return; }
    const coeff = parseFloat(coeffInput);
    if (isNaN(coeff) || coeff < 1 || coeff > 50) { setError("Coefficient entre 1.00 et 50.00"); return; }
    setPending({ h, m, s, coeff });
    setShowSplash(true);
  };

  const handleSplashComplete = useCallback(() => {
    if (!pending) return;
    const { h, m, s, coeff } = pending;
    const r = generateCosmoXPrediction(h, m, 0, coeff, true);
    setResults(r);
    setHistory((prev) => [...prev, ...r.map((x) => parseFloat(String(x.coefficient).replace(",", ".")))].slice(-100));
    setShowSplash(false);
  }, [pending]);

  if (!user) { navigate("/login"); return null; }

  if (hasAccess === null) {
    return <div className="game-console game-tone-cosmox min-h-screen flex items-center justify-center"><div className="game-console-loader" /></div>;
  }

  if (!hasAccess && subEnabled) {
    return <PremiumPaywall gameName="CosmoX" icon={<Sparkles className="w-5 h-5 luxe-emerald" />} />;
  }

  return (
    <div className="game-console game-tone-cosmox min-h-screen flex flex-col">
      {showSplash && (
        <AnalysisSequence variant="cosmox" duration={5000} onComplete={handleSplashComplete} />
      )}
      <div className="game-console-wrap">
        <GameControlHeader game="CosmoX" eyebrow="Console orbitale" status="Orbite stable" icon={Orbit} tone="cosmox" onBack={() => navigate("/games")} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="game-console-wrap game-console-layout">
        <aside className="game-console-rail">
          <div className="game-console-rail-title"><ScanLine /> Télémétrie</div>
          <div className="game-console-metric"><span>Plage moteur</span><strong>1.00–50.00x</strong></div>
          <div className="game-console-metric"><span>Saisie</span><strong>HH:MM</strong></div>
          <div className="game-console-metric"><span>Résultat</span><strong>HH:MM:SS</strong></div>
        </aside>
        <main className="game-console-main">

        <button
          onClick={() => navigate("/analyse/cosmox")}
          className="game-console-action-card"
        >
          <div className="game-console-action-icon">
            <Radar className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-bold text-sm text-foreground">Analyse visuelle du tour</p>
            <p className="text-[11px] text-muted-foreground leading-snug">Ouvrir le module de lecture d’une capture CosmoX</p>
          </div>
          <span className="game-console-chip shrink-0">Ouvrir</span>
        </button>

        {!results ? (
          <div className="game-console-panel animate-fade-in">
            <div className="game-console-panel-heading">
              <div className="game-console-action-icon"><Orbit /></div>
              <div><p className="game-console-eyebrow">Vecteur d’entrée</p><h2>Paramètres CosmoX</h2></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="game-console-label"><Timer /> Heure observée</Label>
                <Input type="time" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} className="game-console-input" />
              </div>
              <div className="space-y-1.5">
                <Label className="game-console-label"><Gauge /> Coefficient observé</Label>
                <Input type="number" step="0.01" min="1" max="50" placeholder="3.50" value={coeffInput} onChange={(e) => setCoeffInput(e.target.value)} className="game-console-input" />
              </div>
            </div>
            {error && <p className="text-destructive text-xs text-center font-medium">{error}</p>}
            <Button className="game-console-launch" onClick={handlePredict}>
              <Play /> Initialiser l’analyse orbitale
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
            <GamePredictionResults
              tone="cosmox"
              title="Projection CosmoX"
              eyebrow="Analyse terminée"
              rows={results.map((r) => ({
                time: r.time,
                coefficient: r.coefficient,
                confidence: r.confidence,
                reliability: r.reliability,
                stability: r.stability,
                risk: r.risk,
              }))}
              onRestart={() => setResults(null)}
            />
          </div>
        )}
        </main>
        </div>
      </div>
      <div className="h-20" />
      <BottomNav />
    </div>
  );
};

export default CosmoX;
