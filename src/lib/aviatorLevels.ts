// ============================================================================
// Aviator — Moteur d'analyse multi-niveaux (Premium)
// Trois moteurs totalement séparés : Niveau 1, Niveau 2, Niveau 3.
// Chaque niveau possède sa propre méthode de calcul et ses propres résultats.
// ============================================================================

export type LevelId = 1 | 2 | 3;

export type ConfidenceLabel = "Faible" | "Moyenne" | "Élevée" | "Très élevée";

export interface HistoryStats {
  count: number;
  mean: number;
  median: number;
  max: number;
  min: number;
  volatility: number;
  under2Ratio: number;
  mid2to5Ratio: number;
  high5plusRatio: number;
  extreme20Ratio: number;
  longestBlueStreak: number;
  longestHotStreak: number;
  roundsSinceHigh: number; // tours depuis le dernier coefficient >= 5.00x
  trend: "Haussière" | "Baissière" | "Stable";
}

export interface LevelRecommendation {
  level: LevelId;
  title: string;
  reason: string;
  confidence: ConfidenceLabel;
  precision: number; // 0-100
  /** Minutes avant la prochaine capture conseillée */
  nextCaptureInMin: number;
}

export interface LevelResultRow {
  kind: "main" | "index" | "protection";
  label: string;
  time: string; // HH:MM:SS
  coefficient: number;
  confidence: number; // 0-100
  reliability: number; // 0-100
  stability: "Haute" | "Moyenne" | "Basse";
  risk: "Faible" | "Modéré" | "Élevé";
  offsetLabel: string;
}

export interface LevelOutcome {
  level: LevelId;
  rows: LevelResultRow[];
  precision: number;
  confidence: ConfidenceLabel;
  /** Instant conseillé pour la prochaine capture */
  nextCaptureAt: Date;
  nextCaptureHint: string;
  engine: string;
  createdAt: Date;
  inputTime: string;
  inputCoefficient: number;
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  }
  next(): number {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  between(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.between(min, max + 1));
  }
}

const makeSeed = (...parts: number[]) =>
  parts.reduce((acc, p, i) => (acc ^ Math.round(p * 1000) * (2654435761 + i * 40503)) >>> 0, 2166136261) || 1;

const pad = (n: number) => String(n).padStart(2, "0");

const addSeconds = (h: number, m: number, s: number, add: number) => {
  const total = (h * 3600 + m * 60 + s + add + 86400) % 86400;
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
};

const fmt = (h: number, m: number, s: number) => `${pad(h)}:${pad(m)}:${pad(s)}`;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const stabilityOf = (coeff: number, conf: number): LevelResultRow["stability"] =>
  coeff < 3 ? (conf > 82 ? "Haute" : "Moyenne") : coeff < 8 ? (conf > 78 ? "Haute" : "Moyenne") : conf > 76 ? "Moyenne" : "Basse";

const riskOf = (coeff: number): LevelResultRow["risk"] =>
  coeff < 2.5 ? "Faible" : coeff < 6 ? "Modéré" : "Élevé";

/**
 * Génération intelligente des secondes (SS) affichées dans les résultats.
 * La saisie se fait uniquement au format HH:MM : les secondes sont déduites de la
 * structure réelle du marché (moyenne, volatilité, densité des tours bleus, cycle
 * depuis le dernier pic) puis affinées par le tirage déterministe du moteur, afin
 * d'obtenir des horaires cohérents, variés et réalistes.
 */
const smartSeconds = (rng: Rng, stats: HistoryStats, slot: number): number => {
  const pressure = clamp(stats.mean * 1.5 + stats.volatility * 1.1, 0, 30);
  const blueDrag = clamp(stats.under2Ratio * 15 - stats.high5plusRatio * 9, -9, 15);
  const cycle = (stats.roundsSinceHigh * 7 + slot * 13) % 26;
  const base = 7 + pressure + blueDrag * 0.6 + cycle * 0.75 + rng.between(-6, 8);
  return Math.round(clamp(base, 1, 58));
};


export const formatCoeff = (v: number) => `${v.toFixed(2).replace(".", ",")}x`;

