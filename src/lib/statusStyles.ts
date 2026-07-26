// Coherent visual state system for stability, risk, precision/confidence.
// Three tones: "success" (haute / faible risque / précision élevée),
// "warning" (moyenne / risque modéré) and "danger" (faible / risque élevé).

export type Tone = "success" | "warning" | "danger" | "neutral";

export interface ToneClasses {
  text: string;
  bg: string;
  border: string;
  dot: string;
  ring: string;
  gradient: string;
}

export const TONE: Record<Tone, ToneClasses> = {
  success: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
    ring: "ring-emerald-500/40",
    gradient: "bg-gradient-to-r from-emerald-500 to-green-400",
  },
  warning: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
    ring: "ring-amber-500/40",
    gradient: "bg-gradient-to-r from-amber-500 to-orange-400",
  },
  danger: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    dot: "bg-red-400",
    ring: "ring-red-500/40",
    gradient: "bg-gradient-to-r from-red-500 to-rose-400",
  },
  neutral: {
    text: "text-muted-foreground",
    bg: "bg-secondary/50",
    border: "border-border/40",
    dot: "bg-muted-foreground",
    ring: "ring-border/40",
    gradient: "bg-gradient-to-r from-slate-500 to-slate-400",
  },
};

export const stabilityTone = (s: string): Tone =>
  s === "Haute" ? "success" : s === "Moyenne" ? "warning" : "danger";

export const riskTone = (r: string): Tone =>
  r === "Faible" ? "success" : r === "Modéré" ? "warning" : "danger";

// Confidence / precision / reliability share the same numeric scale.
export const confidenceTone = (value: number): Tone =>
  value >= 85 ? "success" : value >= 70 ? "warning" : value >= 55 ? "warning" : "danger";

export const confidenceLabel = (value: number): string =>
  value >= 90 ? "Excellent"
  : value >= 80 ? "Fort"
  : value >= 70 ? "Bon"
  : value >= 60 ? "Modéré"
  : "Faible";
