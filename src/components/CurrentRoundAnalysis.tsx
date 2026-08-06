import React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  ImageIcon,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Flame,
  Activity,
  Target,
  Sparkles,
  Rocket,
  X,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type GameKey = "aviator-premium" | "cosmox" | "jetx" | "infinie";

interface Theme {
  name: string;
  gradient: string;
  border: string;
  chip: string;
  accent: string;
  icon: React.ReactNode;
  ring: string;
}

const THEMES: Record<GameKey, Theme> = {
  "aviator-premium": {
    name: "Aviator",
    gradient: "from-amber-500/25 via-yellow-500/10 to-transparent",
    border: "border-amber-500/30",
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    accent: "text-amber-300",
    ring: "ring-amber-500/40",
    icon: <Rocket className="w-4 h-4" />,
  },
  cosmox: {
    name: "CosmoX",
    gradient: "from-violet-500/25 via-fuchsia-500/10 to-transparent",
    border: "border-violet-500/30",
    chip: "bg-violet-500/15 text-violet-200 border-violet-500/30",
    accent: "text-violet-300",
    ring: "ring-violet-500/40",
    icon: <Sparkles className="w-4 h-4" />,
  },
  jetx: {
    name: "JetX",
    gradient: "from-orange-500/25 via-red-500/10 to-transparent",
    border: "border-orange-500/30",
    chip: "bg-orange-500/15 text-orange-200 border-orange-500/30",
    accent: "text-orange-300",
    ring: "ring-orange-500/40",
    icon: <Rocket className="w-4 h-4" />,
  },
  infinie: {
    name: "Infinie Mode",
    gradient: "from-emerald-500/25 via-teal-500/10 to-transparent",
    border: "border-emerald-500/30",
    chip: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
    accent: "text-emerald-300",
    ring: "ring-emerald-500/40",
    icon: <Activity className="w-4 h-4" />,
  },
};

interface AnalysisReport {
  favorable: boolean;
  favorableScore: number;
  under2: number;
  between2and5: number;
  between5and50: number;
  above50: number;
  stability: "Haute" | "Moyenne" | "Basse";
  risk: "Faible" | "Modéré" | "Élevé";
  trend: "Haussière" | "Baissière" | "Stable";
  mean: number;
  median: number;
  max: number;
  min: number;
  volatility: number;
  hotStreak: number;
  coldStreak: number;
  summary: string;
  insights: string[];
}

// Different weights per game so each module feels independent
const GAME_WEIGHTS: Record<GameKey, { low: number; mid: number; high: number; extreme: number; favBias: number }> = {
  "aviator-premium": { low: 1.0, mid: 1.15, high: 1.0, extreme: 0.9, favBias: 0.02 },
  cosmox: { low: 0.95, mid: 1.05, high: 1.15, extreme: 1.05, favBias: 0.05 },
  jetx: { low: 0.9, mid: 1.1, high: 1.2, extreme: 1.1, favBias: 0.08 },
  infinie: { low: 1.1, mid: 1.05, high: 0.95, extreme: 0.85, favBias: -0.03 },
};