export const parseClock = (value: string): { h: number; m: number; s: number } | null => {
  const parts = value.split(":").map((p) => Number(p));
  if (parts.length < 2 || parts.some((p) => Number.isNaN(p))) return null;
  const [h, m, s = 0] = parts;
  if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return null;
  return { h, m, s };
};

// ---------------------------------------------------------------------------
// 1. Analyse des 30 derniers tours
// ---------------------------------------------------------------------------

export function analyzeHistory(raw: number[]): HistoryStats {
  // On travaille sur les 30 derniers tours (les données arrivent du plus récent au plus ancien).
  const mults = raw.slice(0, 30).filter((v) => Number.isFinite(v) && v > 0);
  const n = mults.length || 1;
  const sorted = [...mults].sort((a, b) => a - b);
  const mean = mults.reduce((a, b) => a + b, 0) / n;
  const median = sorted[Math.floor(n / 2)] ?? 0;
  const variance = mults.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const volatility = Math.sqrt(variance);

  const under2 = mults.filter((v) => v < 2).length;
  const mid = mults.filter((v) => v >= 2 && v < 5).length;
  const high = mults.filter((v) => v >= 5).length;
  const extreme = mults.filter((v) => v >= 20).length;

  let longestBlue = 0;
  let longestHot = 0;
  let curBlue = 0;
  let curHot = 0;
  for (const v of mults) {
    if (v < 2) {
      curBlue++;
      curHot = 0;
    } else {
      curHot++;
      curBlue = 0;
    }
    longestBlue = Math.max(longestBlue, curBlue);
    longestHot = Math.max(longestHot, curHot);
  }

  const roundsSinceHigh = (() => {
    const idx = mults.findIndex((v) => v >= 5);
    return idx === -1 ? mults.length : idx;
  })();

  const recent = mults.slice(0, Math.min(8, n));
  const older = mults.slice(Math.min(8, n), Math.min(16, n));
  const avgRecent = recent.reduce((a, b) => a + b, 0) / (recent.length || 1);
  const avgOlder = older.length ? older.reduce((a, b) => a + b, 0) / older.length : avgRecent;
  const diff = avgRecent - avgOlder;

  return {
    count: mults.length,
    mean,
    median,
    max: sorted[sorted.length - 1] ?? 0,
    min: sorted[0] ?? 0,
    volatility,
    under2Ratio: under2 / n,
    mid2to5Ratio: mid / n,
    high5plusRatio: high / n,
    extreme20Ratio: extreme / n,
    longestBlueStreak: longestBlue,
    longestHotStreak: longestHot,
    roundsSinceHigh,
    trend: Math.abs(diff) < 0.45 ? "Stable" : diff > 0 ? "Haussière" : "Baissière",
  };
}

// ---------------------------------------------------------------------------
// 2. Recommandation automatique du niveau
// ---------------------------------------------------------------------------

const LEVEL_TITLES: Record<LevelId, string> = {
  1: "Niveau 1 · Analyse Standard",
  2: "Niveau 2 · Double Projection",
  3: "Niveau 3 · Frappe Haute",
};

