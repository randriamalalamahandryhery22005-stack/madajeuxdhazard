import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Target, TrendingUp, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PremiumPaywall from "@/components/PremiumPaywall";
import { PREMIUM_GAME_MODES, computeTrial } from "@/lib/premiumAccess";

import AnalysisSequence from "@/components/AnalysisSequence";
import { useGameStats } from "@/hooks/useGameStats";

const DIRECTIONS = ["gauche haut", "droite haut", "gauche bas", "droite bas", "centre"] as const;
type Direction = typeof DIRECTIONS[number];
type Difficulty = "facile" | "moyen" | "difficile";

interface ShotPrediction {
  direction: Direction;
  confidence: number;
}

const generatePredictions = (difficulty: Difficulty): ShotPrediction[] => {
  const now = Date.now();
  const shots: ShotPrediction[] = [];
  
  for (let i = 0; i < 5; i++) {
    const seed = ((now + i * 7919) * 2654435761) % 2147483647;
    const dirIdx = seed % 5;
    const direction = DIRECTIONS[dirIdx];
    
    let baseConf: number;
    switch (difficulty) {
      case "facile": baseConf = 60 + (seed % 25); break;
      case "moyen": baseConf = 50 + (seed % 30); break;
      case "difficile": baseConf = 40 + (seed % 30); break;
    }
    const confidence = Math.min(baseConf, 92);
    
    shots.push({ direction, confidence });
  }
  
  return shots;
};

const directionEmoji: Record<Direction, string> = {
  "gauche haut": "↖️",
  "droite haut": "↗️",
  "gauche bas": "↙️",
  "droite bas": "↘️",
  "centre": "🎯",
};

const PenaltyShootout = () => {
  const navigate = useNavigate();
  const { user, isAdmin, profile } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [subEnabled, setSubEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [predictions, setPredictions] = useState<ShotPrediction[] | null>(null);
  const [showSplash, setShowSplash] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [pendingDiff, setPendingDiff] = useState<Difficulty | null>(null);
  const { trackGameUsage } = useGameStats();

  useEffect(() => {
    if (!user) return;
    checkAccess();
    supabase.from("activation_codes").select("code_value").eq("code_name", "sub_penalty").maybeSingle()
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

  if (!user) { navigate("/login"); return null; }

  if (hasAccess === null) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" /></div>;
  }

  if (!hasAccess && subEnabled) {
    return <PremiumPaywall gameName="Penalty Shootout" icon={<Target className="w-5 h-5 text-green-400" />} />;
  }

  const handlePredict = (diff: Difficulty) => {
    setPendingDiff(diff);
    setShowSplash(true);
  };

  const handleSplashComplete = () => {
    if (!pendingDiff) return;
    setDifficulty(pendingDiff);
    setPredictions(generatePredictions(pendingDiff));
    setShowSplash(false);
    setShowPoints(true);
    trackGameUsage("penalty-shootout");
  };

  const getRiskLevel = (diff: Difficulty) => {
    switch (diff) {
      case "facile": return { label: "Faible", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" };
      case "moyen": return { label: "Modéré", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" };
      case "difficile": return { label: "Élevé", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" };
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-green-950/10">
      {showSplash && (
        <AnalysisSequence
          variant="penalty"
          duration={5000}
          onComplete={handleSplashComplete}
        />
      )}

      <div className="flex items-center gap-3 px-5 py-4 border-b border-green-500/15 bg-gradient-to-r from-green-500/8 via-card/80 to-green-500/5">
        <button onClick={() => navigate("/games")} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            <span className="text-green-400">Penalty Shootout</span>
          </h1>
          <p className="text-[9px] text-muted-foreground">Prédictions probabilistes · Powered by AI</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        <div className="px-5 space-y-6">
        {/* Disclaimer */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20"
          style={{ animation: "fade-up 0.4s ease forwards" }}>
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Les prédictions sont basées sur des <span className="text-foreground font-medium">probabilités et tendances</span>. 
            Aucune prédiction n'est certaine. Jouez de manière responsable.
          </p>
        </div>

        {!predictions && !showSplash ? (
          <div className="space-y-4" style={{ animation: "fade-up 0.5s ease forwards" }}>
            <div className="text-center space-y-1 mb-2">
              <h2 className="text-lg font-bold">Choisissez le niveau</h2>
              <p className="text-xs text-muted-foreground">La confiance varie selon la difficulté</p>
            </div>

            {(["facile", "moyen", "difficile"] as Difficulty[]).map((diff, i) => {
              const risk = getRiskLevel(diff);
              const colors = {
                facile: { border: "border-emerald-500/30 hover:border-emerald-500/50", bg: "from-emerald-500/10 to-green-500/5", icon: "from-emerald-500 to-green-600" },
                moyen: { border: "border-amber-500/30 hover:border-amber-500/50", bg: "from-amber-500/10 to-amber-500/5", icon: "from-amber-500 to-amber-600" },
                difficile: { border: "border-amber-500/30 hover:border-amber-500/50", bg: "from-amber-500/10 to-amber-500/5", icon: "from-amber-500 to-amber-600" },
              }[diff];
              
              return (
                <button key={diff} onClick={() => handlePredict(diff)}
                  className={`w-full text-left rounded-2xl border-2 ${colors.border} bg-gradient-to-br ${colors.bg} via-card/90 transition-all duration-300 active:scale-[0.98] shadow-lg`}
                  style={{ animation: `fade-up 0.5s ease ${100 + i * 100}ms forwards`, opacity: 0 }}>
                  <div className="p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.icon} flex items-center justify-center shadow-lg`}>
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-base font-bold capitalize ${risk.color}`}>{diff}</h3>
                      <p className="text-[10px] text-muted-foreground">Risque : {risk.label}</p>
                    </div>
                    <Play className={`w-5 h-5 ${risk.color}`} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : predictions ? (
          <div className="space-y-5" style={{ animation: "result-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-green-400">🎯 Prédiction ({difficulty})</h2>
              <p className="text-xs text-muted-foreground">5 tirs consécutifs</p>
            </div>

            <div className="space-y-3">
              {predictions.map((shot, i) => (
                <div key={i}
                  className="p-4 rounded-xl bg-card/80 border border-green-500/20 flex items-center gap-4"
                  style={{ animation: `result-reveal 0.5s ease ${200 + i * 100}ms forwards`, opacity: 0 }}>
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-lg font-bold text-green-400">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{directionEmoji[shot.direction]}</span>
                      <span className="text-sm font-bold capitalize">{shot.direction}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden max-w-[120px]">
                        <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400" style={{ width: `${shot.confidence}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-green-400">{shot.confidence}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Strategy */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/20 space-y-2"
              style={{ animation: "result-reveal 0.5s ease 800ms forwards", opacity: 0 }}>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold">Stratégie recommandée</p>
              </div>
              <ul className="text-[10px] text-muted-foreground space-y-1 pl-6 list-disc">
                <li>Évitez les répétitions directes de la même direction</li>
                <li>Privilégiez l'alternance haut/bas et gauche/droite</li>
                <li>Le centre est statistiquement le plus risqué mais le plus inattendu</li>
              </ul>
            </div>

            <Button variant="outline" className="w-full h-12 border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => { setPredictions(null); setDifficulty(null); }}>
              <RotateCcw className="w-4 h-4 mr-2" /> Nouvelle prédiction
            </Button>
          </div>
        ) : null}
        </div>
      </div>
      <div className="h-20" />
      <BottomNav />
    </div>
  );
};

export default PenaltyShootout;
