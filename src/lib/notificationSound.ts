// Sons de notification de l'application.
// Centralise la lecture, le volume et l'activation/désactivation (Paramètres).

export type SoundKind =
  | "message"
  | "voice"
  | "call"
  | "ring"
  | "subscription"
  | "validation"
  | "download"
  | "error";

const FILES: Record<SoundKind, string> = {
  message: "/sounds/notif-text.wav",
  voice: "/sounds/notif-voice.wav",
  call: "/sounds/notif-call.wav",
  ring: "/sounds/ringtone.wav",
  subscription: "/sounds/notif-call.wav",
  validation: "/sounds/notif-text.wav",
  download: "/sounds/notif-voice.wav",
  error: "/sounds/notif-voice.wav",
};

const KEY = "jh.sound.v1";
const EVT = "jh-sound-settings-changed";

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0..1
}

const DEFAULTS: SoundSettings = { enabled: true, volume: 0.6 };

export function readSoundSettings(): SoundSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      enabled: parsed.enabled !== false,
      volume: typeof parsed.volume === "number" ? Math.min(1, Math.max(0, parsed.volume)) : DEFAULTS.volume,
    };
  } catch {
    return DEFAULTS;
  }
}

export function writeSoundSettings(patch: Partial<SoundSettings>) {
  if (typeof window === "undefined") return;
  const next = { ...readSoundSettings(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT, { detail: next }));
}

export function subscribeSoundSettings(cb: (s: SoundSettings) => void) {
  const handler = () => cb(readSoundSettings());
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}

const lastPlay: Record<string, number> = {};

/** Joue un son de notification (respecte les préférences + anti-spam 1,2 s). */
export function playNotificationSound(kind: SoundKind, opts: { force?: boolean } = {}) {
  if (typeof window === "undefined") return;
  const s = readSoundSettings();
  if (!s.enabled && !opts.force) return;
  const now = Date.now();
  if (!opts.force && (lastPlay[kind] || 0) + 1200 > now) return;
  lastPlay[kind] = now;
  try {
    const a = new Audio(FILES[kind]);
    a.volume = Math.min(1, Math.max(0, s.volume * (kind === "ring" ? 1 : 0.9)));
    void a.play().catch(() => { /* autoplay bloqué avant interaction */ });
  } catch { /* noop */ }
}

/** Sonnerie continue (appel entrant). Retourne une fonction d'arrêt. */
export function startRingtone(): () => void {
  if (typeof window === "undefined") return () => {};
  const s = readSoundSettings();
  let audio: HTMLAudioElement | null = null;
  if (s.enabled) {
    try {
      audio = new Audio(FILES.ring);
      audio.loop = true;
      audio.volume = Math.min(1, Math.max(0.2, s.volume));
      void audio.play().catch(() => { /* noop */ });
    } catch { audio = null; }
  }
  if (navigator.vibrate) navigator.vibrate([300, 200, 300, 200, 300]);
  return () => {
    try { audio?.pause(); } catch { /* noop */ }
    if (navigator.vibrate) navigator.vibrate(0);
  };
}
