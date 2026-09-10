import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Lock, Rocket, Zap } from "lucide-react";
import { toast } from "sonner";
import onexbetLogo from "@/assets/1xbet-logo.png";
import aviatorLogo from "@/assets/logo-aviator.png";
import aviatorStudioLogo from "@/assets/logo-aviator-studio.png";
import aviatorSpribeLogo from "@/assets/logo-aviator-spribe.png";
import type { GameStats } from "@/hooks/useGameStats";

export interface OnexbetGameCard {
  id: string;
  name: string;
  logo: string;
  description: string;
  available: boolean;
  premium?: boolean;
  route: string;
  tone: "orange" | "magenta" | "violet";
}

/** Aviator sub-modes revealed after tapping the Aviator card */
export const AVIATOR_SUBGAMES: OnexbetGameCard[] = [
  { id: "aviator-studio", name: "Studio", logo: aviatorStudioLogo, description: "Temps réel", available: true, premium: true, route: "/aviator-studio", tone: "orange" },
  { id: "aviator-spribe", name: "Spribe", logo: aviatorSpribeLogo, description: "HH:MM:SS",   available: true, premium: true, route: "/aviator-spribe", tone: "magenta" },
];

/** Kept for backward-compat with imports elsewhere (e.g. Games.tsx totals). */
export const ONEXBET_GAMES: OnexbetGameCard[] = AVIATOR_SUBGAMES;

const toneAccent: Record<OnexbetGameCard["tone"], string> = {
  orange:  "hsl(var(--sunset-orange))",
  magenta: "hsl(var(--sunset-magenta))",
  violet:  "hsl(var(--sunset-violet))",
};

interface Props {
  gameStats: GameStats[];
  onTrack: (id: string) => void;
}

