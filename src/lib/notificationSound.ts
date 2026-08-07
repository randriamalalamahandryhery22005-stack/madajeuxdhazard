// Sons de notification de l'application — synthèse Web Audio « AI-designed ».
// Chaque événement a un son distinct, moderne et de haute qualité, généré
// à la volée sans dépendance à un fichier binaire (fonctionne toujours,
// même hors ligne).

import ringtoneAsset from "@/assets/ringtone-call.ogg.asset.json";

export type SoundKind =
  | "message"
  | "voice"
  | "call"
  | "ring"
  | "outgoing"
  | "missed"
  | "hangup"
  | "notification"
  | "subscription"
  | "validation"
  | "download"
  | "error";

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
    const p = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      enabled: p.enabled !== false,
      volume: typeof p.volume === "number" ? Math.min(1, Math.max(0, p.volume)) : DEFAULTS.volume,
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
  const h = () => cb(readSoundSettings());
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}

/* ----------------------- Web Audio infrastructure ----------------------- */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!AC) return null;
      ctx = new AC();
    } catch { ctx = null; }
  }
  return ctx;
}

/** Garantit un contexte audio « running » (résout la suspension iOS/Chrome). */
async function ensureRunning(): Promise<AudioContext | null> {
  const c = getCtx();
  if (!c) return null;
  if (c.state === "running") return c;
  try { await c.resume(); } catch { /* noop */ }
  return c.state === "running" ? c : null;
}

export function unlockAudioPlayback() {
  const c = getCtx();
  if (!c) return;
  const kick = () => {
    try {
      const buf = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(0);
    } catch { /* noop */ }
  };
  if (c.state === "running") { kick(); return; }
  c.resume().then(kick).catch(() => {});
}

if (typeof window !== "undefined") {
  // Les écouteurs restent actifs tant que le contexte n'est pas réellement
  // « running » (un premier geste peut échouer selon la plateforme).
  const evts: (keyof WindowEventMap)[] = ["pointerdown", "touchstart", "keydown", "click"];
  const h = () => {
    unlockAudioPlayback();
    if (ctx && ctx.state === "running") {
      evts.forEach((e) => window.removeEventListener(e, h));
    }
  };
  evts.forEach((e) => window.addEventListener(e, h, { passive: true } as any));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  });
}


