import { useMemo } from "react";
import { Activity, TrendingUp, TrendingDown, Minus, BarChart3, Target, Gauge, Sparkles } from "lucide-react";

interface AnalysisDashboardProps {
  /** Historical coefficients (most recent last). Used for stats/sparkline. */
  history: number[];
  /** Current/predicted coefficient for next-round probability gauge. */
  nextCoefficient?: number;
  /** Color tone — semantic color tokens are used for layout; tone changes the accent only. */
  tone?: "cosmox" | "jetx";
  /** Label of the game (e.g. "CosmoX"). */
  label: string;
}

const TONE = {
  cosmox: {
    accent: "from-cyan-400 via-sky-400 to-teal-400",
    text: "text-cyan-300",
    ring: "border-cyan-500/25",
    halo: "bg-cyan-500/10",
    stroke: "#22d3ee",
    fill: "url(#cosmox-grad)",
  },
  jetx: {
    accent: "from-orange-400 via-red-400 to-rose-500",
    text: "text-orange-300",
    ring: "border-orange-500/25",
    halo: "bg-orange-500/10",
    stroke: "#fb923c",
    fill: "url(#jetx-grad)",
  },
} as const;

const BUCKETS = [
  { label: "1-2×", min: 1, max: 2 },
  { label: "2-5×", min: 2, max: 5 },
  { label: "5-10×", min: 5, max: 10 },
  { label: "10×+", min: 10, max: Infinity },
];

const computeStats = (h: number[]) => {
  if (!h.length) {
    return { avg: 0, win: 0, trend: 0, reliability: 0, distribution: BUCKETS.map(() => 0) };
  }
  const avg = h.reduce((a, b) => a + b, 0) / h.length;
  const win = (h.filter((v) => v >= 1.5).length / h.length) * 100;
  const recent = h.slice(-10);
  const earlier = h.slice(-20, -10);
  const rAvg = recent.reduce((a, b) => a + b, 0) / Math.max(1, recent.length);
  const eAvg = earlier.length ? earlier.reduce((a, b) => a + b, 0) / earlier.length : rAvg;
  const trend = eAvg === 0 ? 0 : ((rAvg - eAvg) / eAvg) * 100;
  const variance = h.reduce((acc, v) => acc + (v - avg) ** 2, 0) / h.length;
  const stdev = Math.sqrt(variance);
  const reliability = Math.max(35, Math.min(95, 95 - stdev * 8));
  const distribution = BUCKETS.map(
    (b) => (h.filter((v) => v >= b.min && v < b.max).length / h.length) * 100,
  );
  return { avg, win, trend, reliability, distribution };
};

const Sparkline = ({ data, stroke, fill }: { data: number[]; stroke: string; fill: string }) => {
  if (data.length < 2) {
    return <div className="h-14 flex items-center justify-center text-[10px] text-muted-foreground">Pas assez de données</div>;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 200;
  const h = 56;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  const area = `0,${h} ${points} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-14">
      <defs>
        <linearGradient id="cosmox-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="jetx-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const ProbabilityGauge = ({ value, tone }: { value: number; tone: "cosmox" | "jetx" }) => {
  const r = 36;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const stroke = TONE[tone].stroke;
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} stroke="hsl(var(--border))" strokeWidth="6" fill="none" opacity="0.4" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={stroke}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-black ${TONE[tone].text}`}>{Math.round(value)}%</span>
        <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">Prob.</span>
      </div>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone: "cosmox" | "jetx";
}) => (
  <div className={`p-3 rounded-2xl bg-card/60 backdrop-blur-xl border ${TONE[tone].ring} flex flex-col gap-1`}>
    <div className="flex items-center justify-between">
      <Icon className={`w-3.5 h-3.5 ${TONE[tone].text}`} />
      {sub}
    </div>
    <p className={`text-xl font-black font-mono tabular-nums bg-gradient-to-br ${TONE[tone].accent} bg-clip-text text-transparent leading-tight`}>
      {value}
    </p>
    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
  </div>
);

