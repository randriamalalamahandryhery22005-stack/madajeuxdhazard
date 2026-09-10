export type SupportedGame = "aviator" | "cosmox" | "jetx";

export interface SingleRoundInput { game: SupportedGame; time: string; coefficient: number; }
export interface SingleRoundResult { game: SupportedGame; time: string; coefficient: number; score: number; zone: "Basse" | "Intermédiaire" | "Haute"; risk: "Faible" | "Modéré" | "Élevé"; referenceTime: string; note: string; }

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function analyseSingleRound(input: SingleRoundInput): SingleRoundResult {
  const coefficient = Math.max(1, input.coefficient);
  const [h, m, s] = input.time.split(":").map(Number);
  const seconds = h * 3600 + m * 60 + s;
  const zone: SingleRoundResult["zone"] = coefficient < 2 ? "Basse" : coefficient < 5 ? "Intermédiaire" : "Haute";
  const risk: SingleRoundResult["risk"] = coefficient >= 5 ? "Élevé" : coefficient >= 2 ? "Modéré" : "Faible";
  // Indice de lecture uniquement : il ne représente pas une probabilité de gain.
  const gameFactor = input.game === "aviator" ? 3 : input.game === "cosmox" ? 5 : 7;
  const timeFactor = ((seconds % 97) * gameFactor) % 31;
  const score = Math.round(clamp(72 - Math.abs(coefficient - 2.5) * 8 + timeFactor * 0.35, 1, 99));
  const referenceSeconds = (seconds + 60) % 86400;
  const referenceTime = `${String(Math.floor(referenceSeconds / 3600)).padStart(2, "0")}:${String(Math.floor(referenceSeconds / 60) % 60).padStart(2, "0")}:${String(referenceSeconds % 60).padStart(2, "0")}`;
  return {
    game: input.game, time: input.time, coefficient, score, zone, risk, referenceTime,
    note: "Cet indice décrit uniquement les données saisies et leur zone. Il ne prédit pas le prochain résultat du jeu : celui-ci dépend du moteur RNG/provably-fair du fournisseur.",
  };
}