const OnexbetHub = ({ gameStats, onTrack }: Props) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const active = useMemo(() => AVIATOR_SUBGAMES.filter((g) => g.available).length, []);

  const handleClick = (g: OnexbetGameCard) => {
    if (!g.available) { toast.info("Ce jeu est actuellement indisponible"); return; }
    onTrack(g.id);
    navigate(g.route);
  };

  return (
    <section aria-label="Plateforme 1xBet" className="space-y-4">
      {/* Header épuré — logo + nom + tagline */}
      <div className="flex items-center gap-3 px-1 py-2">
        <div className="relative w-11 h-11 rounded-2xl overflow-hidden ring-1 ring-[hsl(var(--sunset-magenta)/0.5)] bg-[hsl(var(--sunset-ink))] flex items-center justify-center shrink-0">
          <img src={onexbetLogo} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" decoding="async" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black sunset-text leading-tight">1xBet</h2>
          <p className="text-[11px] text-[hsl(45_20%_88%/0.7)] leading-snug truncate">Moteur IA Aviator · multi-modes</p>
        </div>
        <span className="text-[9px] px-2 py-1 rounded-full sunset-gradient text-primary-foreground font-black flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-white/90 live-dot" /> Live
        </span>
      </div>

      {/* Aviator entry card — clicking expands Studio + Spribe below */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="group relative w-full flex items-center gap-3 p-3.5 rounded-2xl sunset-border overflow-hidden text-left transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]
          bg-[linear-gradient(155deg,hsl(var(--sunset-ink))_0%,hsl(258_45%_10%)_100%)]"
      >
        <div className="relative w-14 h-14 rounded-2xl overflow-hidden ring-1 ring-[hsl(var(--sunset-orange)/0.6)] bg-[hsl(var(--sunset-ink))] flex items-center justify-center shrink-0">
          <img src={aviatorLogo} alt="Aviator" className="w-full h-full object-contain p-1.5 group-hover:scale-110 transition-transform duration-500" loading="lazy" decoding="async" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.22em] font-bold text-[hsl(var(--sunset-amber))]">Sélection</span>
            <Rocket className="w-3 h-3 text-[hsl(var(--sunset-magenta))]" />
          </div>
          <p className="text-base font-black leading-tight" style={{ color: "hsl(var(--sunset-orange))" }}>Aviator</p>
          <p className="text-[10px] text-[hsl(45_20%_88%/0.65)] leading-snug truncate">
            {expanded ? "Choisissez un mode ci-dessous" : `Toucher pour découvrir · ${active} modes`}
          </p>
        </div>
        <div className={`w-8 h-8 rounded-full border border-[hsl(var(--sunset-magenta)/0.4)] bg-[hsl(var(--sunset-ink))]/70 flex items-center justify-center transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>
          <ChevronDown className="w-4 h-4 text-[hsl(var(--sunset-amber))]" />
        </div>
      </button>

      {/* Sub-modes — Studio + Spribe (revealed on expand) */}
      {expanded && (
        <div className="grid grid-cols-2 gap-3" style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
          {AVIATOR_SUBGAMES.map((g, i) => {
            const stat = gameStats.find((s) => s.game_name === g.id);
            const accent = toneAccent[g.tone];
            return (
              <button
                key={g.id}
                onClick={() => handleClick(g)}
                disabled={!g.available}
                className={`group relative flex flex-col items-center justify-between gap-2 pt-5 pb-3 px-2 rounded-2xl transition-all duration-300 sunset-border overflow-hidden min-h-[172px]
                  bg-[linear-gradient(155deg,hsl(var(--sunset-ink))_0%,hsl(258_45%_10%)_100%)]
                  hover:-translate-y-1 active:scale-[0.96]
                  ${!g.available ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                style={{ animation: `fade-up 0.5s cubic-bezier(0.16,1,0.3,1) ${100 + i * 80}ms both` }}
              >
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10">
                  {!g.available ? (
                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-destructive/90 text-destructive-foreground font-bold flex items-center gap-0.5 shadow-md whitespace-nowrap">
                      <Lock className="w-2 h-2" /> Bientôt
                    </span>
                  ) : g.premium ? (
                    <span className="text-[8px] px-2 py-0.5 rounded-full sunset-gradient text-primary-foreground font-black flex items-center gap-0.5 shadow-md whitespace-nowrap">
                      <Rocket className="w-2 h-2" /> PRO
                    </span>
                  ) : null}
                </div>

                {g.available && (
                  <div className="absolute bottom-1.5 right-1.5">
                    <div className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
                  </div>
                )}

                <div className="relative mt-3">
                  <div className="absolute inset-[-4px] rounded-2xl opacity-50 group-hover:opacity-80 transition-opacity blur-md"
                       style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }} />
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden ring-1 bg-[hsl(var(--sunset-ink))] flex items-center justify-center"
                       style={{ borderColor: accent }}>
                    <img src={g.logo} alt={g.name} className="w-full h-full object-contain p-1.5 group-hover:scale-110 transition-transform duration-500" loading="lazy" decoding="async" />
                  </div>
                </div>

                <div className="text-center space-y-0.5 px-1">
                  <p className="font-black text-xs leading-tight truncate" style={{ color: accent }}>{g.name}</p>
                  <p className="text-[9px] text-[hsl(45_20%_88%/0.6)] leading-snug truncate">{g.description}</p>
                </div>

                {stat && (stat.total_uses > 0 || stat.online_users > 0) ? (
                  <div className="flex items-center gap-1.5 text-[8px] text-[hsl(45_20%_88%/0.75)] bg-[hsl(var(--sunset-ink))]/70 px-1.5 py-0.5 rounded-md border" style={{ borderColor: `${accent}30` }}>
                    {stat.online_users > 0 && (
                      <span className="flex items-center gap-0.5">
                        <div className="w-1 h-1 rounded-full" style={{ background: accent }} />
                        {stat.online_users}
                      </span>
                    )}
                    {stat.total_uses > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Zap className="w-2 h-2" style={{ color: accent }} />
                        {stat.total_uses}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-[16px]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default OnexbetHub;
