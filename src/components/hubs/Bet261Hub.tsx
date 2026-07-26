import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Crown, Flame, Lock, ShieldCheck, Sparkles, TrendingUp, Zap, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import bet261Logo from "@/assets/bet261-logo.png";
import aviatorLogo from "@/assets/logo-aviator.png";
import cosmoxLogo from "@/assets/logo-cosmox.png";
import jetxLogo from "@/assets/logo-jetx.png";
import virtuelLogo from "@/assets/logo-virtuel.png";
import penaltyLogo from "@/assets/logo-penalty.png";
import type { GameStats } from "@/hooks/useGameStats";

export interface Bet261GameCard {
  id: string;
  name: string;
  logo: string;
  description: string;
  available: boolean;
  premium?: boolean;
  route: string;
}

export const BET261_GAMES: Bet261GameCard[] = [
  { id: "aviator",          name: "Aviator", logo: aviatorLogo,  description: "Basique & Pro",  available: true,  route: "/aviator" },
  { id: "cosmox",           name: "CosmoX",  logo: cosmoxLogo,   description: "Cosmique",       available: true,  route: "/cosmox" },
  { id: "jetx",             name: "JetX",    logo: jetxLogo,     description: "Vol premium",    available: true,  route: "/jetx" },
];

interface Props {
  gameStats: GameStats[];
  mostPopular: string | null;
  onTrack: (id: string) => void;
}

/** Bet261 hub — Emerald Prestige identity (deep emerald + luminous gold, glassmorphism, ornemental) */
const Bet261Hub = ({ gameStats, mostPopular, onTrack }: Props) => {
  const navigate = useNavigate();
  const active = useMemo(() => BET261_GAMES.filter((g) => g.available).length, []);
  const totalOnline = useMemo(
    () =>
      BET261_GAMES.reduce((sum, g) => {
        const s = gameStats.find((x) => x.game_name === g.id);
        return sum + (s?.online_users ?? 0);
      }, 0),
    [gameStats],
  );

  const handleClick = (g: Bet261GameCard) => {
    if (!g.available) { toast.info("Ce jeu est actuellement indisponible"); return; }
    onTrack(g.id);
    navigate(g.route);
  };

  return (
    <section aria-label="Plateforme Bet261" className="space-y-4">
      {/* Header épuré — logo + nom + tagline */}
      <div className="flex items-center gap-3 px-1 py-2">
        <div className="relative w-11 h-11 rounded-2xl overflow-hidden ring-1 ring-[hsl(var(--gold)/0.35)] bg-[hsl(var(--emerald-deep))] flex items-center justify-center shrink-0">
          <img src={bet261Logo} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" decoding="async" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black text-shine leading-tight">Bet261</h2>
          <p className="text-[11px] text-muted-foreground leading-snug truncate">Prédictions temps réel · sélection premium</p>
        </div>
        <span className="text-[9px] px-2 py-1 rounded-full border border-[hsl(var(--gold)/0.35)] bg-[hsl(var(--gold)/0.08)] text-[hsl(var(--gold-soft))] font-bold flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(152_70%_55%)] live-dot" /> Live
        </span>
      </div>


      {/* Game grid — medal cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {BET261_GAMES.map((g, i) => {
          const stat = gameStats.find((s) => s.game_name === g.id);
          const hot = mostPopular === g.id;
          return (
            <button
              key={g.id}
              onClick={() => handleClick(g)}
              disabled={!g.available}
              className={`group relative flex flex-col items-center gap-2 p-3 rounded-3xl border transition-all duration-300 active:scale-[0.96] hover:scale-[1.03] backdrop-blur-md
                border-[hsl(var(--gold)/0.22)] hover:border-[hsl(var(--gold)/0.55)]
                bg-[linear-gradient(160deg,hsl(var(--emerald-deep)/0.75),hsl(var(--emerald-abyss)/0.85))]
                shadow-[0_10px_30px_-12px_hsl(158_78%_10%/0.7)] hover:shadow-[0_16px_40px_-14px_hsl(42_78%_45%/0.35)]
                ${!g.available ? "opacity-40 grayscale cursor-not-allowed" : ""}`}
              style={{ animation: `fade-up 0.55s cubic-bezier(0.16,1,0.3,1) ${120 + i * 70}ms forwards`, opacity: 0 }}
            >
              {/* top-left gilt ribbon */}
              <div className="absolute inset-x-0 top-0 h-6 rounded-t-3xl pointer-events-none overflow-hidden">
                <div className="absolute inset-0 opacity-40" style={{ background: "linear-gradient(180deg, hsl(var(--gold)/0.35), transparent)" }} />
              </div>

              {/* Badges */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {hot && (
                  <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[hsl(var(--gold-warm))] to-[hsl(var(--gold))] text-primary-foreground font-black flex items-center gap-0.5 shadow-lg shadow-[hsl(var(--gold)/0.4)]">
                    <Flame className="w-2 h-2" /> Hot
                  </span>
                )}
                {g.premium && (
                  <span className="text-[7px] px-1.5 py-0.5 rounded-full gold-gradient text-primary-foreground font-black flex items-center gap-0.5 shadow-lg shadow-[hsl(var(--gold)/0.4)]">
                    <Crown className="w-2 h-2" /> Pro
                  </span>
                )}
                {!g.available && (
                  <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-destructive/80 text-destructive-foreground font-bold flex items-center gap-0.5 shadow-lg">
                    <AlertTriangle className="w-2 h-2" /> Off
                  </span>
                )}
              </div>

              {g.available ? (
                <div className="absolute top-1.5 right-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(152_70%_55%)] shadow-[0_0_10px_hsl(152_70%_45%/0.8)] live-dot" />
                </div>
              ) : (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-secondary flex items-center justify-center ring-2 ring-background">
                  <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                </div>
              )}

              {/* Medal ring */}
              <div className="relative animate-zoom-in-soft" style={{ animationDelay: `${180 + i * 70}ms` }}>
                <div className="absolute inset-[-3px] rounded-2xl opacity-60 pointer-events-none group-hover:opacity-100 transition-opacity animate-glow-gold-loop"
                     style={{ background: "conic-gradient(from 45deg, hsl(var(--gold)/0.6), transparent 45%, hsl(var(--gold)/0.6))", filter: "blur(4px)" }} />
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden ring-1 ring-[hsl(var(--gold)/0.35)] bg-[hsl(var(--emerald-abyss))]">
                  <img src={g.logo} alt={g.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" decoding="async" />
                </div>
              </div>

              <div className="text-center space-y-0.5 relative">
                <p className="font-black text-xs leading-tight text-shine">{g.name}</p>
                <p className="text-[8px] text-muted-foreground leading-snug">{g.description}</p>
              </div>

              {stat && (stat.total_uses > 0 || stat.online_users > 0) && (
                <div className="flex items-center gap-1.5 text-[8px] text-[hsl(var(--gold-soft))] bg-[hsl(var(--emerald-abyss)/0.6)] px-1.5 py-0.5 rounded-full border border-[hsl(var(--gold)/0.15)] relative">
                  {stat.online_users > 0 && (
                    <span className="flex items-center gap-0.5">
                      <div className="w-1 h-1 rounded-full bg-[hsl(152_70%_55%)] animate-pulse" />
                      {stat.online_users}
                    </span>
                  )}
                  {stat.total_uses > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Zap className="w-2 h-2" />
                      {stat.total_uses}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default Bet261Hub;