const AnalysisDashboard = ({ history, nextCoefficient, tone = "cosmox", label }: AnalysisDashboardProps) => {
  const { avg, win, trend, reliability, distribution } = useMemo(() => computeStats(history), [history]);
  const t = TONE[tone];

  // Real-time probability for next coefficient (based on history distribution + next target)
  const nextProb = useMemo(() => {
    if (!nextCoefficient || !history.length) return Math.round(reliability);
    const tolerance = nextCoefficient * 0.25;
    const close = history.filter((v) => Math.abs(v - nextCoefficient) <= tolerance).length;
    const base = (close / history.length) * 100;
    return Math.max(20, Math.min(95, Math.round(base * 1.4 + reliability * 0.3)));
  }, [nextCoefficient, history, reliability]);

  const TrendIcon = trend > 1 ? TrendingUp : trend < -1 ? TrendingDown : Minus;
  const trendTone = trend > 1 ? "text-emerald-400" : trend < -1 ? "text-rose-400" : "text-muted-foreground";

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border ${t.ring} bg-card/40 backdrop-blur-2xl p-4 space-y-4 animate-fade-in`}
      aria-label={`Dashboard d'analyse ${label}`}
    >
      <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${t.halo}`} />

      {/* Header */}
      <header className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-xl ${t.halo} border ${t.ring} flex items-center justify-center flex-shrink-0`}>
            <BarChart3 className={`w-4 h-4 ${t.text}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black truncate">Analyse {label}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Temps réel · {history.length} échantillons
            </p>
          </div>
        </div>
        <div className={`text-[9px] px-2 py-1 rounded-full border font-bold uppercase tracking-wider ${t.ring} ${t.halo} ${t.text}`}>
          LIVE
        </div>
      </header>

      {/* Stats grid */}
      <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <StatCard
          tone={tone}
          icon={Target}
          label="Probabilité gain"
          value={`${Math.round(win)}%`}
        />
        <StatCard
          tone={tone}
          icon={Activity}
          label="Coeff. moyen"
          value={`${avg.toFixed(2)}×`}
        />
        <StatCard
          tone={tone}
          icon={TrendIcon}
          label="Tendance"
          value={`${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`}
          sub={<TrendIcon className={`w-3.5 h-3.5 ${trendTone}`} />}
        />
        <StatCard
          tone={tone}
          icon={Gauge}
          label="Fiabilité"
          value={`${Math.round(reliability)}%`}
        />
      </div>

      {/* Sparkline + Gauge */}
      <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center p-3 rounded-2xl bg-background/40 border border-border/30">
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Évolution récente
            </span>
            <span className={`text-[10px] font-bold ${t.text}`}>{history.length} pts</span>
          </div>
          <Sparkline data={history.slice(-50)} stroke={t.stroke} fill={t.fill} />
        </div>
        <div className="flex flex-col items-center gap-1 md:border-l md:border-border/30 md:pl-4">
          <ProbabilityGauge value={nextProb} tone={tone} />
          <span className="text-[10px] text-muted-foreground text-center">
            {nextCoefficient ? `Cible ${nextCoefficient.toFixed(2)}×` : "Prochaine"}
          </span>
        </div>
      </div>

      {/* Distribution */}
      <div className="relative p-3 rounded-2xl bg-background/40 border border-border/30 space-y-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Distribution des coefficients
        </span>
        <div className="space-y-1.5">
          {BUCKETS.map((b, i) => (
            <div key={b.label} className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-muted-foreground w-12 flex-shrink-0">{b.label}</span>
              <div className="flex-1 h-2 rounded-full bg-secondary/60 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${t.accent} transition-all duration-700`}
                  style={{ width: `${Math.max(2, distribution[i])}%` }}
                />
              </div>
              <span className={`text-[10px] font-black tabular-nums w-10 text-right ${t.text}`}>
                {Math.round(distribution[i])}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AnalysisDashboard;
