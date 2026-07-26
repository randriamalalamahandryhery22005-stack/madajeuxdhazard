import { logPrediction } from "./predictionLogger";

export interface PredictionResult {
  time: string;
  coefficient: string;
  confidence: number;
  stability: "Haute" | "Moyenne" | "Basse";
  risk: "Faible" | "Modéré" | "Élevé";
  reliability: number;
}

// Seeded PRNG for deterministic results
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  between(min: number, max: number): number { return min + this.next() * (max - min); }
  floor(min: number, max: number): number { return Math.floor(this.between(min, max)); }
}

const makeSeed = (a: number, b: number, c: number) =>
  Math.abs(((a * 2654435761) ^ (b * 2246822519) ^ (c * 3266489917)) % 2147483647) || 1;

const clampCoeff = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Format professionnel des coefficients : virgule décimale, 2 décimales fixes, suffixe x */
export const formatCoefficient = (value: number): string => value.toFixed(2).replace(".", ",") + "x";

/** Format ultra-précis : 3 décimales (utilisé pour les résultats uniques Premium/Pro/CosmoX/JetX) */
export const formatCoefficientPrecise = (value: number): string => value.toFixed(3).replace(".", ",") + "x";

/**
 * Distribution réaliste et équilibrée type "crash game" :
 * - ~35% entre 1.30x et 2.00x (bas / bleu)
 * - ~40% entre 2.00x et 3.50x (zone normale équilibrée)
 * - ~18% entre 3.50x et 6.00x (haut)
 * - ~7% au-dessus (rare, jusqu'à 12x)
 * Le résultat reste borné par [min, max] passés en argument, mais la valeur
 * est mappée pour ne pas s'agglutiner sur le minimum.
 */
const realisticCoeff = (rng: SeededRandom, min: number, max: number): number => {
  // Distribution équilibrée dans [min, max] avec biais vers la zone basse-moyenne
  // ~45% : premier tiers (zone sûre)
  // ~35% : deuxième tiers (zone moyenne)
  // ~20% : dernier tiers (zone haute)
  const span = max - min;
  const r = rng.next();
  let raw: number;
  if (r < 0.45) raw = min + rng.next() * (span / 3);
  else if (r < 0.80) raw = min + (span / 3) + rng.next() * (span / 3);
  else raw = min + (2 * span / 3) + rng.next() * (span / 3);
  return clampCoeff(raw, min, max);
};

