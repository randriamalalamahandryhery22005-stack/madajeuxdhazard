// Musique d'ambiance de l'application (fond sonore choisi par l'utilisateur).
import { readMediaBlob } from "@/lib/mediaStore";

const ID = "jh-bg-music";
let objectUrl: string | null = null;
let gestureArmed = false;

export interface MusicOptions {
  volume?: number;  // 0..1
  paused?: boolean;
}

function getEl(): HTMLAudioElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(ID) as HTMLAudioElement | null;
}

function armGesture(audio: HTMLAudioElement) {
  if (gestureArmed) return;
  gestureArmed = true;
  const resume = () => {
    void audio.play().then(() => {
      gestureArmed = false;
      window.removeEventListener("pointerdown", resume, true);
      window.removeEventListener("keydown", resume, true);
    }).catch(() => { /* noop */ });
  };
  window.addEventListener("pointerdown", resume, true);
  window.addEventListener("keydown", resume, true);
}

/** Applique (ou retire) la musique de fond. */
export function applyBackgroundMusic(src: string | null, opts: MusicOptions = {}) {
  if (typeof document === "undefined") return;
  let audio = getEl();
  if (!src) {
    if (audio) { try { audio.pause(); } catch { /* noop */ } audio.remove(); }
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    return;
  }
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = ID;
    audio.loop = true;
    audio.setAttribute("playsinline", "");
    audio.style.display = "none";
    document.body.appendChild(audio);
  }
  if (audio.src !== src) audio.src = src;
  audio.volume = Math.min(1, Math.max(0, opts.volume ?? 0.4));
  if (opts.paused) {
    try { audio.pause(); } catch { /* noop */ }
    return;
  }
  void audio.play().catch(() => armGesture(audio!));
}

/** Charge la musique locale enregistrée et l'applique. */
export async function applyStoredBackgroundMusic(opts: MusicOptions = {}): Promise<string | null> {
  const blob = await readMediaBlob("bg-music");
  if (!blob) { applyBackgroundMusic(null); return null; }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(blob);
  applyBackgroundMusic(objectUrl, opts);
  return objectUrl;
}
