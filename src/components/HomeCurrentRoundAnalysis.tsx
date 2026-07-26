import { useState } from "react";
import { Target, ChevronLeft, Radar } from "lucide-react";
import CurrentRoundAnalysis, { type GameKey } from "@/components/CurrentRoundAnalysis";
import aviatorLogo from "@/assets/logo-aviator.png";
import cosmoxLogo from "@/assets/logo-cosmox.png";
import jetxLogo from "@/assets/logo-jetx.png";
import analysisLogo from "@/assets/logo-aviator-premium.png";

type HomeGame = Extract<GameKey, "aviator-premium" | "cosmox" | "jetx">;

const GAMES: Array<{
  key: HomeGame;
  name: string;
  logo: string;
  accent: string;
  border: string;
  ring: string;
  chip: string;
}> = [
  {
    key: "aviator-premium",
    name: "Aviator",
    logo: aviatorLogo,
    accent: "from-amber-500/20 via-yellow-500/8 to-transparent",
    border: "border-amber-500/30",
    ring: "ring-amber-500/40",
    chip: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  },
  {
    key: "cosmox",
    name: "CosmoX",
    logo: cosmoxLogo,
    accent: "from-violet-500/20 via-fuchsia-500/8 to-transparent",
    border: "border-violet-500/30",
    ring: "ring-violet-500/40",
    chip: "text-violet-200 bg-violet-500/10 border-violet-500/30",
  },
  {
    key: "jetx",
    name: "JetX",
    logo: jetxLogo,
    accent: "from-orange-500/20 via-red-500/8 to-transparent",
    border: "border-orange-500/30",
    ring: "ring-orange-500/40",
    chip: "text-orange-200 bg-orange-500/10 border-orange-500/30",
  },
];

const HomeCurrentRoundAnalysis = () => {
  const [selected, setSelected] = useState<HomeGame | null>(null);
  const active = selected ? GAMES.find((g) => g.key === selected)! : null;

  return (
    <section className="space-y-4">
      {/* Section header — Analyse du tour actuel */}
      <div
        className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card/60 to-background p-4 shadow-lg"
        style={{ animation: "fade-up 0.4s ease forwards" }}
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/30 flex items-center justify-center shadow-lg overflow-hidden">
            <img src={analysisLogo} alt="Analyse" className="w-10 h-10 object-contain drop-shadow" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                <Radar className="w-2.5 h-2.5" /> Moteur IA
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Multi-jeux
              </span>
            </div>
            <h2 className="text-base font-black mt-1 flex items-center gap-2 gold-text">
              <Target className="w-4 h-4 text-primary" />
              Analyse du tour actuel
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Sélectionnez un jeu, envoyez une capture, obtenez le verdict.
            </p>
          </div>
        </div>
      </div>

      {/* Body: game picker OR analysis */}
      {!active ? (
        <div className="grid grid-cols-3 gap-2.5">
          {GAMES.map((g, i) => (
            <button
              key={g.key}
              onClick={() => setSelected(g.key)}
              className={`group relative overflow-hidden rounded-2xl border-2 ${g.border} bg-gradient-to-br ${g.accent} p-3 flex flex-col items-center gap-2 transition-all active:scale-[0.96] hover:scale-[1.03] hover:shadow-lg`}
              style={{ animation: `fade-up 0.4s ease ${150 + i * 70}ms forwards`, opacity: 0 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-card/70 border border-border/40 flex items-center justify-center overflow-hidden shadow-inner">
                <img src={g.logo} alt={g.name} className="w-11 h-11 object-contain drop-shadow" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black leading-tight">{g.name}</p>
                <span
                  className={`mt-1 inline-block text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${g.chip}`}
                >
                  Analyser
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary/50"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Changer de jeu
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/60 px-2.5 py-1">
              <img src={active.logo} alt={active.name} className="w-5 h-5 object-contain" />
              <span className="text-[11px] font-bold">{active.name}</span>
            </div>
          </div>
          <CurrentRoundAnalysis game={active.key} />
        </div>
      )}
    </section>
  );
};

export default HomeCurrentRoundAnalysis;