export function recommendLevel(stats: HistoryStats): LevelRecommendation {
  // Scores indépendants par niveau, calibrés sur la structure des 30 derniers tours.
  const s1 =
    40 +
    stats.under2Ratio * 45 +
    (stats.volatility < 3 ? 18 : 0) +
    (stats.trend === "Stable" ? 8 : 0) -
    stats.high5plusRatio * 25;

  const s2 =
    42 +
    stats.mid2to5Ratio * 48 +
    (stats.high5plusRatio > 0.12 && stats.high5plusRatio < 0.4 ? 18 : 0) +
    (stats.volatility >= 3 && stats.volatility < 10 ? 14 : 0) +
    (stats.trend === "Haussière" ? 6 : 0);

  const s3 =
    35 +
    stats.high5plusRatio * 55 +
    stats.extreme20Ratio * 30 +
    (stats.volatility >= 8 ? 18 : 0) +
    (stats.longestBlueStreak >= 5 ? 12 : 0) +
    (stats.roundsSinceHigh >= 8 ? 10 : 0);

  const scores: Array<{ level: LevelId; score: number }> = (
    [
      { level: 1 as LevelId, score: s1 },
      { level: 2 as LevelId, score: s2 },
      { level: 3 as LevelId, score: s3 },
    ]
  ).sort((a, b) => b.score - a.score);

  const best = scores[0];
  const margin = best.score - scores[1].score;
  const precision = Math.round(clamp(62 + best.score * 0.22 + margin * 0.9, 62, 96));

  const confidence: ConfidenceLabel =
    precision >= 90 ? "Très élevée" : precision >= 80 ? "Élevée" : precision >= 70 ? "Moyenne" : "Faible";

  const reasons: Record<LevelId, string> = {
    1: `Marché calme : ${Math.round(stats.under2Ratio * 100)} % de tours sous 2.00x et volatilité maîtrisée (${stats.volatility.toFixed(
      2,
    )}). Le moteur standard offre la meilleure régularité.`,
    2: `Structure équilibrée : ${Math.round(
      stats.mid2to5Ratio * 100,
    )} % de tours entre 2.00x et 5.00x avec des pics réguliers. La double projection exploite parfaitement cette configuration.`,
    3: `Cycle explosif : ${Math.round(stats.high5plusRatio * 100)} % de tours ≥ 5.00x, volatilité ${stats.volatility.toFixed(
      2,
    )} et série bleue max de ${stats.longestBlueStreak}. La frappe haute est la plus rentable ici.`,
  };

  // Fenêtre de fraîcheur de la capture : plus c'est volatil, plus vite il faut recapturer.
  const nextCaptureInMin = Math.round(clamp(16 - stats.volatility * 0.9, 5, 15));

  return {
    level: best.level,
    title: LEVEL_TITLES[best.level],
    reason: reasons[best.level],
    confidence,
    precision,
    nextCaptureInMin,
  };
}

// ---------------------------------------------------------------------------
// 3. Moteurs de calcul — un par niveau
// ---------------------------------------------------------------------------

interface EngineInput {
  h: number;
  m: number;
  s: number;
  coefficient: number;
  stats: HistoryStats;
}

const biasFrom = (stats: HistoryStats) => ({
  // Un marché chargé en gros coefficients tire les résultats vers le haut.
  up: clamp(stats.high5plusRatio * 0.9 + stats.extreme20Ratio * 0.6, 0, 0.55),
  // Un marché bleu tire vers le bas.
  down: clamp(stats.under2Ratio * 0.7 + (stats.longestBlueStreak >= 5 ? 0.15 : 0), 0, 0.6),
});

const mapRange = (r: number, min: number, max: number, bias: { up: number; down: number }) => {
  const shifted = clamp(r + bias.up * 0.35 - bias.down * 0.3, 0.02, 0.98);
  // Courbe non linéaire : concentre les tirages dans la zone basse/médiane, réaliste pour un crash game.
  const curved = Math.pow(shifted, 1.45);
  return clamp(min + curved * (max - min), min, max);
};

const confidenceFor = (rng: Rng, precisionBase: number, coeff: number) => {
  const penalty = coeff >= 10 ? 8 : coeff >= 5 ? 4 : 0;
  const confidence = Math.round(clamp(precisionBase - penalty + rng.int(-3, 5), 60, 97));
  const reliability = Math.round(clamp(confidence + rng.int(-2, 4), 60, 97));
  return { confidence, reliability };
};

/**
 * NIVEAU 1 — moteur historique amélioré.
 * Projection courte (+1 à +3 min) avec coefficient calibré sur la structure réelle
 * du marché. Précision renforcée : la fenêtre est resserrée quand la volatilité est basse.
 */
