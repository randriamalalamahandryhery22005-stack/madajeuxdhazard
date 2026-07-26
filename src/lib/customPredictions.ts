import { logPrediction } from "./predictionLogger";
import { formatCoefficient } from "./predictions";
import type { PredictionResult } from "./predictions";

/**
 * Configuration JSON for an admin-defined prediction type.
 *
 * Stored in `custom_predictions.config` (jsonb).
 * All fields are optional with sensible defaults.
 */
export interface CustomPredictionConfig {
  /** number of result cards generated, default 5 */
  resultCount?: number;
  /** absolute coefficient bounds for the result */
  minCoeff?: number;
  maxCoeff?: number;
  /** minutes added between consecutive results */
  intervalMinutes?: number;
  /** if true, also add a random 0-59s offset; default true */
  jitterSeconds?: boolean;
  /** distribution buckets — must sum to ~1.0; each bucket has its own range */
  distribution?: Array<{ weight: number; min: number; max: number }>;
  /** target reliability % (used for indicators), default 75 */
  reliabilityTarget?: number;
}

export interface CustomPredictionType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  requires_subscription: boolean;
  subscription_key: string | null;
  config: CustomPredictionConfig;
}

class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = Math.max(1, Math.abs(seed)); }
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  between(min: number, max: number): number { return min + this.next() * (max - min); }
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (h: number, m: number, s: number, showSeconds: boolean) =>
  showSeconds ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}`;

const indicators = (coeff: number): Pick<PredictionResult, "stability" | "risk"> => {
  if (coeff < 2) return { stability: "Haute", risk: "Faible" };
  if (coeff < 3.5) return { stability: "Haute", risk: "Modéré" };
  if (coeff < 6) return { stability: "Moyenne", risk: "Modéré" };
  return { stability: "Basse", risk: "Élevé" };
};

export function generateCustomPrediction(
  type: CustomPredictionType,
  hour: number,
  minute: number,
  inputCoefficient: number,
  showSeconds = true,
): PredictionResult[] {
  const cfg = type.config ?? {};
  const count = Math.max(1, Math.min(20, cfg.resultCount ?? 5));
  let minC = Number.isFinite(cfg.minCoeff as number) ? (cfg.minCoeff as number) : 1.30;
  let maxC = Number.isFinite(cfg.maxCoeff as number) ? (cfg.maxCoeff as number) : 8.00;
  // Safety: prevent degenerate config (min==max) that would freeze results
  if (maxC - minC < 0.10) {
    minC = Math.max(1.10, minC - 0.50);
    maxC = minC + 4.00;
  }
  const intervalMin = Math.max(1, cfg.intervalMinutes ?? 2);
  const jitter = cfg.jitterSeconds !== false;
  const reliabilityTarget = cfg.reliabilityTarget ?? 75;

  // Default distribution if none provided: balanced 35/40/18/7
  let dist = (cfg.distribution && cfg.distribution.length > 0 ? cfg.distribution : null) ?? [
    { weight: 0.35, min: 1.30, max: 2.00 },
    { weight: 0.40, min: 2.00, max: 3.50 },
    { weight: 0.18, min: 3.50, max: 6.00 },
    { weight: 0.07, min: 6.00, max: 12.00 },
  ];
  // Sanitize buckets: clamp to [minC, maxC] and drop degenerate ones
  dist = dist
    .map((b) => {
      const bMin = Math.max(minC, Math.min(maxC, Number(b.min) || minC));
      const bMax = Math.max(bMin + 0.05, Math.min(maxC, Number(b.max) || maxC));
      return { weight: Math.max(0, Number(b.weight) || 0), min: bMin, max: bMax };
    })
    .filter((b) => b.weight > 0 && b.max > b.min);
  if (dist.length === 0) dist = [{ weight: 1, min: minC, max: maxC }];
  const totalWeight = dist.reduce((s, b) => s + b.weight, 0) || 1;

  // Seed varies with current second + day so the same time/coeff input still
  // produces evolving, realistic results across calls (mirrors live game).
  const now = new Date();
  const drift = now.getSeconds() + now.getMinutes() * 60 + now.getHours() * 3600 + now.getDate() * 86400;
  const seed = (hour * 60 + minute) * 1000 + Math.round(inputCoefficient * 137) + type.id.charCodeAt(0) * 31 + drift;
  const rng = new SeededRandom(seed);

  const results: PredictionResult[] = [];
  let totalSec = hour * 3600 + minute * 60;

  for (let i = 0; i < count; i++) {
    totalSec += intervalMin * 60 + (jitter ? Math.floor(rng.between(5, 55)) : 0);
    totalSec %= 86400;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    // Pick a bucket using weighted random
    let r = rng.next() * totalWeight;
    let chosen = dist[0];
    for (const b of dist) {
      r -= b.weight;
      if (r <= 0) { chosen = b; break; }
    }
    let coeff = rng.between(chosen.min, chosen.max);
    coeff = Math.max(minC, Math.min(maxC, coeff));

    const { stability, risk } = indicators(coeff);
    const confidence = Math.max(45, Math.min(95, reliabilityTarget + Math.floor(rng.between(-10, 10))));
    const reliability = Math.max(45, Math.min(95, reliabilityTarget + Math.floor(rng.between(-8, 8))));

    results.push({
      time: fmt(h, m, s, showSeconds),
      coefficient: formatCoefficient(coeff),
      confidence,
      stability,
      risk,
      reliability,
    });
  }

  void logPrediction({
    mode: `custom:${type.slug}`,
    inputParams: { hour, minute, inputCoefficient, configHash: JSON.stringify(cfg).length },
    results,
    customPredictionId: type.id,
  });

  return results;
}
