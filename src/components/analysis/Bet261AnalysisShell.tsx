import { ReactNode, useEffect, useState } from "react";
import { Crown, ShieldCheck, Activity, Cpu, Gauge, Sparkles, TrendingUp } from "lucide-react";

export type Confidence = "Faible" | "Moyen" | "Élevé" | "Très élevé";

interface Props {
  gameName: string;
  gameLogo: string;
  gameVersion: string;
  gameLevel: string;
  difficulty: "Facile" | "Moyen" | "Difficile" | "Expert";
  engine: string;
  engineVersion: string;
  precision: number;          // 0-100
  confidence: Confidence;
  history?: string[];         // last coefficients as strings, oldest → newest
  children: ReactNode;
}

const CONFIDENCE_META: Record<Confidence, { pct: number; cls: string; dot: string }> = {
  "Faible":     { pct: 25, cls: "text-amber-300 border-amber-400/40 bg-amber-500/10", dot: "bg-amber-400" },
  "Moyen":      { pct: 55, cls: "text-[hsl(var(--gold-soft))] border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.1)]", dot: "bg-[hsl(var(--gold))]" },
  "Élevé":      { pct: 78, cls: "text-[hsl(152_70%_60%)] border-[hsl(152_70%_45%/0.4)] bg-[hsl(152_70%_35%/0.15)]", dot: "bg-[hsl(152_70%_50%)]" },
  "Très élevé": { pct: 94, cls: "text-[hsl(152_75%_65%)] border-[hsl(152_75%_50%/0.5)] bg-[hsl(152_70%_35%/0.2)]", dot: "bg-[hsl(152_75%_55%)]" },
};

const DIFF_LEVEL: Record<Props["difficulty"], number> = { Facile: 1, Moyen: 2, Difficile: 3, Expert: 4 };

const Bet261AnalysisShell = ({
  gameName, gameLogo, gameVersion, gameLevel, difficulty, engine, engineVersion, precision, confidence, history = [], children,
}: Props) => {
  const conf = CONFIDENCE_META[confidence];
  const [now, setNow] = useState(new Date());
  const [sync, setSync] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setSync(new Date()), 30000); return () => clearInterval(t); }, []);

  const fmtTime = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fmtSync = (d: Date) => {
    const s = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
    return s < 60 ? `il y a ${s}s` : `il y a ${Math.floor(s / 60)}min`;
  };

  return (
    <div className="px-3 sm:px-5 py-5 sm:py-6 space-y-4 sm:space-y-5">
      {/* Game meta dashboard — Emerald Prestige */}
      <div className="relative overflow-hidden rounded-3xl border border-[hsl(var(--gold)/0.28)] glass-card p-4"
           style={{ animation: "blur-in 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div className="absolute -top-16 -right-14 w-52 h-52 rounded-full pointer-events-none"
             style={{ background: "radial-gradient(circle, hsl(var(--gold)/0.28), transparent 65%)" }} />

        {/* Header row */}
        <div className="relative flex items-center gap-3">
          <div className="relative animate-zoom-in-soft">
            <div className="absolute inset-[-5px] rounded-2xl opacity-70 animate-gold-conic pointer-events-none"
                 style={{ background: "conic-gradient(from 0deg, hsl(var(--gold)/0.7), transparent, hsl(var(--gold)/0.7))", filter: "blur(5px)" }} />
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden ring-1 ring-[hsl(var(--gold)/0.5)] bg-[hsl(var(--emerald-abyss))] animate-glow-gold-loop">
              <img src={gameLogo} alt="" className="w-full h-full object-cover animate-zoom-pulse" loading="lazy" decoding="async" />
            </div>
          </div>
          <div className="min-w-0 flex-1 animate-slide-in-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-[0.22em] text-[hsl(var(--gold-soft))] font-bold">Bet261 · Analyse</span>
              <ShieldCheck className="w-3 h-3 text-[hsl(var(--gold))]" />
            </div>
            <h3 className="text-lg font-black text-shine leading-tight truncate">{gameName}</h3>
            <p className="text-[10px] text-muted-foreground font-mono truncate">
              v{gameVersion} · {gameLevel}
            </p>
          </div>
          <span className={`text-[9px] px-2 py-1 rounded-full border font-bold flex items-center gap-1 animate-emerald-breathe animate-slide-in-right ${conf.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} /> {confidence}
          </span>
        </div>

        {/* Metadata grid */}
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          {[
            { label: "Moteur IA", value: `${engine} v${engineVersion}`, icon: <Cpu className="w-3 h-3" /> },
            { label: "Difficulté", value: (
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className={`w-1.5 h-3 rounded-sm ${i < DIFF_LEVEL[difficulty] ? "bg-[hsl(var(--gold))]" : "bg-[hsl(var(--emerald-mid)/0.4)]"}`} />
                  ))}
                  <span className="ml-1 text-[10px] font-black gold-text">{difficulty}</span>
                </span>
              ), icon: <Gauge className="w-3 h-3" /> },
            { label: "Serveur", value: (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(152_70%_55%)] live-dot" />
                  <span className="text-[10px] font-black text-[hsl(152_70%_60%)]">Stable</span>
                </span>
              ), icon: <Activity className="w-3 h-3" /> },
            { label: "Temps réel", value: (
                <span className="text-[10px] font-mono font-black gold-text">{fmtTime(now)}</span>
              ), icon: <Sparkles className="w-3 h-3" /> },
          ].map((m, i) => (
            <div key={m.label}
                 className={i % 2 === 0 ? "animate-slide-in-left" : "animate-slide-in-right"}
                 style={{ animationDelay: `${150 + i * 90}ms` }}>
              <div className="p-2.5 rounded-xl border border-[hsl(var(--gold)/0.18)] bg-[hsl(var(--emerald-deep)/0.55)]">
                <div className="flex items-center gap-1 mb-0.5 text-[hsl(var(--gold-soft))]">
                  {m.icon}
                  <span className="text-[8px] font-semibold uppercase tracking-wider">{m.label}</span>
                </div>
                <div className="text-sm font-black leading-none tabular-nums text-[hsl(45_30%_92%)]">{m.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Precision bar */}
        <div className="relative mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] uppercase tracking-widest text-[hsl(var(--gold-soft))] font-bold flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" /> Précision moteur
            </span>
            <span className="text-[10px] font-mono font-black gold-text">{precision.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-[hsl(var(--emerald-abyss))]/70 ring-1 ring-[hsl(var(--gold)/0.2)]">
            <div className="h-full spectrum-bar animate-progress-fill" style={{ width: `${Math.min(100, precision)}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1"><Activity className="w-2.5 h-2.5" /> Stabilité : élevée</span>
            <span>Sync {fmtSync(sync)}</span>
          </div>
        </div>

        {/* Historique temps réel — removed on user request */}
      </div>

      {/* Wrapped analysis (original logic untouched) */}
      <div className="relative rounded-3xl border border-[hsl(var(--gold)/0.2)] bg-[hsl(var(--emerald-deep)/0.45)] backdrop-blur-md p-1 cv-auto">
        <div className="absolute inset-x-0 top-0 h-6 rounded-t-3xl pointer-events-none"
             style={{ background: "linear-gradient(180deg, hsl(var(--gold)/0.15), transparent)" }} />
        <div className="relative">
          {children}
        </div>
      </div>

      <p className="text-center text-[9px] uppercase tracking-widest text-[hsl(var(--gold-soft))]/70 flex items-center justify-center gap-1">
        <Crown className="w-3 h-3" /> Bet261 Premium · Moteur Émeraude
      </p>
    </div>
  );
};

export default Bet261AnalysisShell;