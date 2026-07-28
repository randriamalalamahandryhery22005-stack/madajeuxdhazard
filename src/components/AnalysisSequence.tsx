import { useEffect, useMemo, useState } from "react";
import {
  Radar, Scale, Waves, Sparkles, Rocket, Target, Trophy,
  Cpu, Activity, Signal, ShieldCheck, Zap, Check, LucideIcon,
} from "lucide-react";

/**
 * Rich, themed multi-step "analysis" animation played before results appear.
 * Variants are visually distinct per game while sharing the same layout skeleton.
 */
export type AnalysisVariant =
  | "premium-realtime"
  | "balanced"
  | "spribe"
  | "cosmox"
  | "jetx"
  | "penalty";

interface Preset {
  title: string;
  subtitle: string;
  accent: string;       // primary hex color
  accentSoft: string;   // rgba fallback for glows
  gradient: string;     // tailwind classes: from-... via-... to-...
  ring: string;
  text: string;
  chip: string;
  bar: string;
  Icon: LucideIcon;
  visual: "radar" | "scale" | "wave" | "orbit" | "jet" | "goal" | "pitch";
  steps: string[];
  badge: string;
}

const PRESETS: Record<AnalysisVariant, Preset> = {
  "premium-realtime": {
    title: "Analyse Temps Réel",
    subtitle: "Capture du signal haute fréquence",
    accent: "#10b981",
    accentSoft: "16,185,129",
    gradient: "from-emerald-500/25 via-emerald-400/10 to-green-900/10",
    ring: "border-emerald-500/40",
    text: "text-emerald-300",
    chip: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
    bar: "from-emerald-400 via-emerald-300 to-green-300",
    Icon: Radar,
    visual: "radar",
    badge: "LIVE",
    steps: [
      "Connexion aux nœuds temps réel",
      "Échantillonnage des dernières manches",
      "Corrélation heure ↔ coefficient",
      "Vérification de fiabilité du signal",
      "Génération des prédictions",
    ],
  },
  balanced: {
    title: "Calcul Équilibré",
    subtitle: "Optimisation de la stabilité",
    accent: "#f59e0b",
    accentSoft: "245,158,11",
    gradient: "from-amber-500/25 via-orange-400/10 to-yellow-900/10",
    ring: "border-amber-500/40",
    text: "text-amber-300",
    chip: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    bar: "from-amber-400 via-orange-300 to-yellow-300",
    Icon: Scale,
    visual: "scale",
    badge: "STABLE",
    steps: [
      "Chargement du modèle stable",
      "Filtrage des valeurs extrêmes",
      "Équilibrage risque / rendement",
      "Consolidation des indicateurs",
      "Compilation des prédictions",
    ],
  },
  spribe: {
    title: "Calcul Spribe",
    subtitle: "Décodage du moteur Spribe",
    accent: "#22d3ee",
    accentSoft: "34,211,238",
    gradient: "from-cyan-500/25 via-sky-400/10 to-blue-900/10",
    ring: "border-cyan-500/40",
    text: "text-cyan-300",
    chip: "bg-cyan-500/15 border-cyan-500/40 text-cyan-300",
    bar: "from-cyan-400 via-sky-300 to-teal-300",
    Icon: Waves,
    visual: "wave",
    badge: "SPRIBE",
    steps: [
      "Synchronisation horloge serveur",
      "Analyse des ondulations de coefficient",
      "Détection du prochain cycle",
      "Estimation de la confiance",
      "Prédiction validée",
    ],
  },
  cosmox: {
    title: "Analyse CosmoX",
    subtitle: "Balayage orbital des coefficients",
    accent: "#22d3ee",
    accentSoft: "34,211,238",
    gradient: "from-cyan-500/25 via-teal-400/10 to-indigo-900/15",
    ring: "border-cyan-400/40",
    text: "text-cyan-300",
    chip: "bg-cyan-500/15 border-cyan-500/40 text-cyan-300",
    bar: "from-cyan-400 via-teal-300 to-sky-300",
    Icon: Sparkles,
    visual: "orbit",
    badge: "COSMIC",
    steps: [
      "Alignement des satellites de données",
      "Balayage des dernières trajectoires",
      "Fusion des flux cosmiques",
      "Estimation du prochain coefficient",
      "Compilation des prédictions",
    ],
  },
  jetx: {
    title: "Analyse JetX",
    subtitle: "Lecture thermique de la traînée",
    accent: "#fb923c",
    accentSoft: "251,146,60",
    gradient: "from-orange-500/25 via-red-500/10 to-rose-900/10",
    ring: "border-orange-500/40",
    text: "text-orange-300",
    chip: "bg-orange-500/15 border-orange-500/40 text-orange-300",
    bar: "from-orange-400 via-red-400 to-rose-400",
    Icon: Rocket,
    visual: "jet",
    badge: "BOOST",
    steps: [
      "Démarrage des propulseurs d'analyse",
      "Mesure de la traînée thermique",
      "Cartographie des pics récents",
      "Estimation de l'apogée",
      "Compilation des prédictions",
    ],
  },
  penalty: {
    title: "Analyse Penalty",
    subtitle: "Cartographie de la cage",
    accent: "#22c55e",
    accentSoft: "34,197,94",
    gradient: "from-green-500/25 via-emerald-500/10 to-lime-900/10",
    ring: "border-green-500/40",
    text: "text-green-300",
    chip: "bg-green-500/15 border-green-500/40 text-green-300",
    bar: "from-green-400 via-emerald-300 to-lime-300",
    Icon: Target,
    visual: "goal",
    badge: "SHOOT",
    steps: [
      "Analyse du profil du tireur",
      "Étude des zones préférentielles",
      "Simulation Monte-Carlo (5 tirs)",
      "Calcul du taux de conversion",
      "Compilation des prédictions",
    ],
  },
};

