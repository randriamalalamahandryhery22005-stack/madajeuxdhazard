// Aviator Rafal — méthode appliquée quand les tours sont mauvais
// (séries de coefficients > 5x ou séries bleues < 2x)

export type RafalSignal = {
  type: "high_streak" | "blue_streak" | "neutral";
  label: string;
  emoji: string;
};

export type RafalPrediction = {
  inputTime: string;       // HH:MM
  inputCoeff: number;      // entre 5.00 et 50.00
  resultTime: string;      // HH:MM:SS
  resultCoeff: number;     // entre 3.00 et 15.00
  signal: RafalSignal;
};

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pad = (n: number) => n.toString().padStart(2, "0");

/**
 * Détecte si la situation est "mauvaise" et requiert d'appliquer Aviator Rafal.
 * - Plusieurs coefficients > 5.00x consécutifs
 * - Ou série bleue (< 2.00x) répétée
 */
export function detectBadStreak(history: number[]): RafalSignal {
  if (history.length < 3) return { type: "neutral", label: "Historique insuffisant", emoji: "⏳" };

  const last5 = history.slice(-5);
  const highCount = last5.filter(c => c >= 5).length;
  const blueCount = last5.filter(c => c < 2).length;

  if (highCount >= 3) {
    return { type: "high_streak", label: "Multiples tours >5.00x détectés", emoji: "🔴" };
  }
  if (blueCount >= 4) {
    return { type: "blue_streak", label: "Série bleue en cours (<2.00x)", emoji: "🔵" };
  }
  return { type: "neutral", label: "Aucun signal défavorable", emoji: "🟢" };
}

/**
 * Génère une prédiction Rafal selon la règle :
 * - Coeff d'entrée : 5.00x → 50.00x
 * - Heure résultat = heure départ + 2 min, secondes aléatoires (0-59)
 * - Coeff résultat : 3.00x → 15.00x (pas forcément proportionnel)
 */
export function generateRafalPrediction(
  hour: number,
  minute: number,
  inputCoeff: number,
  signal: RafalSignal,
): RafalPrediction {
  // Clamp inputCoeff entre 5 et 50
  const safeInput = Math.min(50, Math.max(5, inputCoeff));

  // +2 minutes
  let rh = hour;
  let rm = minute + 2;
  if (rm >= 60) { rm -= 60; rh = (rh + 1) % 24; }
  const rs = Math.floor(rand(0, 60));

  // Coefficient résultat réaliste — distribution pondérée proche du jeu réel
  // (majorité de petits coefficients, rare gros)
  let resultCoeff: number;
  const r = Math.random();
  if (signal.type === "high_streak") {
    // Après plusieurs >5x : retour quasi systématique vers du bas (loi de régression)
    if (r < 0.75) resultCoeff = rand(1.30, 2.20);
    else if (r < 0.95) resultCoeff = rand(2.20, 3.50);
    else resultCoeff = rand(3.50, 5.50);
  } else if (signal.type === "blue_streak") {
    // Après série bleue : léger rebond probable mais pas garanti
    if (r < 0.55) resultCoeff = rand(1.40, 2.30);
    else if (r < 0.88) resultCoeff = rand(2.30, 4.00);
    else resultCoeff = rand(4.00, 6.50);
  } else {
    if (r < 0.65) resultCoeff = rand(1.30, 2.10);
    else if (r < 0.92) resultCoeff = rand(2.10, 3.50);
    else resultCoeff = rand(3.50, 5.00);
  }

  return {
    inputTime: `${pad(hour)}:${pad(minute)}`,
    inputCoeff: parseFloat(safeInput.toFixed(2)),
    resultTime: `${pad(rh)}:${pad(rm)}:${pad(rs)}`,
    resultCoeff: parseFloat(resultCoeff.toFixed(2)),
    signal,
  };
}