function analyze(multipliers: number[], game: GameKey): AnalysisReport {
  const n = multipliers.length;
  const w = GAME_WEIGHTS[game];

  const sorted = [...multipliers].sort((a, b) => a - b);
  const mean = multipliers.reduce((a, b) => a + b, 0) / n;
  const median = sorted[Math.floor(n / 2)];
  const max = sorted[sorted.length - 1];
  const min = sorted[0];
  const variance = multipliers.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const volatility = Math.sqrt(variance);

  const under2Count = multipliers.filter((v) => v < 2).length;
  const mid = multipliers.filter((v) => v >= 2 && v < 5).length;
  const high = multipliers.filter((v) => v >= 5 && v < 50).length;
  const extreme = multipliers.filter((v) => v >= 50).length;

  const under2 = Math.min(0.98, (under2Count / n) * w.low);
  const between2and5 = Math.min(0.98, (mid / n) * w.mid);
  const between5and50 = Math.min(0.98, (high / n) * w.high);
  const above50 = Math.min(0.4, ((extreme + 0.15) / n) * w.extreme);

  // Trend on last 6 vs previous 6
  const recent = multipliers.slice(0, Math.min(6, n));
  const older = multipliers.slice(Math.min(6, n), Math.min(12, n));
  const avgRecent = recent.reduce((a, b) => a + b, 0) / (recent.length || 1);
  const avgOlder = older.length ? older.reduce((a, b) => a + b, 0) / older.length : avgRecent;
  const diff = avgRecent - avgOlder;
  const trend: AnalysisReport["trend"] =
    Math.abs(diff) < 0.4 ? "Stable" : diff > 0 ? "Haussière" : "Baissière";

  // Hot / cold streaks
  let hot = 0, cold = 0, curHot = 0, curCold = 0;
  for (const v of multipliers) {
    if (v >= 2) { curHot++; curCold = 0; hot = Math.max(hot, curHot); }
    else { curCold++; curHot = 0; cold = Math.max(cold, curCold); }
  }

  const stability: AnalysisReport["stability"] =
    volatility < 3 ? "Haute" : volatility < 8 ? "Moyenne" : "Basse";
  const risk: AnalysisReport["risk"] =
    volatility < 3 && under2 > 0.5 ? "Faible" :
    volatility < 8 ? "Modéré" : "Élevé";

  // Favorable score: recent trend up, decent mid/high, low volatility relative to game
  const favorableScore = Math.max(
    0,
    Math.min(
      1,
      0.35 + (trend === "Haussière" ? 0.15 : trend === "Baissière" ? -0.15 : 0) +
        (between2and5 - 0.4) * 0.3 +
        (between5and50 - 0.15) * 0.4 +
        (under2 > 0.7 ? -0.2 : 0) +
        w.favBias,
    ),
  );
  const favorable = favorableScore >= 0.5;

  const insights: string[] = [];
  insights.push(
    `Sur ${n} tours détectés, la moyenne s'établit à ${mean.toFixed(2)} (médiane ${median.toFixed(2)}).`,
  );
  insights.push(
    `Volatilité observée: ${volatility.toFixed(2)} — stabilité ${stability.toLowerCase()}, risque ${risk.toLowerCase()}.`,
  );
  insights.push(
    `Tendance récente ${trend.toLowerCase()} (${diff >= 0 ? "+" : ""}${diff.toFixed(2)} sur la fenêtre glissante).`,
  );
  insights.push(
    `Série de multiplicateurs ≥ 2 la plus longue: ${hot} tours. Série < 2 la plus longue: ${cold} tours.`,
  );
  if (extreme > 0) insights.push(`${extreme} tour(s) au-dessus de 50 détecté(s) — volatilité extrême confirmée.`);
  if (max > 20) insights.push(`Pic historique visible: ${max.toFixed(2)} — présence de multiplicateurs élevés.`);
  if (under2 > 0.6) insights.push(`Forte concentration de tours inférieurs à 2 (${(under2 * 100).toFixed(0)}%).`);

  const summary = favorable
    ? `Configuration actuellement ${favorableScore >= 0.65 ? "nettement " : ""}favorable pour ${THEMES[game].name}. Fenêtre statistique porteuse: tendance ${trend.toLowerCase()}, ${(between2and5 * 100).toFixed(0)}% de tours entre 2 et 5, risque ${risk.toLowerCase()}.`
    : `Configuration actuellement défavorable. Concentration de faibles multiplicateurs (${(under2 * 100).toFixed(0)}% < 2), tendance ${trend.toLowerCase()}, risque ${risk.toLowerCase()}. Prudence recommandée.`;

  return {
    favorable,
    favorableScore,
    under2,
    between2and5,
    between5and50,
    above50,
    stability,
    risk,
    trend,
    mean,
    median,
    max,
    min,
    volatility,
    hotStreak: hot,
    coldStreak: cold,
    summary,
    insights,
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
    reader.readAsDataURL(file);
  });
}