/* -------------------------------------------------------------------------- */
/*  Themed central visuals                                                    */
/* -------------------------------------------------------------------------- */

const CentralVisual = ({ preset, progress }: { preset: Preset; progress: number }) => {
  const c = preset.accent;
  switch (preset.visual) {
    case "radar":
      return (
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: `rgba(${preset.accentSoft},0.35)` }} />
          <div className="absolute inset-3 rounded-full border" style={{ borderColor: `rgba(${preset.accentSoft},0.25)` }} />
          <div className="absolute inset-6 rounded-full border" style={{ borderColor: `rgba(${preset.accentSoft},0.2)` }} />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${c} 60deg, transparent 90deg)`,
              animation: "spin 2.4s linear infinite",
              opacity: 0.55,
              maskImage: "radial-gradient(circle, black 50%, transparent 72%)",
              WebkitMaskImage: "radial-gradient(circle, black 50%, transparent 72%)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c, boxShadow: `0 0 18px ${c}` }} />
          </div>
        </div>
      );
    case "scale":
      return (
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div
            className="w-24 h-1 rounded-full origin-center"
            style={{ background: `linear-gradient(90deg, ${c}, rgba(${preset.accentSoft},0.2), ${c})`, animation: "seq-tilt 2.4s ease-in-out infinite" }}
          />
          <div className="absolute w-3 h-3 rounded-full" style={{ backgroundColor: c, top: "48%" }} />
          <div className="absolute left-2 top-8 w-10 h-10 rounded-lg border" style={{ borderColor: c, animation: "seq-bob-a 2.4s ease-in-out infinite" }} />
          <div className="absolute right-2 top-8 w-10 h-10 rounded-lg border" style={{ borderColor: c, animation: "seq-bob-b 2.4s ease-in-out infinite" }} />
        </div>
      );
    case "wave":
      return (
        <div className="relative w-40 h-24 flex items-center justify-center">
          <svg viewBox="0 0 200 80" className="w-full h-full">
            <path d="M0,40 Q25,10 50,40 T100,40 T150,40 T200,40" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" style={{ animation: "seq-dash 2s linear infinite", strokeDasharray: 12 }} />
            <path d="M0,40 Q25,60 50,40 T100,40 T150,40 T200,40" stroke={c} strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" style={{ animation: "seq-dash 3s linear infinite reverse", strokeDasharray: 8 }} />
          </svg>
        </div>
      );
    case "orbit":
      return (
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 rounded-full border" style={{ borderColor: `rgba(${preset.accentSoft},0.35)`, animation: "spin 4s linear infinite" }}>
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ backgroundColor: c, boxShadow: `0 0 14px ${c}` }} />
          </div>
          <div className="absolute inset-4 rounded-full border" style={{ borderColor: `rgba(${preset.accentSoft},0.25)`, animation: "spin 3s linear infinite reverse" }}>
            <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6" style={{ color: c }} />
          </div>
        </div>
      );
    case "jet":
      return (
        <div className="relative w-40 h-24 overflow-hidden">
          {[0, 1, 2].map(i => (
            <div key={i} className="absolute top-1/2 -translate-y-1/2 h-0.5 rounded-full" style={{
              background: `linear-gradient(90deg, transparent, ${c}, transparent)`,
              width: "100%",
              opacity: 0.6 - i * 0.15,
              animation: `seq-jet ${1.2 + i * 0.4}s linear infinite`,
              animationDelay: `${i * 0.15}s`,
              top: `${40 + i * 8}%`,
            }} />
          ))}
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Rocket className="w-8 h-8 -rotate-45" style={{ color: c, filter: `drop-shadow(0 0 8px ${c})` }} />
          </div>
        </div>
      );
    case "goal":
      return (
        <div className="relative w-36 h-24">
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-1 p-1 rounded-lg border-2" style={{ borderColor: c }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded" style={{
                background: `rgba(${preset.accentSoft},0.15)`,
                animation: `seq-cell 1.6s ease-in-out infinite`,
                animationDelay: `${i * 0.12}s`,
              }} />
            ))}
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full" style={{ backgroundColor: c, boxShadow: `0 0 18px ${c}`, animation: "seq-ball 1.6s ease-in-out infinite" }} />
        </div>
      );
    case "pitch":
      return (
        <div className="relative w-40 h-24 rounded-lg border-2 overflow-hidden" style={{ borderColor: c, background: `linear-gradient(90deg, rgba(${preset.accentSoft},0.1), transparent, rgba(${preset.accentSoft},0.1))` }}>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px" style={{ backgroundColor: c, opacity: 0.5 }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border" style={{ borderColor: c }} />
          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-10 border-r-2 border-y-2" style={{ borderColor: c }} />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-10 border-l-2 border-y-2" style={{ borderColor: c }} />
          <div className="absolute w-2.5 h-2.5 rounded-full" style={{
            backgroundColor: c, boxShadow: `0 0 12px ${c}`,
            animation: "seq-move 2.2s ease-in-out infinite",
            top: "45%",
          }} />
        </div>
      );
  }
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

interface Props {
  variant: AnalysisVariant;
  duration?: number;
  onComplete: () => void;
  /** Override the default title. */
  title?: string;
  /** Override the default subtitle. */
  subtitle?: string;
}

const AnalysisSequence = ({ variant, duration = 5000, onComplete, title, subtitle }: Props) => {
  const preset = PRESETS[variant];
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState<"in" | "run" | "out">("in");

  // Fake but stable metrics
  const metrics = useMemo(() => ({
    samples: 480 + Math.floor(Math.random() * 220),
    latency: 8 + Math.floor(Math.random() * 14),
    seed: Math.random().toString(16).slice(2, 8).toUpperCase(),
  }), []);

  useEffect(() => {
    const start = performance.now();
    const tIn = setTimeout(() => setPhase("run"), 80);
    let raf = 0;
    const tick = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);
      const idx = Math.min(preset.steps.length - 1, Math.floor((p / 100) * preset.steps.length));
      setStepIdx(idx);
      if (elapsed < duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const tOut = setTimeout(() => setPhase("out"), duration - 380);
    const tEnd = setTimeout(onComplete, duration);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(tIn);
      clearTimeout(tOut);
      clearTimeout(tEnd);
    };
  }, [duration, onComplete, preset.steps.length]);

  const Icon = preset.Icon;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl transition-opacity duration-300 ${phase === "out" ? "opacity-0" : "opacity-100"}`}
      role="status"
      aria-live="polite"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-3xl opacity-40"
          style={{ background: `radial-gradient(circle, rgba(${preset.accentSoft},0.35), transparent 60%)` }} />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-25"
          style={{ background: `radial-gradient(circle, rgba(${preset.accentSoft},0.4), transparent 60%)` }} />
      </div>

      <div className={`relative flex-1 flex flex-col items-center justify-center px-6 gap-6 transition-all duration-500 ${phase === "in" ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"}`}>
        {/* Badge */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest ${preset.chip}`}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: preset.accent }} />
          {preset.badge}
        </div>

        {/* Central visual + icon halo */}
        <div className="relative flex flex-col items-center gap-5">
          <div className={`relative w-40 h-40 rounded-3xl border-2 ${preset.ring} bg-gradient-to-br ${preset.gradient} flex items-center justify-center overflow-hidden shadow-2xl`}
            style={{ boxShadow: `0 20px 60px -20px rgba(${preset.accentSoft},0.5)` }}>
            <CentralVisual preset={preset} progress={progress} />
            <div className="absolute top-2 left-2 flex items-center gap-1">
              <Icon className="w-3.5 h-3.5" style={{ color: preset.accent }} />
              <span className={`text-[9px] font-bold uppercase tracking-wider ${preset.text}`}>Analyse</span>
            </div>
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <Cpu className="w-3 h-3" style={{ color: preset.accent }} />
              <span className={`text-[9px] font-mono ${preset.text}`}>{metrics.seed}</span>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h2 className={`text-xl font-black ${preset.text}`}>{title ?? preset.title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle ?? preset.subtitle}</p>
          </div>
        </div>

        {/* Steps list */}
        <ul className="w-full max-w-xs space-y-1.5">
          {preset.steps.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <li
                key={s}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[11px] font-medium transition-all duration-300 ${
                  done ? `${preset.chip} opacity-70` : active ? `${preset.chip}` : "border-border/30 bg-secondary/30 text-muted-foreground opacity-60"
                }`}
                style={{ transform: active ? "translateY(-1px)" : "none" }}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: done || active ? preset.accent : "transparent",
                    border: done || active ? "none" : "1px solid rgba(255,255,255,0.15)",
                  }}>
                  {done ? <Check className="w-2.5 h-2.5 text-black" strokeWidth={4} /> : active ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  ) : null}
                </span>
                <span className="truncate">{s}</span>
                {active && <Zap className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: preset.accent }} />}
              </li>
            );
          })}
        </ul>

        {/* Progress bar */}
        <div className="w-full max-w-xs space-y-1.5">
          <div className={`h-2 rounded-full bg-secondary/50 overflow-hidden border ${preset.ring}`}>
            <div className={`h-full bg-gradient-to-r ${preset.bar} transition-[width] duration-200 ease-out`} style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {metrics.samples} pts</span>
            <span className={`font-bold ${preset.text}`}>{Math.round(progress)}%</span>
            <span className="flex items-center gap-1"><Signal className="w-3 h-3" /> {metrics.latency}ms</span>
          </div>
        </div>

        {/* Trust footer */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="w-3 h-3" style={{ color: preset.accent }} />
          Traitement sécurisé · aucune donnée exportée
        </div>
      </div>
    </div>
  );
};

export default AnalysisSequence;
