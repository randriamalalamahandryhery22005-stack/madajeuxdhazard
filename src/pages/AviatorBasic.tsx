import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, BarChart3, AlertTriangle, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateBasicPrediction } from "@/lib/predictions";
import PredictionResults from "@/components/PredictionResults";
import type { PredictionResult } from "@/lib/predictions";
import BasicModeIntro from "@/components/BasicModeIntro";

const DAILY_LIMIT = 10;
const INTRO_KEY = "basic_intro_seen_session";

const AviatorBasic = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showIntro, setShowIntro] = useState(
    typeof window !== "undefined" && !sessionStorage.getItem(INTRO_KEY)
  );
  const [timeInput, setTimeInput] = useState("");
  const [coeffInput, setCoeffInput] = useState("");
  const [results, setResults] = useState<PredictionResult[] | null>(null);
  const [error, setError] = useState("");
  const [showSeconds, setShowSeconds] = useState(true);
  const [usedToday, setUsedToday] = useState(0);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [tier, setTier] = useState<1 | 2>(1);

  useEffect(() => {
    supabase.from("activation_codes").select("code_value").eq("code_name", "seconds_basic").maybeSingle()
      .then(({ data }) => setShowSeconds(data?.code_value === "enabled"));
  }, []);

  useEffect(() => {
    if (!user) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    supabase
      .from("game_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("game_name", "aviator-basic")
      .gte("used_at", startOfDay.toISOString())
      .then(({ count }) => {
        setUsedToday(count ?? 0);
        setLoadingUsage(false);
      });
  }, [user]);

  if (!user) { navigate("/login"); return null; }

  if (showIntro) {
    return (
      <BasicModeIntro
        onContinue={() => {
          sessionStorage.setItem(INTRO_KEY, "1");
          setShowIntro(false);
        }}
      />
    );
  }

  const remaining = Math.max(0, DAILY_LIMIT - usedToday);
  const limitReached = usedToday >= DAILY_LIMIT;

  const handlePredict = () => {
    setError("");
    if (limitReached) {
      setError(`Limite quotidienne atteinte (${DAILY_LIMIT}/jour). Réessayez demain.`);
      return;
    }
    if (!timeInput || !coeffInput) { setError("Veuillez remplir tous les champs"); return; }
    const [h, m] = timeInput.split(":").map(Number);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) { setError("Format d'heure invalide (HH:MM)"); return; }
    const coeff = parseFloat(coeffInput);
    if (isNaN(coeff) || coeff < 2 || coeff > 5) { setError("Coefficient entre 2.00 et 5.00"); return; }
    setResults(generateBasicPrediction(h, m, coeff, showSeconds, tier));
    // Track usage server-side (counts towards daily limit)
    supabase.from("game_usage").insert({
      user_id: user.id,
      game_name: "aviator-basic",
      game_mode: `basic-r${tier}`,
    }).then(() => setUsedToday((n) => n + 1));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
        <button onClick={() => navigate("/aviator")} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold">Aviator <span className="text-muted-foreground font-normal">Basique</span></h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Système de prédiction</p>
        </div>
        {!loadingUsage && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            limitReached
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : remaining <= 3
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          }`}>
            <span className="tabular-nums">{remaining}/{DAILY_LIMIT}</span>
            <span className="text-[8px] uppercase opacity-80">restant</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {!results ? (
          <div className="p-5 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-bold text-sm">Paramètres de prédiction</h2>
            </div>
            {/* Notice Premium discrète */}
            <button
              type="button"
              onClick={() => navigate("/premium")}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.06] via-amber-500/[0.03] to-transparent hover:border-amber-500/40 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-amber-300 leading-tight">Version Basique</p>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Passez à la <span className="text-amber-400 font-semibold">Version Premium</span> pour des prédictions plus précises et des fonctionnalités avancées.
                </p>
              </div>
              <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            </button>
            {limitReached && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    Vous avez utilisé vos <b>{DAILY_LIMIT} prédictions</b> du jour. Réessayez demain ou passez à un abonnement Premium pour un accès illimité.
                  </p>
                </div>
                <Button
                  variant="premium"
                  className="w-full h-11 text-sm font-bold"
                  onClick={() => navigate("/premium")}
                >
                  <Crown className="w-4 h-4 mr-2" /> Souscrire à Premium
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Heure (HH:MM)</Label>
                <Input type="time" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} className="h-12 bg-secondary/80 border-border/40 text-center font-mono text-base" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Coefficient</Label>
                <Input type="number" step="0.01" min="2" max="5" placeholder="2.50" value={coeffInput} onChange={(e) => setCoeffInput(e.target.value)} className="h-12 bg-secondary/80 border-border/40 text-center font-mono text-base" />
              </div>
            </div>
            {/* Choix Résultat 1 / Résultat 2 */}
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Type de résultat</Label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary/60 border border-border/40">
                {[1, 2].map((n) => {
                  const active = tier === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTier(n as 1 | 2)}
                      className={`h-10 rounded-lg text-xs font-bold transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Résultat {n}
                      <span className="block text-[9px] font-medium opacity-80">
                        {n === 1 ? "Fiabilité maximale" : "Alternative"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {error && <p className="text-destructive text-xs text-center font-medium">{error}</p>}
            <Button variant="premium" className="w-full h-12 text-sm" onClick={handlePredict} disabled={limitReached}>
              <Play className="w-4 h-4 mr-2" /> {limitReached ? "Limite atteinte" : "Générer les prédictions"}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              Mode Basique · Résultat entre 2,00x et 3,00x · Limite quotidienne {DAILY_LIMIT}/jour
            </p>
          </div>
        ) : (
          <PredictionResults results={results} title={`Résultat ${tier} · Basique`} variant="basic" onBack={() => setResults(null)} />
        )}
      </div>
    </div>
  );
};

export default AviatorBasic;
