import { ReactNode, useEffect, useState } from "react";
import { Rocket, Radio, Cpu, ChevronRight, Activity, History, Zap, BarChart3 } from "lucide-react";

export type Confidence = "Faible" | "Moyen" | "Élevé" | "Très élevé";

interface Props {
  gameName: string;
  gameLogo: string;
  gameVersion: string;
  gameLevel: string;
  difficulty: "Facile" | "Moyen" | "Difficile" | "Expert";
  engine: string;
  engineVersion: string;
  precision: number;
  confidence: Confidence;
  history?: string[];
  children: ReactNode;
}

const CONF_PCT: Record<Confidence, number> = { "Faible": 25, "Moyen": 55, "Élevé": 78, "Très élevé": 94 };
const DIFF_PCT: Record<Props["difficulty"], number> = { Facile: 25, Moyen: 50, Difficile: 75, Expert: 100 };

const OnexbetAnalysisShell = ({
  gameName, gameLogo, gameVersion, gameLevel, difficulty, engine, engineVersion, precision, confidence, history = [], children,
}: Props) => {
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
      {/* Meta dashboard — Sunset Blaze */}
      <div className="relative overflow-hidden rounded-tl-3xl rounded-tr-md rounded-bl-md rounded-br-3xl mesh-sunset p-4"
           style={{ animation: "blur-in 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
        {/* diagonal shimmer overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -inset-x-10 top-1/3 h-16"
               style={{ background: "linear-gradient(90deg, transparent, hsl(var(--sunset-amber)/0.25), transparent)",
                        animation: "shimmer-sunset 3.5s ease-in-out infinite", transform: "skewX(-18deg)" }} />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="relative animate-tilt-float animate-zoom-in-soft">
            <div className="absolute inset-[-5px] rounded-2xl opacity-70 blur-md pointer-events-none animate-glow-sunset-loop"
                 style={{ background: "radial-gradient(circle, hsl(var(--sunset-magenta)) 0%, transparent 70%)" }} />
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden ring-1 ring-[hsl(var(--sunset-magenta)/0.6)] bg-[hsl(var(--sunset-ink))]">
              <img src={gameLogo} alt="" className="w-full h-full object-cover animate-zoom-pulse" loading="lazy" decoding="async" />
            </div>
          </div>
          <div className="min-w-0 flex-1 animate-slide-in-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-[0.22em] font-bold text-[hsl(var(--sunset-amber))]">1xBet · Analyse</span>
              <Radio className="w-3 h-3 text-[hsl(var(--sunset-magenta))]" />
            </div>
            <h3 className="text-lg font-black sunset-text leading-tight truncate">{gameName}</h3>
            <p className="text-[10px] font-mono truncate text-[hsl(45_20%_88%/0.7)]">
              v{gameVersion} · {gameLevel}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 animate-slide-in-right">
            <span className="text-[9px] px-2 py-1 rounded-md sunset-gradient text-primary-foreground font-black flex items-center gap-1 shadow-lg shadow-[hsl(var(--sunset-magenta)/0.4)]">
              <Rocket className="w-2.5 h-2.5" /> {confidence}
            </span>
            <span className="text-[9px] font-mono text-[hsl(45_20%_88%/0.55)]">{fmtTime(now)}</span>
          </div>
        </div>

        {/* Metric bars */}
        <div className="relative mt-4 space-y-2.5">
          {[
            { label: "Moteur IA",  value: `${engine} v${engineVersion}`, pct: 100, icon: <Cpu className="w-2.5 h-2.5" />,   color: "hsl(var(--sunset-orange))" },
            { label: "Précision",  value: `${precision.toFixed(1)}%`,     pct: precision, icon: <BarChart3 className="w-2.5 h-2.5" />, color: "hsl(var(--sunset-amber))" },
            { label: "Confiance",  value: confidence,                     pct: CONF_PCT[confidence], icon: <Zap className="w-2.5 h-2.5" />,       color: "hsl(var(--sunset-magenta))" },
            { label: "Difficulté", value: difficulty,                     pct: DIFF_PCT[difficulty], icon: <Activity className="w-2.5 h-2.5" />,  color: "hsl(var(--sunset-violet))" },
          ].map((m, i) => (
            <div key={m.label}
                 className={i % 2 === 0 ? "animate-slide-in-left" : "animate-slide-in-right"}
                 style={{ animationDelay: `${180 + i * 110}ms` }}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] uppercase tracking-wider font-bold flex items-center gap-1" style={{ color: m.color }}>
                  {m.icon} {m.label}
                </span>
                <span className="text-[10px] font-mono font-black text-[hsl(45_30%_92%)]">{m.value}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden bg-[hsl(var(--sunset-ink))]/80 ring-1" style={{ borderColor: `${m.color}30` }}>
                <div className="h-full animate-progress-fill" style={{ width: `${Math.min(100, m.pct)}%`, background: `linear-gradient(90deg, ${m.color}, hsl(var(--sunset-violet)))` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="relative flex items-center justify-between mt-3 text-[9px] text-[hsl(45_20%_88%/0.65)]">
          <span className="flex items-center gap-1"><Activity className="w-2.5 h-2.5 text-[hsl(var(--sunset-orange))]" /> Serveur stable</span>
          <span className="flex items-center gap-1">
            Sync {fmtSync(sync)} <ChevronRight className="w-3 h-3 text-[hsl(var(--sunset-magenta))] animate-chevron" />
          </span>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="relative mt-3 pt-3 border-t border-[hsl(var(--sunset-magenta)/0.25)] cv-auto-sm">
            <div className="flex items-center gap-1 mb-2 text-[hsl(var(--sunset-amber))]">
              <History className="w-3 h-3" />
              <span className="text-[9px] uppercase tracking-widest font-bold">Historique live</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar overscroll-x-contain">
              {history.slice(-10).map((h, i) => (
                <span key={i}
                      className="shrink-0 text-[10px] font-mono font-black px-2 py-1 rounded-md sunset-border bg-[hsl(var(--sunset-ink))]/60 sunset-text">
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Wrapped analysis body */}
      <div className="relative rounded-tl-3xl rounded-tr-md rounded-bl-md rounded-br-3xl sunset-border bg-[hsl(var(--sunset-ink))]/70 p-1 cv-auto">
        <div className="relative">
          {children}
        </div>
      </div>

      <p className="text-center text-[9px] uppercase tracking-widest text-[hsl(var(--sunset-amber))]/70 flex items-center justify-center gap-1">
        <Rocket className="w-3 h-3" /> 1xBet Premium · Sunset AI
      </p>
    </div>
  );
};

export default OnexbetAnalysisShell;