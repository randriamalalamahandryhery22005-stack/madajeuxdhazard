// Fond d'écran vidéo de l'application.
// La vidéo choisie par l'utilisateur est stockée localement (IndexedDB) afin de
// survivre aux rechargements, et appliquée derrière toute l'interface.
import { setBackdropActive } from "@/lib/backdrop";

const DB_NAME = "jh-personalization";
const STORE = "media";
const KEY = "bg-video";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVideoBlob(file: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function readVideoBlob(): Promise<Blob | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return blob;
  } catch {
    return null;
  }
}

export async function deleteVideoBlob(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch { /* noop */ }
}

const ELEMENT_ID = "jh-custom-bg-video";
let currentObjectUrl: string | null = null;
let gestureArmed = false;

export interface VideoBgOptions {
  opacity?: number; // 0..1
  blur?: number;    // px
  muted?: boolean;  // son coupé ou non
  volume?: number;  // 0..1
  paused?: boolean; // lecture en pause
}

/** Récupère l'élément vidéo de fond s'il existe. */
export function getBackgroundVideoElement(): HTMLVideoElement | null {
  if (typeof document === "undefined") return null;
  return (document.getElementById(ELEMENT_ID)?.querySelector("video") as HTMLVideoElement) ?? null;
}

/**
 * Le son ne peut démarrer qu'après une interaction utilisateur (politique
 * navigateur). On arme un écouteur unique qui relance la lecture sonore.
 */
function armSoundGesture(video: HTMLVideoElement) {
  if (gestureArmed) return;
  gestureArmed = true;
  const resume = () => {
    video.muted = false;
    void video.play().catch(() => { /* noop */ });
    if (!video.muted) {
      gestureArmed = false;
      window.removeEventListener("pointerdown", resume, true);
      window.removeEventListener("keydown", resume, true);
    }
  };
  window.addEventListener("pointerdown", resume, true);
  window.addEventListener("keydown", resume, true);
}

/** Applique (ou retire) la vidéo de fond. `src` peut être une URL distante ou un objectURL. */
export function applyBackgroundVideo(src: string | null, opts: VideoBgOptions = {}) {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(ELEMENT_ID) as HTMLDivElement | null;
  if (!src) {
    existing?.remove();
    if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
    setBackdropActive("video", false);
    return;
  }
  let wrapper = existing;
  let video = wrapper?.querySelector("video") as HTMLVideoElement | null;
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = ELEMENT_ID;
    Object.assign(wrapper.style, {
      position: "fixed",
      inset: "0",
      zIndex: "-2",
      pointerEvents: "none",
      overflow: "hidden",
    } as CSSStyleDeclaration);

    video = document.createElement("video");
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    Object.assign(video.style, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    } as CSSStyleDeclaration);
    wrapper.appendChild(video);

    const veil = document.createElement("div");
    veil.dataset.veil = "1";
    Object.assign(veil.style, {
      position: "absolute",
      inset: "0",
      background: "linear-gradient(hsl(var(--background)/0.62), hsl(var(--background)/0.82))",
    } as CSSStyleDeclaration);
    wrapper.appendChild(veil);
    document.body.appendChild(wrapper);
  }
  if (!video) return;
  if (video.src !== src) video.src = src;
  setBackdropActive("video", true);

  const wantSound = opts.muted === false;
  video.muted = !wantSound;
  video.volume = Math.min(1, Math.max(0, opts.volume ?? 1));
  video.style.opacity = String(opts.opacity ?? 1);
  video.style.filter = opts.blur ? `blur(${opts.blur}px)` : "none";

  if (opts.paused) {
    try { video.pause(); } catch { /* noop */ }
    return;
  }

  const p = video.play();
  if (p && typeof p.then === "function") {
    p.catch(() => {
      // Lecture sonore refusée : on repasse en muet pour garder le visuel,
      // puis on rétablit le son au premier geste utilisateur.
      video!.muted = true;
      void video!.play().catch(() => { /* noop */ });
      if (wantSound) armSoundGesture(video!);
    });
  }
  if (wantSound && video.muted) armSoundGesture(video);
}


/** Charge la vidéo locale enregistrée et l'applique. Retourne l'objectURL utilisé. */
export async function applyStoredVideoBackground(opts: VideoBgOptions = {}): Promise<string | null> {
  const blob = await readVideoBlob();
  if (!blob) { applyBackgroundVideo(null); return null; }
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(blob);
  applyBackgroundVideo(currentObjectUrl, opts);
  return currentObjectUrl;
}
