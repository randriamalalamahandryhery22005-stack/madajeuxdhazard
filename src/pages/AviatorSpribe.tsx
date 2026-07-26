import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCoefficient } from "@/lib/predictions";
import PremiumPaywall from "@/components/PremiumPaywall";
import { PREMIUM_GAME_MODES, computeTrial } from "@/lib/premiumAccess";
import AnalysisSequence from "@/components/AnalysisSequence";
import { useGameStats } from "@/hooks/useGameStats";

class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number { this.seed = (this.seed * 16807 + 0) % 2147483647; return (this.seed - 1) / 2147483646; }
  between(min: number, max: number) { return min + this.next() * (max - min); }
  floor(min: number, max: number) { return Math.floor(this.between(min, max)); }
}

const makeSeed = (a: number, b: number) =>
  Math.abs(((a * 2654435761) ^ (b * 2246822519)) % 2147483647) || 1;

interface SpribeResult {
  time: string;
  coefficient: string;
  confidence: number;
}

const generateSpribePrediction = (h: number, m: number, s: number, coeff: number): SpribeResult => {
  const rng = new SeededRandom(makeSeed(h * 3600 + m * 60 + s, Math.round(coeff * 100)));
  const baseAdd = 137;
  const variation = rng.floor(-5, 6);
  const totalAdd = baseAdd + variation;
  let totalSeconds = h * 3600 + m * 60 + s + totalAdd;
  totalSeconds = totalSeconds % 86400;
  const rH = Math.floor(totalSeconds / 3600);
  const rM = Math.floor((totalSeconds % 3600) / 60);
  const rS = totalSeconds % 60;
  const isRare = rng.next() < 0.15;
  const resultCoeff = isRare ? rng.between(6.00, 10.00) : rng.between(2.00, 6.00);
  const confidence = rng.floor(60, 95);
  return {
    time: `${String(rH).padStart(2, "0")}:${String(rM).padStart(2, "0")}:${String(rS).padStart(2, "0")}`,
    coefficient: formatCoefficient(resultCoeff),
    confidence,
  };
};

const AviatorSpribe = () => {
  const navigate = useNavigate();
  const { user, isAdmin, profile } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [subEnabled, setSubEnabled] = useState(true);
  const [timeInput, setTimeInput] = useState("");
  const [secondsInput, setSecondsInput] = useState("00");
  const [coeffInput, setCoeffInput] = useState("");
  const [result, setResult] = useState<SpribeResult | null>(null);
  const [error, setError] = useState("");
  const [showSplash, setShowSplash] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [pendingPrediction, setPendingPrediction] = useState<{ h: number; m: number; s: number; coeff: number } | null>(null);
  const { trackGameUsage } = useGameStats();

  useEffect(() => {
    if (!user) return;
    checkAccess();
    supabase.from("activation_codes").select("code_value").eq("code_name", "sub_aviator_spribe").maybeSingle()
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
    if (active) setHasAccess(true);
    else setHasAccess(false);
  };

  if (!user) { navigate("/login"); return null; }

  if (hasAccess === null) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;
  }

  if (!hasAccess && subEnabled) {
    return <PremiumPaywall gameName="Aviator Spribe" icon={<BarChart3 className="w-5 h-5 text-emerald-400" />} />;
  }

  const handlePredict = () => {
    setError("");
    if (!timeInput || !coeffInput) { setError("Remplissez tous les champs"); return; }
    const [h, m] = timeInput.split(":").map(Number);
    const s = parseInt(secondsInput) || 0;
    if (isNaN(h) || isNaN(m)) { setError("Format invalide"); return; }
    const coeff = parseFloat(coeffInput);
    if (isNaN(coeff) || coeff < 4 || coeff > 10) { setError("Coefficient entre 4.00 et 10.00"); return; }
    setPendingPrediction({ h, m, s, coeff });
    setShowSplash(true);
  };

  const handleSplashComplete = () => {
    if (!pendingPrediction) return;
    const { h, m, s, coeff } = pendingPrediction;
    setResult(generateSpribePrediction(h, m, s, coeff));
    setShowSplash(false);
    setShowPoints(true);
    trackGameUsage("aviator-spribe");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-emerald-950/10">
      {showSplash && (
        <AnalysisSequence
          variant="spribe"
          duration={5000}
          onComplete={handleSplashComplete}
        />
      )}

      <div className="flex items-center gap-3 px-5 py-4 border-b border-emerald-500/15 bg-gradient-to-r from-emerald-500/8 via-card/80 to-emerald-500/5">
        <button onClick={() => navigate("/games")} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400">Aviator Spribe</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">Premium</span>
          </h1>
          <p className="text-[9px] text-muted-foreground opacity-60">Jeu Aviator fourni par Spribe</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {!result && !showSplash ? (
          <div className="p-5 rounded-2xl bg-card/80 border border-emerald-500/30 backdrop-blur-sm space-y-5"
            style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg sunset-gradient flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-bold text-sm text-emerald-400">Calcul Spribe</h2>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Heure (HH:MM)</Label>
                  <Input type="time" value={timeInput} onChange={e => setTimeInput(e.target.value)}
                    className="h-12 bg-secondary/80 border-border/40 text-center font-mono text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Secondes</Label>
                  <Input type="number" min="0" max="59" value={secondsInput} onChange={e => setSecondsInput(e.target.value)}
                    className="h-12 bg-secondary/80 border-border/40 text-center font-mono text-base" placeholder="00" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Coefficient initial (4.00 - 10.00)</Label>
                <Input type="number" step="0.01" min={4} max={10} value={coeffInput} onChange={e => setCoeffInput(e.target.value)}
                  className="h-12 bg-secondary/80 border-border/40 text-center font-mono text-base" placeholder="5.76" />
              </div>
            </div>

            {error && <p className="text-destructive text-xs text-center font-medium">{error}</p>}

            <Button className="w-full h-12 text-sm sunset-gradient text-primary-foreground font-bold shadow-lg" onClick={handlePredict}>
              <Play className="w-4 h-4 mr-2" /> Gérer les résultats
            </Button>
          </div>
        ) : result ? (
          <div className="space-y-5" style={{ animation: "result-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-emerald-400">📊 Résultat Spribe</h2>
              <p className="text-xs text-muted-foreground">Prédiction générée avec succès</p>
            </div>

            <div className="p-6 rounded-2xl mesh-sunset sunset-border shadow-lg space-y-5"
              style={{ animation: "result-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) 200ms forwards", opacity: 0 }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl bg-secondary/30 border border-border/20"
                  style={{ animation: "result-reveal 0.5s ease 400ms forwards", opacity: 0 }}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Heure calculée</p>
                  <p className="text-2xl font-black font-mono text-emerald-400">{result.time}</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-secondary/30 border border-border/20"
                  style={{ animation: "result-reveal 0.5s ease 500ms forwards", opacity: 0 }}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Coefficient final</p>
                  <p className="text-2xl font-black font-mono text-emerald-400">{result.coefficient}</p>
                </div>
              </div>
              <div className="text-center p-3 rounded-xl bg-secondary/20 border border-border/15"
                style={{ animation: "result-reveal 0.5s ease 600ms forwards", opacity: 0 }}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Confiance</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden max-w-[200px]">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-500 transition-all" style={{ width: `${result.confidence}%` }} />
                  </div>
                  <span className="text-sm font-bold text-emerald-400">{result.confidence}%</span>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full h-12 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => setResult(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Revenir au calcul
            </Button>
          </div>
        ) : null}
      </div>
      <div className="h-20" />
      <BottomNav />
    </div>
  );
};

export default AviatorSpribe;
