// Fond d'écran vidéo de l'application.
// La vidéo choisie par l'utilisateur est stockée localement (IndexedDB) afin de
// survivre aux rechargements, et appliquée derrière toute l'interface.

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

function refreshMediaClass() {
  if (typeof document === "undefined") return;
  const hasVideo = Boolean(document.getElementById(ELEMENT_ID));
  const hasImage = Boolean(document.getElementById("jh-custom-bg"));
  document.documentElement.classList.toggle("has-custom-media", hasVideo || hasImage);
}

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
    document.documentElement.classList.remove("has-bg-video");
    refreshMediaClass();
    if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
    return;
  }
  let wrapper = existing;
  let video = wrapper?.querySelector("video") as HTMLVideoElement | null;
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = ELEMENT_ID;
    wrapper.setAttribute("aria-hidden", "true");
    Object.assign(wrapper.style, {
      position: "fixed",
      inset: "0",
      zIndex: "0",
      pointerEvents: "none",
      overflow: "hidden",
      background: "#000",
      opacity: "0",
      transition: "opacity 420ms ease",
      transform: "translateZ(0)",
    } as CSSStyleDeclaration);

    video = document.createElement("video");
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("preload", "auto");
    Object.assign(video.style, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    } as CSSStyleDeclaration);
    wrapper.appendChild(video);

    const veil = document.createElement("div");
    veil.dataset.veil = "1";
    Object.assign(veil.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      background: "linear-gradient(hsl(var(--background) / 0.50), hsl(var(--background) / 0.76))",
    } as CSSStyleDeclaration);
    wrapper.appendChild(veil);
    // Insérer en tout premier enfant de <body> pour rester derrière l'app.
    document.body.insertBefore(wrapper, document.body.firstChild);
  }
  document.documentElement.classList.add("has-bg-video");
  refreshMediaClass();
  if (!video) return;
  // Ne pas ré-affecter src si identique (évite un reload/flash noir).
  const currentSrc = video.currentSrc || video.src;
  if (currentSrc !== src) {
    video.src = src;
    try { video.load(); } catch { /* noop */ }
  }

  const wantSound = opts.muted === false;
  video.muted = !wantSound;
  video.volume = Math.min(1, Math.max(0, opts.volume ?? 1));
  video.style.opacity = String(opts.opacity ?? 1);
  video.style.filter = opts.blur ? `blur(${opts.blur}px)` : "none";

  if (opts.paused) {
    try { video.pause(); } catch { /* noop */ }
    return;
  }

  const tryPlay = () => {
    if (wrapper) wrapper.style.opacity = "1";
    const p = video!.play();
    if (p && typeof p.then === "function") {
      p.catch(() => {
        video!.muted = true;
        void video!.play().catch(() => { /* noop */ });
        if (wantSound) armSoundGesture(video!);
      });
    }
  };
  video.onerror = () => {
    if (wrapper) wrapper.style.opacity = "0";
  };
  video.oncanplay = () => {
    if (wrapper) wrapper.style.opacity = "1";
  };
  if (video.readyState >= 2) tryPlay();
  else video.addEventListener("loadeddata", tryPlay, { once: true });
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