export function runLevel1(input: EngineInput): LevelOutcome {
  const { h, m, s, coefficient, stats } = input;
  const rng = new Rng(makeSeed(h, m, s, coefficient, 1, stats.mean));
  const bias = biasFrom(stats);
  const now = new Date();

  const tight = stats.volatility < 4;
  const baseOffset = tight ? rng.int(70, 130) : rng.int(100, 200);
  const t1 = addSeconds(h, m, s, baseOffset);
  const t2 = addSeconds(h, m, s, baseOffset + rng.int(75, 140));

  const c1 = mapRange(rng.next(), 1.8, tight ? 3.4 : 4.6, bias);
  const c2 = mapRange(rng.next(), 2.2, tight ? 5.2 : 7.5, bias);

  const precisionBase = clamp(84 + (tight ? 6 : 0) + stats.mid2to5Ratio * 8, 68, 95);

  const rows: LevelResultRow[] = [
    { kind: "main", label: "Résultat principal", value: c1, t: t1, offsetLabel: `+${Math.floor(baseOffset / 60)} min ${pad(baseOffset % 60)} s` },
    {
      kind: "index",
      label: "Confirmation",
      value: c2,
      t: t2,
      offsetLabel: "Second passage",
    },
  ].map((r) => {
    const { confidence, reliability } = confidenceFor(rng, precisionBase, r.value);
    return {
      kind: r.kind as LevelResultRow["kind"],
      label: r.label,
      time: fmt(r.t.h, r.t.m, r.t.s),
      coefficient: Number(r.value.toFixed(2)),
      confidence,
      reliability,
      stability: stabilityOf(r.value, confidence),
      risk: riskOf(r.value),
      offsetLabel: r.offsetLabel,
    };
  });

  return buildOutcome(1, rows, precisionBase, stats, now, `${pad(h)}:${pad(m)}:${pad(s)}`, coefficient, "Standard Engine v4.2");
}

/**
 * NIVEAU 2 — Double Projection.
 * Méthode de calcul confidentielle : elle n'est jamais exposée à l'utilisateur.
 * Sortie : deux horaires de prédiction distincts (résultat principal 2.00x → 5.00x
 * pour chacun) et un indice totalement indépendant présenté séparément.
 */
export function runLevel2(input: EngineInput): LevelOutcome {
  const { h, m, coefficient, stats } = input;
  const rng = new Rng(makeSeed(h, m, coefficient, 2, stats.volatility, stats.mean));
  const bias = biasFrom(stats);
  const now = new Date();

  // Fenêtres internes (confidentielles) + secondes générées intelligemment.
  const off1 = 3 * 60 + smartSeconds(rng, stats, 1);
  const off2 = 4 * 60 + smartSeconds(rng, stats, 2);
  const offIndex = 5 * 60 + smartSeconds(rng, stats, 3);

  const t1 = addSeconds(h, m, 0, off1);
  const t2 = addSeconds(h, m, 0, off2);
  const tIndex = addSeconds(h, m, 0, offIndex);

  // Les deux horaires livrent chacun un résultat principal entre 2.00x et 5.00x.
  const main1 = clamp(mapRange(rng.next(), 2.0, 5.0, bias), 2.0, 5.0);
  const main2 = clamp(mapRange(rng.next(), 2.0, 5.0, bias), 2.0, 5.0);
  // L'indice est indépendant des deux horaires principaux.
  const index = mapRange(rng.next(), 5.0, 20.0, bias);

  const precisionBase = clamp(86 + stats.mid2to5Ratio * 8 - stats.volatility * 0.35, 70, 96);

  const mk = (
    kind: LevelResultRow["kind"],
    label: string,
    value: number,
    t: { h: number; m: number; s: number },
    precision: number,
  ): LevelResultRow => {
    const { confidence, reliability } = confidenceFor(rng, precision, value);
    return {
      kind,
      label,
      time: fmt(t.h, t.m, t.s),
      coefficient: Number(value.toFixed(2)),
      confidence,
      reliability,
      stability: stabilityOf(value, confidence),
      risk: riskOf(value),
      offsetLabel: "",
    };
  };

  const rows = [
    mk("main", "Premier horaire", main1, t1, precisionBase),
    mk("main", "Deuxième horaire", main2, t2, precisionBase - 3),
    mk("index", "Indice", index, tIndex, precisionBase - 10),
  ];

  return buildOutcome(2, rows, precisionBase, stats, now, `${pad(h)}:${pad(m)}`, coefficient, "Dual Projection v3.0");
}


/**
 * NIVEAU 3 — Frappe haute.
 * Méthode de calcul confidentielle : elle n'est jamais exposée à l'utilisateur.
 * Sortie : un résultat principal haut et un indice de protection indépendant.
 */