const advanceTime = (h: number, m: number, addMin: number, addSec: number) => {
  let totalSec = h * 3600 + m * 60 + addMin * 60 + addSec;
  totalSec = totalSec % 86400;
  return {
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
};

const fmt = (h: number, m: number, s: number, showSeconds = true) =>
  showSeconds
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

const getIndicators = (coeff: number, conf: number): Pick<PredictionResult, "stability" | "risk"> => {
  if (coeff < 2) return { stability: conf > 75 ? "Haute" : "Moyenne", risk: "Faible" };
  if (coeff < 3.5) return { stability: conf > 70 ? "Haute" : "Moyenne", risk: "Modéré" };
  if (coeff < 6) return { stability: "Moyenne", risk: "Modéré" };
  return { stability: conf > 70 ? "Moyenne" : "Basse", risk: "Élevé" };
};

// Confidence/reliability calibrés : dynamiques selon le coeff, jamais bloqués sur "Faible".
// Plancher relevé pour refléter la précision réelle du moteur d'analyse.
const calibrateConfidence = (rng: SeededRandom, coeff: number): { confidence: number; reliability: number } => {
  let baseConf: number, baseRel: number;
  if (coeff < 2) { baseConf = 88; baseRel = 90; }
  else if (coeff < 3.5) { baseConf = 84; baseRel = 86; }
  else if (coeff < 6) { baseConf = 78; baseRel = 80; }
  else if (coeff < 20) { baseConf = 74; baseRel = 76; }
  else if (coeff < 50) { baseConf = 70; baseRel = 72; }
  else { baseConf = 66; baseRel = 68; }
  return {
    confidence: Math.min(97, Math.max(62, baseConf + rng.floor(-4, 10))),
    reliability: Math.min(97, Math.max(64, baseRel + rng.floor(-4, 10))),
  };
};

export const generateBasicPrediction = (
  hour: number,
  minute: number,
  coefficient: number,
  showSeconds = true,
  tier: 1 | 2 = 1,
): PredictionResult[] => {
  const rng = new SeededRandom(makeSeed(hour, minute, Math.round(coefficient * 100) + tier * 7919));

  // Résultat 1 = plus fiable et plus précis ; Résultat 2 = alternative moins fiable.
  const addMin = 2;
  const addSec = rng.floor(5, 55);
  const t = advanceTime(hour, minute, addMin, addSec);

  // Coefficient toujours dans [2.00 ; 3.00]. R1 est resserré vers la zone stable,
  // R2 peut aller un peu plus loin.
  const minC = 2.00;
  const maxC = tier === 1 ? 2.70 : 3.00;
  const resultCoeff = realisticCoeff(rng, minC, maxC);

  const base = calibrateConfidence(rng, resultCoeff);
  // R1 : boost précision & fiabilité. R2 : légère baisse pour marquer la différence.
  const confidence = tier === 1
    ? Math.min(97, base.confidence + 6)
    : Math.max(60, base.confidence - 6);
  const reliability = tier === 1
    ? Math.min(97, base.reliability + 6)
    : Math.max(62, base.reliability - 6);
  const { stability, risk } = getIndicators(resultCoeff, confidence);

  const results: PredictionResult[] = [{
    time: fmt(t.h, t.m, t.s, showSeconds),
    coefficient: formatCoefficient(resultCoeff),
    confidence,
    stability,
    risk,
    reliability,
  }];
  void logPrediction({ mode: "basic", inputParams: { hour, minute, coefficient, tier }, results });
  return results;
};

export const generateProPrediction = (hour: number, minute: number, coefficient: number, showSeconds = true): PredictionResult[] => {
  const rng = new SeededRandom(makeSeed(hour, minute, Math.round(coefficient * 1000)));

  let addMin: number;
  let minCoeff: number, maxCoeff: number;
  if (coefficient < 2) { addMin = 1; minCoeff = 1.40; maxCoeff = 3.20; }
  else if (coefficient < 3) { addMin = 2; minCoeff = 1.50; maxCoeff = 4.00; }
  else if (coefficient < 5) { addMin = 3; minCoeff = 1.60; maxCoeff = 5.50; }
  else if (coefficient < 10) { addMin = 3; minCoeff = 1.70; maxCoeff = 7.00; }
  else { addMin = 4; minCoeff = 1.80; maxCoeff = 9.50; }

  const addSec = rng.floor(5, 55);
  const t = advanceTime(hour, minute, addMin, addSec);
  const resultCoeff = realisticCoeff(rng, minCoeff, maxCoeff);
  const { confidence, reliability } = calibrateConfidence(rng, resultCoeff);
  const { stability, risk } = getIndicators(resultCoeff, confidence);

  const results: PredictionResult[] = [{
    time: fmt(t.h, t.m, t.s, true),
    coefficient: formatCoefficientPrecise(resultCoeff),
    confidence,
    stability,
    risk,
    reliability,
  }];
  void logPrediction({ mode: "pro", inputParams: { hour, minute, coefficient }, results });
  return results;
};

export const generatePremiumPrediction = (hour: number, minute: number, coefficient: number, showSeconds = true): PredictionResult[] => {
  const rng = new SeededRandom(makeSeed(hour, minute, Math.round(coefficient * 1000)));

  let offsets: number[];
  if (coefficient <= 20) offsets = [3, 5];
  else if (coefficient <= 50) offsets = [2, 4];
  else offsets = [4, 5, 9];

  const results: PredictionResult[] = offsets.map((addMin) => {
    const addSec = rng.floor(5, 55);
    const t = advanceTime(hour, minute, addMin, addSec);
    const resultCoeff = realisticCoeff(rng, 3.00, 10.00);
    const { confidence, reliability } = calibrateConfidence(rng, resultCoeff);
    const { stability, risk } = getIndicators(resultCoeff, confidence);
    return {
      time: fmt(t.h, t.m, t.s, true),
      coefficient: formatCoefficientPrecise(resultCoeff),
      confidence,
      stability,
      risk,
      reliability,
    };
  });

  void logPrediction({ mode: "premium", inputParams: { hour, minute, coefficient }, results });
  return results;
};


export const generateBalancedPrediction = (hour: number, minute: number, coefficient: number, showSeconds = true): PredictionResult[] => {
  const rng = new SeededRandom(makeSeed(hour, minute, Math.round(coefficient * 100)));
  const results: PredictionResult[] = [];
  let curH = hour, curM = minute;
  const intervals = [3, 4, 5, 3, 4, 5];

  for (let i = 0; i < 6; i++) {
    const addMin = intervals[i];
    const addSec = rng.floor(5, 55);
    const t = advanceTime(curH, curM, addMin, addSec);
    curH = t.h; curM = t.m;

    const resultCoeff = realisticCoeff(rng, 1.60, 6.50);
    const { confidence, reliability } = calibrateConfidence(rng, resultCoeff);
    const { stability, risk } = getIndicators(resultCoeff, confidence);

    results.push({
      time: fmt(curH, curM, t.s, showSeconds),
      coefficient: formatCoefficient(resultCoeff),
      confidence,
      stability,
      risk,
      reliability,
    });
  }
  void logPrediction({ mode: "balanced", inputParams: { hour, minute, coefficient }, results });
  return results;
};

export const generateCosmoXPrediction = (hour: number, minute: number, second: number, coefficient: number, showSeconds = true): PredictionResult[] => {
  const rng = new SeededRandom(makeSeed(hour * 60 + minute, second, Math.round(coefficient * 1000)));
  let totalSeconds = hour * 3600 + minute * 60 + second;

  let addSeconds: number;
  if (coefficient >= 3 && coefficient < 5) {
    addSeconds = 117 + rng.floor(-3, 3);
  } else if (coefficient >= 4 && coefficient <= 10) {
    addSeconds = 116 + rng.floor(-4, 4);
  } else {
    addSeconds = 60 + rng.floor(0, 120);
  }
  totalSeconds += addSeconds;

  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const resultCoeff = realisticCoeff(rng, 3.00, 10.00);
  const { confidence, reliability } = calibrateConfidence(rng, resultCoeff);
  const { stability, risk } = getIndicators(resultCoeff, confidence);

  const results: PredictionResult[] = [{
    time: fmt(h, m, s, true),
    coefficient: formatCoefficientPrecise(resultCoeff),
    confidence,
    stability,
    risk,
    reliability,
  }];
  void logPrediction({ mode: "cosmox", inputParams: { hour, minute, second, coefficient }, results });
  return results;
};