const CurrentRoundAnalysis = ({ game }: { game: GameKey }) => {
  const theme = THEMES[game];
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [multipliers, setMultipliers] = useState<number[] | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);

  const report = useMemo(
    () => (multipliers && multipliers.length >= 3 ? analyze(multipliers, game) : null),
    [multipliers, game],
  );

  const validityWindow = useMemo(() => {
    if (!report || !analyzedAt) return null;
    // Duration of the favorable window: high stability => longer window (max ~20 min)
    const volatilityFactor = Math.min(1, report.volatility / 15);
    const durationMin = Math.round(6 + (1 - volatilityFactor) * 14); // 6..20 min
    const durationSec = durationMin * 60 + ((report.hotStreak * 7) % 60);

    // Delay before the round should turn favorable (only when currently unfavorable)
    const rawDelay = 3 + (1 - report.favorableScore) * 12 + report.coldStreak * 0.5;
    const delayMin = report.favorable ? 0 : Math.min(20, Math.max(2, Math.round(rawDelay)));
    const delaySec = delayMin * 60 + ((report.coldStreak * 11) % 60);

    const start = new Date(analyzedAt.getTime() + delaySec * 1000);
    const end = new Date(start.getTime() + durationSec * 1000);
    return { start, end };
  }, [report, analyzedAt]);

  const runAnalysis = useCallback(async (file: File) => {
    setError(null);
    setMultipliers(null);
    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      const { data, error: fnError } = await supabase.functions.invoke("extract-multipliers", {
        body: { imageBase64: dataUrl, game },
      });
      if (fnError) throw new Error(fnError.message || "Analyse indisponible pour le moment.");
      const res = data as { valid: boolean; multipliers: number[]; reason: string };
      if (!res?.valid || !Array.isArray(res.multipliers) || res.multipliers.length < 3) {
        setError(
          res?.reason ||
            "Image invalide pour l'analyse : aucun historique de multiplicateurs détecté.",
        );
        return;
      }
      setMultipliers(res.multipliers);
      setAnalyzedAt(new Date());
    } catch (e) {
      setError((e as Error).message || "Erreur pendant l'analyse.");
    } finally {
      setLoading(false);
    }
  }, [game]);

  const reset = () => {
    setPreview(null);
    setMultipliers(null);
    setError(null);
    setAnalyzedAt(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {/* HEADER — Analyse du tour actuel */}
      <div
        className={`relative overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.gradient} backdrop-blur-xl p-4 shadow-lg`}
        style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${theme.chip}`}>
            {theme.icon} {theme.name}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Moteur d'analyse dédié
          </span>
        </div>
        <h2 className="text-base font-bold flex items-center gap-2">
          <Target className={`w-4 h-4 ${theme.accent}`} />
          Analyse du tour actuel
        </h2>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
          Envoyez une capture d'écran contenant uniquement l'historique des multiplicateurs.
          L'analyse démarre uniquement si des coefficients (ex. 1.42, 2.09, 5.53) sont détectés.
        </p>

        <div className="mt-3 flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) runAnalysis(f);
            }}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className={`h-11 flex-1 font-bold text-sm bg-gradient-to-r ${game === "aviator-premium" ? "from-amber-500 to-yellow-600" : game === "cosmox" ? "from-violet-500 to-fuchsia-500" : game === "jetx" ? "from-orange-500 to-red-500" : "from-emerald-500 to-teal-500"} text-white hover:opacity-90 shadow-lg`}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyse en cours…</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Analyser une capture</>
            )}
          </Button>
          {(preview || report || error) && !loading && (
            <Button variant="outline" onClick={reset} className="h-11 px-3">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PREVIEW */}
      {preview && (
        <div className={`rounded-2xl border ${theme.border} bg-card/60 backdrop-blur-xl p-3`}>
          <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <ImageIcon className="w-3.5 h-3.5" /> Capture analysée
          </div>
          <img src={preview} alt="Capture" className="w-full max-h-52 object-contain rounded-xl border border-border/40" />
        </div>
      )}

      {/* ERROR */}
      {error && !loading && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 backdrop-blur-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-bold text-destructive text-sm">Image invalide pour l'analyse</p>
              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{error}</p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Envoyez une capture montrant clairement l'historique des multiplicateurs (ex. 1.42, 2.09, 5.53, 18.70).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* REPORT */}
      {report && multipliers && (
        <>
          {/* Detected history — displayed FIRST under the game title */}
          <div className={`rounded-2xl border ${theme.border} bg-card/60 backdrop-blur-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${theme.chip}`}>
                {theme.icon} {theme.name}
              </span>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Historique des coefficients ({multipliers.length})
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {multipliers.map((m, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold border ${
                    m < 2
                      ? "bg-red-500/10 text-red-300 border-red-500/30"
                      : m < 5
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : m < 50
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30"
                  }`}
                >
                  {m.toFixed(2)}
                </span>
              ))}
            </div>
          </div>

          {/* Verdict card */}
          <div
            className={`rounded-2xl border ${theme.border} backdrop-blur-xl p-4 shadow-lg ${
              report.favorable ? "bg-emerald-500/10" : "bg-red-500/10"
            }`}
            style={{ animation: "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {report.favorable ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                )}
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${report.favorable ? "text-emerald-400" : "text-red-400"}`}>
                    Verdict du tour actuel
                  </p>
                  <p className="text-base font-bold">
                    {report.favorable ? "Tour actuellement favorable" : "Tour actuellement défavorable"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">Score</p>
                <p className={`text-lg font-black ${report.favorable ? "text-emerald-300" : "text-red-300"}`}>
                  {(report.favorableScore * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Prediction window */}
          {analyzedAt && validityWindow && (
            <div
              className={`rounded-2xl border ${theme.border} bg-card/60 backdrop-blur-xl p-4 space-y-2`}
              style={{ animation: "fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
            >
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${theme.accent}`} />
                <h3 className="text-sm font-bold">Prédiction temporelle</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <StatRow
                  k="Analyse effectuée à"
                  v={analyzedAt.toLocaleTimeString("fr-FR", { hour12: false })}
                />
                <StatRow
                  k="État détecté"
                  v={report.favorable ? "Bon" : "Mauvais"}
                />
              </div>
              <p className="text-[12px] text-foreground/90 leading-relaxed">
                {report.favorable ? (
                  <>
                    Le tour est actuellement <span className="font-bold text-emerald-300">favorable</span> et devrait le
                    rester jusqu'à{" "}
                    <span className="font-mono font-bold">
                      {validityWindow.end.toLocaleTimeString("fr-FR", { hour12: false })}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Le tour devrait devenir favorable à partir de{" "}
                    <span className="font-mono font-bold text-emerald-300">
                      {validityWindow.start.toLocaleTimeString("fr-FR", { hour12: false })}
                    </span>{" "}
                    et rester favorable jusqu'à{" "}
                    <span className="font-mono font-bold text-emerald-300">
                      {validityWindow.end.toLocaleTimeString("fr-FR", { hour12: false })}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>
          )}

          {/* Probability grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Série < 2.00"
              value={`${(report.under2 * 100).toFixed(0)}%`}
              hint="Probabilité"
              tone={report.under2 > 0.5 ? "danger" : "neutral"}
              icon={<TrendingDown className="w-3.5 h-3.5" />}
              theme={theme}
            />
            <StatCard
              label="Entre 2.00 et 5.00"
              value={`${(report.between2and5 * 100).toFixed(0)}%`}
              hint="Probabilité dominante"
              tone={report.between2and5 > 0.35 ? "good" : "neutral"}
              icon={<Activity className="w-3.5 h-3.5" />}
              theme={theme}
            />
            <StatCard
              label="Entre 5.00 et 50.00"
              value={`${(report.between5and50 * 100).toFixed(0)}%`}
              hint="Probabilité"
              tone={report.between5and50 > 0.2 ? "good" : "neutral"}
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              theme={theme}
            />
            <StatCard
              label="Supérieur à 50.00"
              value={`${(report.above50 * 100).toFixed(1)}%`}
              hint="Possibilité"
              tone={report.above50 > 0.08 ? "warn" : "neutral"}
              icon={<Flame className="w-3.5 h-3.5" />}
              theme={theme}
            />
          </div>

          {/* Stability / risk / trend */}
          <div className="grid grid-cols-3 gap-3">
            <MiniCard label="Stabilité" value={report.stability} theme={theme} />
            <MiniCard label="Risque" value={report.risk} theme={theme} />
            <MiniCard label="Tendance" value={report.trend} theme={theme} />
          </div>

          {/* Info section */}
          <div className={`rounded-2xl border ${theme.border} bg-card/60 backdrop-blur-xl p-4 space-y-3`}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${theme.chip} border flex items-center justify-center`}>
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold">Informations d'analyse</h3>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{report.summary}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <StatRow k="Moyenne" v={`${report.mean.toFixed(2)}`} />
              <StatRow k="Médiane" v={`${report.median.toFixed(2)}`} />
              <StatRow k="Pic max." v={`${report.max.toFixed(2)}`} />
              <StatRow k="Min. observé" v={`${report.min.toFixed(2)}`} />
              <StatRow k="Volatilité" v={report.volatility.toFixed(2)} />
              <StatRow k="Série ≥ 2 max" v={`${report.hotStreak}`} />
              <StatRow k="Série < 2 max" v={`${report.coldStreak}`} />
              <StatRow k="Tours détectés" v={`${multipliers.length}`} />
            </div>
            <ul className="space-y-1.5 pt-2 border-t border-border/40">
              {report.insights.map((line, i) => (
                <li key={i} className="text-[12px] text-foreground/90 flex gap-2">
                  <span className={`mt-1 w-1.5 h-1.5 rounded-full ${theme.accent.replace("text-", "bg-")}`} />
                  <span className="flex-1">{line}</span>
                </li>
              ))}
            </ul>
          </div>


          <p className="text-[10px] text-muted-foreground/80 text-center leading-relaxed px-2">
            Cette analyse statistique ne prédit pas les tours futurs. Les jeux de type crash reposent sur un
            générateur aléatoire ; une capture d'historique ne permet pas de prédire les résultats à venir de manière fiable.
          </p>
        </>
      )}
    </div>
  );
};

const StatCard = ({
  label,
  value,
  hint,
  tone,
  icon,
  theme,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "good" | "warn" | "danger" | "neutral";
  icon: React.ReactNode;
  theme: Theme;
}) => {
  const toneClass =
    tone === "good"
      ? "text-emerald-300"
      : tone === "warn"
      ? "text-amber-300"
      : tone === "danger"
      ? "text-red-300"
      : theme.accent;
  return (
    <div className={`rounded-xl border ${theme.border} bg-card/60 backdrop-blur-xl p-3`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {hint}
      </div>
      <p className={`text-lg font-black mt-1 ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-foreground/80 mt-0.5">{label}</p>
    </div>
  );
};

const MiniCard = ({ label, value, theme }: { label: string; value: string; theme: Theme }) => (
  <div className={`rounded-xl border ${theme.border} bg-card/60 backdrop-blur-xl p-3 text-center`}>
    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`text-sm font-bold mt-1 ${theme.accent}`}>{value}</p>
  </div>
);

const StatRow = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-2 bg-secondary/30 rounded-md px-2 py-1">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-mono font-semibold">{v}</span>
  </div>
);

export default CurrentRoundAnalysis;