/** One shaped tone with attack/decay envelope. */
function playTone(
  c: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  gain: number,
  type: OscillatorType = "sine",
  freqEndRatio = 1,
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  if (freqEndRatio !== 1) {
    osc.frequency.exponentialRampToValueAtTime(freq * freqEndRatio, startAt + duration);
  }
  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(gain, startAt + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(g).connect(c.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

interface Voice { freq: number; delay: number; dur: number; gain: number; type?: OscillatorType; slide?: number; }
type Design = Voice[];

const DESIGNS: Record<SoundKind, Design> = {
  // Message: soft two-note pop ("ti-dum")
  message: [
    { freq: 880, delay: 0.00, dur: 0.14, gain: 0.35, type: "sine" },
    { freq: 1320, delay: 0.09, dur: 0.22, gain: 0.30, type: "sine" },
  ],
  // Voice message: ascending triad, warm
  voice: [
    { freq: 660, delay: 0.00, dur: 0.16, gain: 0.32, type: "triangle" },
    { freq: 880, delay: 0.10, dur: 0.18, gain: 0.30, type: "triangle" },
    { freq: 1100, delay: 0.22, dur: 0.24, gain: 0.28, type: "triangle" },
  ],
  // Incoming call: bright dual-tone
  call: [
    { freq: 1046, delay: 0.00, dur: 0.28, gain: 0.42, type: "sine" },
    { freq: 1568, delay: 0.00, dur: 0.28, gain: 0.28, type: "triangle" },
    { freq: 1046, delay: 0.36, dur: 0.28, gain: 0.42, type: "sine" },
    { freq: 1568, delay: 0.36, dur: 0.28, gain: 0.28, type: "triangle" },
  ],
  // Ringtone: repeating three-note motif (looped externally via startRingtone)
  ring: [
    { freq: 987, delay: 0.00, dur: 0.20, gain: 0.45, type: "sine" },
    { freq: 1318, delay: 0.22, dur: 0.20, gain: 0.42, type: "sine" },
    { freq: 987, delay: 0.44, dur: 0.20, gain: 0.45, type: "sine" },
    { freq: 1568, delay: 0.66, dur: 0.32, gain: 0.42, type: "sine" },
  ],
  // Outgoing call: soft ringback pulse (looped via startOutgoingRingback)
  outgoing: [
    { freq: 440, delay: 0.00, dur: 0.55, gain: 0.24, type: "sine" },
    { freq: 480, delay: 0.00, dur: 0.55, gain: 0.18, type: "triangle" },
  ],
  // Missed call: melancholic descending pair
  missed: [
    { freq: 784, delay: 0.00, dur: 0.22, gain: 0.32, type: "sine" },
    { freq: 587, delay: 0.18, dur: 0.28, gain: 0.30, type: "sine" },
    { freq: 392, delay: 0.40, dur: 0.36, gain: 0.26, type: "sine" },
  ],
  // Call ended: short muted double blip
  hangup: [
    { freq: 520, delay: 0.00, dur: 0.12, gain: 0.26, type: "sine" },
    { freq: 380, delay: 0.11, dur: 0.16, gain: 0.24, type: "sine" },
  ],
  // Generic notification: airy glass chime
  notification: [
    { freq: 1245, delay: 0.00, dur: 0.22, gain: 0.26, type: "sine" },
    { freq: 1661, delay: 0.05, dur: 0.28, gain: 0.20, type: "sine" },
    { freq: 2489, delay: 0.11, dur: 0.30, gain: 0.12, type: "sine" },
    { freq: 830, delay: 0.16, dur: 0.44, gain: 0.16, type: "triangle" },
  ],
  // Notification / subscription: crisp bell chime
  subscription: [
    { freq: 1567, delay: 0.00, dur: 0.30, gain: 0.30, type: "sine" },
    { freq: 2093, delay: 0.06, dur: 0.34, gain: 0.22, type: "sine" },
    { freq: 1046, delay: 0.14, dur: 0.42, gain: 0.20, type: "sine" },
  ],
  // Validation / success: rising major arpeggio
  validation: [
    { freq: 523, delay: 0.00, dur: 0.12, gain: 0.35, type: "triangle" },
    { freq: 659, delay: 0.09, dur: 0.12, gain: 0.35, type: "triangle" },
    { freq: 784, delay: 0.18, dur: 0.16, gain: 0.35, type: "triangle" },
    { freq: 1046, delay: 0.28, dur: 0.24, gain: 0.35, type: "sine" },
  ],
  // Download / complete: soft descending glide
  download: [
    { freq: 1046, delay: 0.00, dur: 0.24, gain: 0.30, type: "sine", slide: 0.5 },
    { freq: 523, delay: 0.20, dur: 0.24, gain: 0.28, type: "sine" },
  ],
  // Error: low buzz, two-step down
  error: [
    { freq: 320, delay: 0.00, dur: 0.18, gain: 0.36, type: "square" },
    { freq: 220, delay: 0.14, dur: 0.24, gain: 0.36, type: "square" },
  ],
};

const lastPlay: Record<string, number> = {};

function playDesign(kind: SoundKind, volume: number, force = false) {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const design = DESIGNS[kind];
  if (!design) return;
  const vol = Math.min(1, Math.max(0, volume));
  for (const v of design) {
    playTone(c, v.freq, now + v.delay, v.dur, v.gain * vol, v.type ?? "sine", v.slide ?? 1);
  }
  if (!force) lastPlay[kind] = Date.now();
}

/** Joue un son de notification (respecte préférences + anti-spam 1,2 s). */
export function playNotificationSound(kind: SoundKind, opts: { force?: boolean } = {}) {
  if (typeof window === "undefined") return;
  const s = readSoundSettings();
  if (!s.enabled && !opts.force) return;
  const now = Date.now();
  if (!opts.force && (lastPlay[kind] || 0) + 1200 > now) return;
  try { playDesign(kind, s.volume, !!opts.force); } catch { /* noop */ }
}

/** Sonnerie continue (appel entrant). Retourne une fonction d'arrêt. */
export function startRingtone(): () => void {
  if (typeof window === "undefined") return () => {};
  const s = readSoundSettings();
  let stopped = false;
  let timer: number | null = null;
  let fallbackTimer: number | null = null;
  let retryHandler: (() => void) | null = null;

  // Fallback synthesized ring (used if the audio file fails or is blocked)
  const startSynthFallback = () => {
    if (fallbackTimer !== null || stopped) return;
    const tick = () => {
      if (stopped) return;
      if (s.enabled) {
        try { playDesign("ring", Math.max(0.35, s.volume), true); } catch { /* noop */ }
      }
      fallbackTimer = window.setTimeout(tick, 1400);
    };
    tick();
  };

  let audio: HTMLAudioElement | null = null;
  try {
    audio = new Audio(ringtoneAsset.url);
  } catch {
    audio = null;
  }

  if (audio && s.enabled) {
    audio.loop = true;
    audio.volume = Math.max(0.35, s.volume);
    audio.addEventListener("error", () => { if (!stopped) startSynthFallback(); });
    const play = () => {
      audio?.play().catch(() => {
        // Autoplay blocked: retry on the very next user gesture, never throw.
        if (retryHandler || stopped) return;
        retryHandler = () => {
          if (stopped) return;
          audio?.play().catch(() => startSynthFallback());
        };
        window.addEventListener("pointerdown", retryHandler, { once: true });
        window.addEventListener("keydown", retryHandler, { once: true });
        // Also make sure something audible happens even before the gesture.
        startSynthFallback();
      });
    };
    play();
  } else if (s.enabled) {
    startSynthFallback();
  }

  if (navigator.vibrate) {
    try { navigator.vibrate([300, 200, 300, 200, 300]); } catch { /* noop */ }
  }

  return () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    if (audio) { try { audio.pause(); audio.currentTime = 0; } catch { /* noop */ } }
    if (retryHandler) {
      window.removeEventListener("pointerdown", retryHandler);
      window.removeEventListener("keydown", retryHandler);
    }
    if (navigator.vibrate) { try { navigator.vibrate(0); } catch { /* noop */ } }
  };
}

/** Tonalité d'appel sortant (ringback). Retourne une fonction d'arrêt. */
export function startOutgoingRingback(): () => void {
  if (typeof window === "undefined") return () => {};
  let stopped = false;
  let timer: number | null = null;
  const tick = () => {
    if (stopped) return;
    const s = readSoundSettings();
    if (s.enabled) {
      try { playDesign("outgoing", Math.max(0.25, s.volume), true); } catch { /* noop */ }
    }
    timer = window.setTimeout(tick, 2400);
  };
  tick();
  return () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
  };
}
