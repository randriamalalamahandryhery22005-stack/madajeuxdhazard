import { ArrowLeft, Sparkles, Zap, Crown, Orbit, Timer, BarChart3, Target, Activity, Signal, ShieldCheck, Gauge, Clock as ClockIcon, TrendingUp, Rocket, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type PredictionResult } from "@/lib/predictions";
import { TONE, stabilityTone as stabilityToneOf, riskTone as riskToneOf, confidenceTone, confidenceLabel } from "@/lib/statusStyles";
import { StatusPill, StatusDot } from "@/components/StatusPill";

type ResultVariant = "basic" | "pro" | "premium" | "cosmox" | "realtime" | "balanced" | "jetx";
type HeroVariant = "premium" | "pro" | "cosmox" | "jetx" | "realtime";

// =============== HERO SINGLE RESULT (Premium / Pro / CosmoX / JetX) ===============
type HeroTheme = {
  label: string;
  Icon: typeof Crown;
  ring: string;       // tailwind border color
  glow: string;       // tailwind shadow color
  coeffGradient: string; // tailwind text gradient
  ringGradient: string; // svg stop colors
  accentBg: string;
  accentText: string;
  chipBg: string;
};

const HERO_THEMES: Record<HeroVariant, HeroTheme> = {
  premium: {
    label: "Aviator Premium",
    Icon: Crown,
    ring: "border-amber-400/40",
    glow: "shadow-amber-500/30",
    coeffGradient: "bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 bg-clip-text text-transparent",
    ringGradient: "stop-color:#fbbf24;stop-color:#f59e0b",
    accentBg: "bg-amber-500/15",
    accentText: "text-amber-400",
    chipBg: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  pro: {
    label: "Aviator Pro",
    Icon: Zap,
    ring: "border-violet-500/40",
    glow: "shadow-violet-500/30",
    coeffGradient: "bg-gradient-to-br from-violet-300 via-fuchsia-400 to-purple-500 bg-clip-text text-transparent",
    ringGradient: "stop-color:#a78bfa;stop-color:#7c3aed",
    accentBg: "bg-violet-500/15",
    accentText: "text-violet-400",
    chipBg: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  },
  cosmox: {
    label: "CosmoX",
    Icon: Orbit,
    ring: "border-cyan-500/40",
    glow: "shadow-cyan-500/30",
    coeffGradient: "bg-gradient-to-br from-cyan-300 via-sky-400 to-teal-400 bg-clip-text text-transparent",
    ringGradient: "stop-color:#22d3ee;stop-color:#14b8a6",
    accentBg: "bg-cyan-500/15",
    accentText: "text-cyan-400",
    chipBg: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  },
  jetx: {
    label: "JetX",
    Icon: Rocket,
    ring: "border-orange-500/40",
    glow: "shadow-orange-500/30",
    coeffGradient: "bg-gradient-to-br from-orange-300 via-red-400 to-rose-500 bg-clip-text text-transparent",
    ringGradient: "stop-color:#fb923c;stop-color:#ef4444",
    accentBg: "bg-orange-500/15",
    accentText: "text-orange-400",
    chipBg: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  },
  realtime: {
    label: "Temps Réel",
    Icon: Radar,
    ring: "border-emerald-500/40",
    glow: "shadow-emerald-500/30",
    coeffGradient: "bg-gradient-to-br from-emerald-300 via-emerald-400 to-green-500 bg-clip-text text-transparent",
    ringGradient: "stop-color:#34d399;stop-color:#10b981",
    accentBg: "bg-emerald-500/15",
    accentText: "text-emerald-400",
    chipBg: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
};

const HeroResult = ({ result, title, onBack, theme: t }: { result: PredictionResult; title: string; onBack: () => void; theme: HeroTheme }) => {
  const conf = result.confidence;
  const r = 44;
  const c = 2 * Math.PI * r;
  const offset = c - (conf / 100) * c;
  const stabT = TONE[stabilityToneOf(result.stability)];
  const riskT = TONE[riskToneOf(result.risk)];
  const stabilityTone = `${stabT.text} ${stabT.bg} ${stabT.border}`;
  const riskTone = `${riskT.text} ${riskT.bg} ${riskT.border}`;

  return (
    <div className="space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
      {/* Header pill */}
      <div className={`flex items-center justify-between gap-2 p-3 rounded-2xl border ${t.ring} ${t.accentBg} backdrop-blur-sm`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl ${t.accentBg} ${t.ring} border flex items-center justify-center flex-shrink-0`}>
            <t.Icon className={`w-4 h-4 ${t.accentText}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black truncate">{title}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Signal unique haute précision</p>
          </div>
        </div>
        <span className={`text-[9px] px-2 py-1 rounded-full border font-bold uppercase tracking-wider ${t.chipBg}`}>1 prédiction</span>
      </div>

      {/* Hero card */}
      <div
        className={`relative rounded-3xl overflow-hidden border-2 ${t.ring} shadow-2xl ${t.glow} backdrop-blur-sm`}
        style={{ background: "linear-gradient(160deg, hsl(var(--card)/0.95), hsl(var(--card)/0.7))" }}
      >
        {/* aurora bg */}
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full blur-3xl opacity-30 pointer-events-none animate-pulse"
          style={{ background: t === HERO_THEMES.premium ? "radial-gradient(circle, #fbbf24, transparent)" : t === HERO_THEMES.pro ? "radial-gradient(circle, #a78bfa, transparent)" : t === HERO_THEMES.cosmox ? "radial-gradient(circle, #22d3ee, transparent)" : t === HERO_THEMES.realtime ? "radial-gradient(circle, #34d399, transparent)" : "radial-gradient(circle, #fb923c, transparent)" }} />

        <div className="relative p-5 space-y-4">
          {/* Time bar */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-background/60 border border-border/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <ClockIcon className={`w-4 h-4 ${t.accentText} flex-shrink-0`} />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Heure exacte</p>
                <p className="font-mono text-lg font-black tracking-wider tabular-nums truncate">{result.time}</p>
              </div>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">HH:MM:SS</span>
          </div>

          {/* Coefficient + Ring */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
            <div className="min-w-0 space-y-1">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Coefficient prédit</p>
              <p className={`text-5xl font-black tracking-tight leading-none font-mono tabular-nums truncate ${t.coeffGradient}`}>{result.coefficient}</p>
              <p className="text-[10px] text-muted-foreground">Précision 3 décimales</p>
            </div>

            <div className="relative w-[108px] h-[108px] flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <defs>
                  <linearGradient id={`grad-${t.label}`} x1="0" y1="0" x2="1" y2="1">
                   <stop offset="0%" style={{ stopColor: t === HERO_THEMES.premium ? "#fde047" : t === HERO_THEMES.pro ? "#c4b5fd" : t === HERO_THEMES.cosmox ? "#67e8f9" : t === HERO_THEMES.realtime ? "#6ee7b7" : "#fed7aa" }} />
                   <stop offset="100%" style={{ stopColor: t === HERO_THEMES.premium ? "#f59e0b" : t === HERO_THEMES.pro ? "#7c3aed" : t === HERO_THEMES.cosmox ? "#14b8a6" : t === HERO_THEMES.realtime ? "#10b981" : "#ef4444" }} />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r={r} stroke="hsl(var(--border))" strokeWidth="6" fill="none" opacity="0.4" />
                <circle cx="50" cy="50" r={r} stroke={`url(#grad-${t.label})`} strokeWidth="6" fill="none"
                  strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
                  style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black tabular-nums ${t.coeffGradient}`}>{conf}%</span>
                <span className="flex items-center gap-1 text-[8px] uppercase tracking-widest text-muted-foreground font-bold">
                  <StatusDot tone={confidenceTone(conf)} /> {confidenceLabel(conf)}
                </span>
              </div>
            </div>
          </div>

          {/* Indicator chips */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2.5 rounded-xl border ${stabilityTone} text-center`}>
              <Gauge className="w-3.5 h-3.5 mx-auto mb-0.5 opacity-80" />
              <p className="text-[8px] uppercase tracking-wider opacity-70">Stabilité</p>
              <p className="text-xs font-black">{result.stability}</p>
            </div>
            <div className={`p-2.5 rounded-xl border ${riskTone} text-center`}>
              <Activity className="w-3.5 h-3.5 mx-auto mb-0.5 opacity-80" />
              <p className="text-[8px] uppercase tracking-wider opacity-70">Risque</p>
              <p className="text-xs font-black">{result.risk}</p>
            </div>
            <div className={`p-2.5 rounded-xl border ${t.ring} ${t.accentBg} text-center`}>
              <Target className={`w-3.5 h-3.5 mx-auto mb-0.5 ${t.accentText}`} />
              <p className="text-[8px] uppercase tracking-wider text-muted-foreground">Fiabilité</p>
              <p className={`text-xs font-black ${t.accentText}`}>{result.reliability}%</p>
            </div>
          </div>

          {/* Bottom signal bar */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/50 border border-border/40">
            <div className="relative">
              <Signal className={`w-3.5 h-3.5 ${t.accentText}`} />
              <div className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${t.accentText.replace("text", "bg")} animate-pulse`} />
            </div>
            <span className="text-[10px] text-muted-foreground flex-1">Signal validé · seed déterministe</span>
            <span className={`text-[9px] font-black uppercase tracking-wider ${t.accentText}`}>{t.label}</span>
          </div>
        </div>
      </div>

      <Button variant="premium-outline" className="w-full h-12 text-sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Nouvelle analyse
      </Button>
    </div>
  );
};


interface PredictionResultsProps {
  results: PredictionResult[];
  title: string;
  onBack: () => void;
  variant?: ResultVariant;
}

const stabilityColor = (s: string) => TONE[stabilityToneOf(s)].text;
const riskColor = (r: string) => TONE[riskToneOf(r)].text;

/**
 * Reusable card-header that stacks Time (top) + Coefficient (bottom) so nothing
 * overlaps on narrow 2-column layouts. Index badge stays on the left.
 */
const CardHeader = ({
  index,
  time,
  coefficient,
  badgeBg,
  badgeText,
  coeffText,
  borderClass,
  bgClass,
}: {
  index: number;
  time: string;
  coefficient: string;
  badgeBg: string;
  badgeText: string;
  coeffText: string;
  borderClass?: string;
  bgClass?: string;
}) => (
  <div className={`px-2.5 py-2 flex items-center gap-2 ${bgClass ?? ""} ${borderClass ?? ""} min-w-0`}>
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0 shadow-sm ${badgeBg} ${badgeText}`}>
      {index + 1}
    </div>
    <div className="flex-1 min-w-0 flex flex-col leading-tight">
      <span className="font-mono text-[10px] font-semibold text-muted-foreground/80 truncate uppercase tracking-wider">{time}</span>
      <span className={`font-mono text-base font-black truncate tracking-tight ${coeffText}`}>{coefficient}</span>
    </div>
  </div>
);

// Compact 3-stat footer with coherent status dots
const StatFooter = ({ r, accent, accentColor }: { r: PredictionResult; accent: string; accentColor: string }) => {
  const sTone = stabilityToneOf(r.stability);
  const rTone = riskToneOf(r.risk);
  const fTone = confidenceTone(r.reliability);
  return (
    <div className={`grid grid-cols-3 border-t ${accent}`}>
      <div className="flex flex-col items-center justify-center py-1.5 px-1 min-w-0">
        <span className={`flex items-center gap-1 text-[10px] font-bold truncate w-full justify-center ${TONE[sTone].text}`}>
          <StatusDot tone={sTone} />{r.stability}
        </span>
        <span className="text-[8px] text-muted-foreground">Stab.</span>
      </div>
      <div className={`flex flex-col items-center justify-center py-1.5 px-1 border-x min-w-0 ${accent}`}>
        <span className={`flex items-center gap-1 text-[10px] font-bold truncate w-full justify-center ${TONE[rTone].text}`}>
          <StatusDot tone={rTone} />{r.risk}
        </span>
        <span className="text-[8px] text-muted-foreground">Risque</span>
      </div>
      <div className="flex flex-col items-center justify-center py-1.5 px-1 min-w-0">
        <span className={`flex items-center gap-1 text-[10px] font-bold ${accentColor}`}>
          <StatusDot tone={fTone} />{r.reliability}%
        </span>
        <span className="text-[8px] text-muted-foreground">Fiab.</span>
      </div>
    </div>
  );
};

const ConfidenceBar = ({ value, gradient, label, labelColor }: { value: number; gradient: string; label: string; labelColor: string }) => {
  const tone = confidenceTone(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] gap-2">
        <span className="text-muted-foreground truncate flex items-center gap-1">
          <StatusDot tone={tone} /> {label}
        </span>
        <span className={`font-bold flex-shrink-0 tabular-nums ${labelColor}`}>
          {value}% <span className={`ml-1 font-semibold ${TONE[tone].text}`}>· {confidenceLabel(value)}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary/80 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${gradient}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

// ===== BASIC =====
const BasicResult = ({ results, title, onBack }: { results: PredictionResult[]; title: string; onBack: () => void }) => (
  <div className="space-y-3" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <BarChart3 className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <span className="text-sm font-bold text-blue-400 truncate">{title}</span>
      </div>
      <span className="text-[10px] text-muted-foreground flex-shrink-0">{results.length} résultats</span>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
    {results.map((r, i) => (
      <div key={i} className="rounded-xl bg-card/80 border border-blue-500/20 overflow-hidden flex flex-col"
        style={{ animation: `fade-up 0.4s ease ${i * 60}ms forwards`, opacity: 0 }}>
        <CardHeader
          index={i}
          time={r.time}
          coefficient={r.coefficient}
          badgeBg="bg-blue-500/15"
          badgeText="text-blue-400"
          coeffText="text-blue-300"
        />
        <div className="px-2.5 pb-2.5 space-y-1.5">
          <ConfidenceBar value={r.confidence} gradient="bg-blue-500" label="Conf." labelColor="text-blue-400" />
          <div className="flex justify-between gap-1 text-[9px]">
            <span className={`truncate ${stabilityColor(r.stability)}`}>{r.stability}</span>
            <span className={`truncate ${riskColor(r.risk)}`}>{r.risk}</span>
          </div>
        </div>
      </div>
    ))}
    </div>
    <Button variant="premium-outline" className="w-full h-11 mt-2 text-sm" onClick={onBack}>
      <ArrowLeft className="w-4 h-4 mr-2" /> Nouvelle analyse
    </Button>
  </div>
);

// ===== PRO =====
const ProResult = ({ results, title, onBack }: { results: PredictionResult[]; title: string; onBack: () => void }) => (
  <div className="space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
    <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/25">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-violet-400 truncate">{title}</h3>
          <p className="text-[10px] text-muted-foreground">{results.length} prédictions avancées</p>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
    {results.map((r, i) => (
      <div key={i} className="rounded-2xl bg-card/90 border border-violet-500/25 overflow-hidden backdrop-blur-sm flex flex-col"
        style={{ animation: `fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms forwards`, opacity: 0 }}>
        <CardHeader
          index={i}
          time={r.time}
          coefficient={r.coefficient}
          badgeBg="bg-gradient-to-br from-violet-500 to-purple-600"
          badgeText="text-white"
          coeffText="text-violet-300"
          borderClass="border-b border-border/30"
          bgClass="bg-gradient-to-r from-violet-500/10 to-transparent"
        />
        <div className="px-2.5 py-2 flex-1">
          <ConfidenceBar value={r.confidence} gradient="bg-gradient-to-r from-violet-500 to-purple-400" label="Confiance" labelColor="text-violet-400" />
        </div>
        <StatFooter r={r} accent="border-border/30" accentColor="text-violet-400" />
      </div>
    ))}
    </div>
    <Button variant="premium-outline" className="w-full h-12 mt-2 text-sm" onClick={onBack}>
      <ArrowLeft className="w-4 h-4 mr-2" /> Nouvelle analyse
    </Button>
  </div>
);

// ===== REALTIME =====
const RealtimeResult = ({ results, title, onBack }: { results: PredictionResult[]; title: string; onBack: () => void }) => (
  <div className="space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 animate-pulse" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-emerald-400 truncate">{title}</h3>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Signal className="w-3 h-3 text-green-400" /> En direct · {results.length} signaux
          </p>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
    {results.map((r, i) => (
      <div key={i} className="rounded-2xl overflow-hidden border border-emerald-500/25 bg-gradient-to-br from-card/90 via-card/80 to-emerald-500/5 flex flex-col"
        style={{ animation: `fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms forwards`, opacity: 0 }}>
        <CardHeader
          index={i}
          time={r.time}
          coefficient={r.coefficient}
          badgeBg="bg-emerald-500/15 border border-emerald-500/30"
          badgeText="text-emerald-400"
          coeffText="text-emerald-300"
        />
        <div className="px-2.5 pb-2.5 space-y-1.5 flex-1 flex flex-col justify-end">
          <ConfidenceBar value={r.confidence} gradient="bg-gradient-to-r from-emerald-500 to-green-400" label="Précision" labelColor="text-emerald-400" />
          <div className="flex flex-wrap gap-1">
            <StatusPill tone={stabilityToneOf(r.stability)} label={r.stability} caption="Stabilité" />
            <StatusPill tone={riskToneOf(r.risk)} label={r.risk} caption="Risque" />
            <StatusPill tone={confidenceTone(r.reliability)} label={`${r.reliability}%`} caption="Fiabilité" />
          </div>
        </div>
      </div>
    ))}
    </div>
    <Button variant="premium-outline" className="w-full h-12 mt-2 text-sm" onClick={onBack}>
      <ArrowLeft className="w-4 h-4 mr-2" /> Nouvelle analyse
    </Button>
  </div>
);

// ===== BALANCED =====
const BalancedResult = ({ results, title, onBack }: { results: PredictionResult[]; title: string; onBack: () => void }) => (
  <div className="space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <Timer className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-amber-400 truncate">{title}</h3>
          <p className="text-[10px] text-muted-foreground">{results.length} analyses équilibrées</p>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
    {results.map((r, i) => (
      <div key={i} className="rounded-2xl bg-card/90 border border-amber-500/25 overflow-hidden flex flex-col"
        style={{ animation: `fade-up 0.5s ease ${i * 70}ms forwards`, opacity: 0 }}>
        <CardHeader
          index={i}
          time={r.time}
          coefficient={r.coefficient}
          badgeBg="bg-gradient-to-br from-amber-500 to-orange-600"
          badgeText="text-white"
          coeffText="text-amber-300"
        />
        <div className="px-2.5 pb-2.5 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="px-1.5 py-1 rounded-md bg-secondary/50 text-center min-w-0">
              <p className="text-[8px] text-muted-foreground uppercase">Conf.</p>
              <p className="text-xs font-bold text-amber-400">{r.confidence}%</p>
            </div>
            <div className="px-1.5 py-1 rounded-md bg-secondary/50 text-center min-w-0">
              <p className="text-[8px] text-muted-foreground uppercase">Fiab.</p>
              <p className="text-xs font-bold text-amber-400">{r.reliability}%</p>
            </div>
            <div className="px-1.5 py-1 rounded-md bg-secondary/50 text-center min-w-0">
              <p className="text-[8px] text-muted-foreground uppercase">Stab.</p>
              <p className={`text-[10px] font-bold truncate ${stabilityColor(r.stability)}`}>{r.stability}</p>
            </div>
            <div className="px-1.5 py-1 rounded-md bg-secondary/50 text-center min-w-0">
              <p className="text-[8px] text-muted-foreground uppercase">Risque</p>
              <p className={`text-[10px] font-bold truncate ${riskColor(r.risk)}`}>{r.risk}</p>
            </div>
          </div>
        </div>
      </div>
    ))}
    </div>
    <Button variant="premium-outline" className="w-full h-12 mt-2 text-sm" onClick={onBack}>
      <ArrowLeft className="w-4 h-4 mr-2" /> Nouvelle analyse
    </Button>
  </div>
);

// ===== PREMIUM =====
const PremiumResult = ({ results, title, onBack }: { results: PredictionResult[]; title: string; onBack: () => void }) => (
  <div className="space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
    <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/25 glow-gold">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center shadow-lg flex-shrink-0">
          <Crown className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold gold-text truncate">{title}</h3>
          <p className="text-[10px] text-muted-foreground">{results.length} prédictions premium</p>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
    {results.map((r, i) => (
      <div key={i} className="rounded-2xl bg-card/90 border border-primary/25 overflow-hidden glow-gold backdrop-blur-sm flex flex-col"
        style={{ animation: `fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms forwards`, opacity: 0 }}>
        <CardHeader
          index={i}
          time={r.time}
          coefficient={r.coefficient}
          badgeBg="gold-gradient"
          badgeText="text-primary-foreground"
          coeffText="gold-text"
          borderClass="border-b border-border/30"
          bgClass="bg-gradient-to-r from-primary/10 to-transparent"
        />
        <div className="px-2.5 py-2 flex-1">
          <ConfidenceBar value={r.confidence} gradient="gold-gradient" label="Confiance" labelColor="gold-text" />
        </div>
        <StatFooter r={r} accent="border-border/30" accentColor="gold-text" />
      </div>
    ))}
    </div>
    <Button variant="premium-outline" className="w-full h-12 mt-2 text-sm" onClick={onBack}>
      <ArrowLeft className="w-4 h-4 mr-2" /> Nouvelle analyse
    </Button>
  </div>
);

// ===== COSMOX =====
const CosmoXResult = ({ results, title, onBack }: { results: PredictionResult[]; title: string; onBack: () => void }) => (
  <div className="space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
    <div className="p-4 rounded-2xl border border-cyan-500/25" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.1), rgba(20,184,166,0.05), transparent)" }}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0" style={{ background: "linear-gradient(135deg, #06b6d4, #14b8a6)" }}>
          <Orbit className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-cyan-400 truncate">{title}</h3>
          <p className="text-[10px] text-muted-foreground">{results.length} signaux cosmiques</p>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
    {results.map((r, i) => (
      <div key={i} className="rounded-2xl overflow-hidden border border-cyan-500/25 flex flex-col"
        style={{ animation: `fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 90}ms forwards`, opacity: 0, background: "linear-gradient(180deg, hsl(var(--card)/0.9), hsl(var(--card)/0.7), rgba(6,182,212,0.03))" }}>
        <CardHeader
          index={i}
          time={r.time}
          coefficient={r.coefficient}
          badgeBg="bg-cyan-500/15 border border-cyan-500/30"
          badgeText="text-cyan-400"
          coeffText="text-cyan-300"
        />
        <div className="px-2.5 py-2 border-t border-cyan-500/10 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3 h-3 text-cyan-400 flex-shrink-0" />
            <span className="text-[10px] text-muted-foreground">Précision</span>
            <span className="text-[10px] font-bold text-cyan-400 ml-auto">{r.confidence}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary/80 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${r.confidence}%`, background: "linear-gradient(90deg, #06b6d4, #14b8a6)" }} />
          </div>
        </div>
        <StatFooter r={r} accent="border-cyan-500/15" accentColor="text-cyan-400" />
      </div>
    ))}
    </div>
    <Button variant="premium-outline" className="w-full h-12 mt-2 text-sm" onClick={onBack}>
      <ArrowLeft className="w-4 h-4 mr-2" /> Nouvelle analyse
    </Button>
  </div>
);

// ===== JETX =====
const JetXResult = ({ results, title, onBack }: { results: PredictionResult[]; title: string; onBack: () => void }) => (
  <div className="space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
    <div className="p-4 rounded-2xl border border-orange-500/25" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(239,68,68,0.05), transparent)" }}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0" style={{ background: "linear-gradient(135deg, #f97316, #ef4444)" }}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-orange-400 truncate">{title}</h3>
          <p className="text-[10px] text-muted-foreground">{results.length} prédictions JetX</p>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
    {results.map((r, i) => (
      <div key={i} className="rounded-2xl overflow-hidden border border-orange-500/25 flex flex-col"
        style={{ animation: `fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 90}ms forwards`, opacity: 0, background: "linear-gradient(180deg, hsl(var(--card)/0.9), hsl(var(--card)/0.7), rgba(249,115,22,0.03))" }}>
        <CardHeader
          index={i}
          time={r.time}
          coefficient={r.coefficient}
          badgeBg="bg-orange-500/15 border border-orange-500/30"
          badgeText="text-orange-400"
          coeffText="text-orange-300"
        />
        <div className="px-2.5 py-2 border-t border-orange-500/10 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3 h-3 text-orange-400 flex-shrink-0" />
            <span className="text-[10px] text-muted-foreground">Précision</span>
            <span className="text-[10px] font-bold text-orange-400 ml-auto">{r.confidence}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary/80 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${r.confidence}%`, background: "linear-gradient(90deg, #f97316, #ef4444)" }} />
          </div>
        </div>
        <StatFooter r={r} accent="border-orange-500/15" accentColor="text-orange-400" />
      </div>
    ))}
    </div>
    <Button variant="premium-outline" className="w-full h-12 mt-2 text-sm" onClick={onBack}>
      <ArrowLeft className="w-4 h-4 mr-2" /> Nouvelle analyse
    </Button>
  </div>
);

const PredictionResults = ({ results, title, onBack, variant = "basic" }: PredictionResultsProps) => {
  // Single-result hero rendering for premium tiers
  if (results.length === 1 && (variant === "premium" || variant === "pro" || variant === "cosmox" || variant === "jetx" || variant === "realtime")) {
    return <HeroResult result={results[0]} title={title} onBack={onBack} theme={HERO_THEMES[variant as HeroVariant]} />;
  }
  switch (variant) {
    case "basic": return <BasicResult results={results} title={title} onBack={onBack} />;
    case "pro": return <ProResult results={results} title={title} onBack={onBack} />;
    case "realtime": return <RealtimeResult results={results} title={title} onBack={onBack} />;
    case "balanced": return <BalancedResult results={results} title={title} onBack={onBack} />;
    case "premium": return <PremiumResult results={results} title={title} onBack={onBack} />;
    case "cosmox": return <CosmoXResult results={results} title={title} onBack={onBack} />;
    case "jetx": return <JetXResult results={results} title={title} onBack={onBack} />;
    default: return <BasicResult results={results} title={title} onBack={onBack} />;
  }
};

export default PredictionResults;