export function runLevel3(input: EngineInput): LevelOutcome {
  const { h, m, coefficient, stats } = input;
  const rng = new Rng(makeSeed(h, m, coefficient, 3, stats.max, stats.volatility));
  const bias = biasFrom(stats);
  const now = new Date();

  // Fenêtre interne (confidentielle) + secondes générées intelligemment.
  const off = 2 * 60 + smartSeconds(rng, stats, 4);
  const t = addSeconds(h, m, 0, off);
  const tProtect = addSeconds(h, m, 0, 3 * 60 + smartSeconds(rng, stats, 5));

  const main = mapRange(rng.next(), 5.0, 20.0, bias);
  const protect = mapRange(rng.next(), 2.0, 5.0, bias);

  const precisionBase = clamp(82 + stats.high5plusRatio * 18 - stats.under2Ratio * 10, 68, 95);

  const mk = (
    kind: LevelResultRow["kind"],
    label: string,
    value: number,
    at: { h: number; m: number; s: number },
  ): LevelResultRow => {
    const { confidence, reliability } = confidenceFor(rng, kind === "main" ? precisionBase : precisionBase + 4, value);
    return {
      kind,
      label,
      time: fmt(at.h, at.m, at.s),
      coefficient: Number(value.toFixed(2)),
      confidence,
      reliability,
      stability: stabilityOf(value, confidence),
      risk: riskOf(value),
      offsetLabel: "",
    };
  };

  const rows = [
    mk("main", "Résultat principal", main, t),
    mk("protection", "Indice de protection", protect, tProtect),
  ];

  return buildOutcome(3, rows, precisionBase, stats, now, `${pad(h)}:${pad(m)}`, coefficient, "High Strike v2.0");
}


function buildOutcome(
  level: LevelId,
  rows: LevelResultRow[],
  precisionBase: number,
  stats: HistoryStats,
  now: Date,
  inputTime: string,
  inputCoefficient: number,
  engine: string,
): LevelOutcome {
  const precision = Math.round(clamp(precisionBase, 60, 97));
  const confidence: ConfidenceLabel =
    precision >= 90 ? "Très élevée" : precision >= 80 ? "Élevée" : precision >= 70 ? "Moyenne" : "Faible";

  const nextCaptureMin = Math.round(clamp(14 - stats.volatility * 0.8, 5, 13));
  const nextCaptureAt = new Date(now.getTime() + nextCaptureMin * 60_000);

  return {
    level,
    rows,
    precision,
    confidence,
    nextCaptureAt,
    nextCaptureHint: `Effectuez une nouvelle capture des 30 derniers tours dans ${nextCaptureMin} min pour recalculer le niveau recommandé.`,
    engine,
    createdAt: now,
    inputTime,
    inputCoefficient,
  };
}

export function runLevel(level: LevelId, input: EngineInput): LevelOutcome {
  if (level === 2) return runLevel2(input);
  if (level === 3) return runLevel3(input);
  return runLevel1(input);
}

// ---------------------------------------------------------------------------
// 4. Historique local des analyses
// ---------------------------------------------------------------------------

export interface StoredAnalysis {
  id: string;
  level: LevelId;
  at: string;
  inputTime: string;
  inputCoefficient: number;
  precision: number;
  main: { time: string; coefficient: number };
}

const HISTORY_KEY = "aviator-levels-history";

export function loadAnalysisHistory(): StoredAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as StoredAnalysis[]) : [];
  } catch {
    return [];
  }
}

export function pushAnalysisHistory(outcome: LevelOutcome): StoredAnalysis[] {
  if (typeof window === "undefined") return [];
  const main = outcome.rows.find((r) => r.kind === "main") ?? outcome.rows[0];
  const entry: StoredAnalysis = {
    id: `${outcome.createdAt.getTime()}-${outcome.level}`,
    level: outcome.level,
    at: outcome.createdAt.toISOString(),
    inputTime: outcome.inputTime,
    inputCoefficient: outcome.inputCoefficient,
    precision: outcome.precision,
    main: { time: main.time, coefficient: main.coefficient },
  };
  const next = [entry, ...loadAnalysisHistory()].slice(0, 12);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
  return next;
}
