// Chaînage audio Splash → Bienvenue.
// La piste de bienvenue est préchargée pendant le Splash pour que
// l'enchaînement soit instantané (aucun blanc entre les deux musiques).

let welcomeAudio: HTMLAudioElement | null = null;

export function preloadWelcomeAudio(src: string): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (welcomeAudio && welcomeAudio.src.endsWith(src)) return welcomeAudio;
  const a = new Audio();
  a.src = src;
  a.preload = "auto";
  a.volume = 0;
  (a as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
  a.setAttribute("playsinline", "");
  a.setAttribute("webkit-playsinline", "");
  try { a.load(); } catch { /* noop */ }
  welcomeAudio = a;
  return a;
}

export function takeWelcomeAudio(src: string): HTMLAudioElement {
  const a = preloadWelcomeAudio(src);
  if (a) { welcomeAudio = null; return a; }
  const fallback = new Audio(src);
  fallback.volume = 0;
  return fallback;
}

/** Fondu linéaire (montée ou descente) sur un élément audio. */
export function fadeAudio(audio: HTMLAudioElement, to: number, durationMs: number) {
  const from = audio.volume;
  const start = performance.now();
  const step = (t: number) => {
    const p = Math.min(1, (t - start) / durationMs);
    // courbe douce (ease-in-out) pour une transition naturelle
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    try { audio.volume = Math.max(0, Math.min(1, from + (to - from) * eased)); } catch { /* noop */ }
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
