export type SupportedGame = "aviator" | "cosmox" | "jetx";

export interface AnalysisInput {
  game: SupportedGame;
  time: string;
  coefficient: number;
  history: number[];
}

export interface AnalysisResult {
  game: SupportedGame;
  sampleSize: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  volatility: number;
  lowRate: number;
  midRate: number;
  highRate: number;
  trend: "Haussière" | "Stable" | "Baissière";
  streakLow: number;
  streakHigh: number;
  zone: "Basse" | "Intermédiaire" | "Haute";
  risk: "Faible" | "Modéré" | "Élevé";
  score: number;
  quality: "Bonne" | "Moyenne" | "Limitée";
  nextWindow: string;
  note: string;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function parseHistory(value: string): number[] {
  return value
    .split(/[\s,;|]+/)
    .map((v) => Number(v.replace(",", ".").replace(/x$/i, "")))
    .filter((v) => Number.isFinite(v) && v >= 1 && v <= 10000)
    .slice(-60);
}

export function analyseRound(input: AnalysisInput): AnalysisResult {
  const values = [...input.history, input.coefficient].filter((v) => Number.isFinite(v) && v >= 1);
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const volatility = Math.sqrt(variance);
  const lowRate = values.filter((v) => v < 2).length / n;
  const midRate = values.filter((v) => v >= 2 && v < 5).length / n;
  const highRate = values.filter((v) => v >= 5).length / n;

  const recent = values.slice(-6);
  const previous = values.slice(-12, -6);
  const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const previousMean = previous.length ? previous.reduce((a, b) => a + b, 0) / previous.length : recentMean;
  const delta = recentMean - previousMean;
  const trend: AnalysisResult["trend"] = Math.abs(delta) < 0.35 ? "Stable" : delta > 0 ? "Haussière" : "Baissière";

  const streak = (predicate: (v: number) => boolean) => {
    let count = 0;
    for (let i = values.length - 1; i >= 0 && predicate(values[i]); i--) count++;
    return count;
  };
  const streakLow = streak((v) => v < 2);
  const streakHigh = streak((v) => v >= 5);

  const zone: AnalysisResult["zone"] = input.coefficient < 2 ? "Basse" : input.coefficient < 5 ? "Intermédiaire" : "Haute";
  const risk: AnalysisResult["risk"] = volatility >= 6 || lowRate >= 0.65 ? "Élevé" : volatility >= 3.5 || lowRate >= 0.45 ? "Modéré" : "Faible";

  // Score d'analyse statistique, jamais présenté comme une probabilité de gain.
  const score = Math.round(clamp(
    50 + (midRate - 0.45) * 35 + (highRate - 0.12) * 25 + (trend === "Haussière" ? 8 : trend === "Baissière" ? -8 : 0) - (risk === "Élevé" ? 12 : risk === "Modéré" ? 4 : 0),
    1,
    99,
  ));

  const quality: AnalysisResult["quality"] = n >= 20 ? "Bonne" : n >= 8 ? "Moyenne" : "Limitée";
  const minutes = input.game === "aviator" ? 3 : input.game === "cosmox" ? 2 : 2;
  const [h, m] = input.time.split(":").map(Number);
  const base = Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0;
  const end = (base + minutes) % (24 * 60);
  const nextWindow = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;

  return {
    game: input.game, sampleSize: n, mean, median, min: sorted[0], max: sorted[n - 1], volatility,
    lowRate, midRate, highRate, trend, streakLow, streakHigh, zone, risk, score, quality, nextWindow,
    note: "Analyse statistique des données saisies. Le prochain coefficient réel dépend du moteur du jeu et ne peut pas être déduit avec certitude de l'historique.",
  };
}
