import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Radar, Target } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CurrentRoundAnalysis, { type GameKey } from "@/components/CurrentRoundAnalysis";
import { useAuth } from "@/contexts/AuthContext";
import aviatorLogo from "@/assets/logo-aviator.png";
import cosmoxLogo from "@/assets/logo-cosmox.png";
import jetxLogo from "@/assets/logo-jetx.png";

type HomeGame = Extract<GameKey, "aviator-premium" | "cosmox" | "jetx">;

const GAMES: Record<string, { key: HomeGame; name: string; logo: string; accent: string }> = {
  aviator: { key: "aviator-premium", name: "Aviator", logo: aviatorLogo, accent: "from-amber-500/25 to-amber-500/5" },
  cosmox:  { key: "cosmox",          name: "CosmoX",  logo: cosmoxLogo,  accent: "from-amber-500/25 to-amber-500/5" },
  jetx:    { key: "jetx",            name: "JetX",    logo: jetxLogo,    accent: "from-amber-500/25 to-amber-500/5" },
};

const AnalyseRound = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { game = "aviator" } = useParams();
  const meta = GAMES[game] ?? GAMES.aviator;

  if (!user) { navigate("/login"); return null; }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with Back button */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-gradient-to-br from-primary/10 via-card/60 to-background">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-2xl border border-border/40 bg-gradient-to-br ${meta.accent} flex items-center justify-center overflow-hidden`}>
            <img src={meta.logo} alt={meta.name} className="w-8 h-8 object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black gold-text flex items-center gap-1.5 truncate">
              <Target className="w-4 h-4 text-primary" /> Analyse — {meta.name}
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Radar className="w-2.5 h-2.5" /> Tour actuel · Moteur IA
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-5">
        <CurrentRoundAnalysis game={meta.key} />
      </div>

      <div className="h-20" />
      <BottomNav />
    </div>
  );
};

export default AnalyseRound;
