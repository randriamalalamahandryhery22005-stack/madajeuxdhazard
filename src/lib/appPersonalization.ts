// Client-side personalization store: background image, palette, language,
// favorites and navigation history. All persisted to localStorage.
// Emits a "app-personalization-changed" window event so listeners can re-apply.
import { setBackdropActive } from "@/lib/backdrop";
import { readMediaBlob } from "@/lib/mediaStore";

export type Palette = {
  primary?: string;      // "H S% L%"  (HSL triplet, no hsl())
  background?: string;
  accent?: string;
  foreground?: string;
  card?: string;
  radius?: string;       // e.g. "0.75rem"
};

export type Personalization = {
  bgUrl?: string | null;
  /** Image de fond : "local" (fichier de l'appareil), "remote" (lien) ou "ai". */
  bgImageSource?: "local" | "remote" | "ai" | null;
  bgImageName?: string | null;
  bgOpacity?: number;             // 0..1 (intensité de l'image)
  bgBlur?: number;                // px
  /** Vidéo de fond : "local" (IndexedDB) ou URL distante. */
  bgVideoSource?: "local" | "remote" | null;
  bgVideoUrl?: string | null;     // utilisé si bgVideoSource === "remote"
  bgVideoName?: string | null;
  bgVideoOpacity?: number;        // 0..1
  bgVideoBlur?: number;           // px
  bgVideoMuted?: boolean;         // son coupé (défaut: true)
  bgVideoVolume?: number;         // 0..1
  bgVideoPaused?: boolean;        // lecture en pause
  /** Musique de fond de l'application. */
  bgMusicSource?: "local" | "remote" | null;
  bgMusicUrl?: string | null;
  bgMusicName?: string | null;
  bgMusicVolume?: number;         // 0..1
  bgMusicPaused?: boolean;
  palette?: Palette | null;
  language?: "fr" | "en";
  darkMode?: boolean;
  favorites?: string[];       // paths
  history?: { path: string; ts: number; title?: string }[];
};

const KEY = "jh.personalization.v1";
const EVT = "app-personalization-changed";

export function readPersonalization(): Personalization {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Personalization) : {};
  } catch {
    return {};
  }
}

export function writePersonalization(patch: Partial<Personalization>) {
  if (typeof window === "undefined") return;
  const current = readPersonalization();
  const next = { ...current, ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT, { detail: next }));
}

export function subscribePersonalization(cb: (p: Personalization) => void) {
  const handler = () => cb(readPersonalization());
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function applyPalette(p?: Palette | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const setOrClear = (k: string, v?: string) => {
    if (v && v.trim()) root.style.setProperty(k, v);
    else root.style.removeProperty(k);
  };
  setOrClear("--primary", p?.primary);
  setOrClear("--background", p?.background);
  setOrClear("--accent", p?.accent);
  setOrClear("--foreground", p?.foreground);
  setOrClear("--card", p?.card);
  setOrClear("--radius", p?.radius);
}

export interface BackgroundImageOptions {
  opacity?: number; // 0..1
  blur?: number;    // px
}

export function applyBackground(url?: string | null, opts: BackgroundImageOptions = {}) {
  if (typeof document === "undefined") return;
  const id = "jh-custom-bg";
  let el = document.getElementById(id) as HTMLDivElement | null;
  if (!url) {
    if (el) el.remove();
    setBackdropActive("image", false);
    return;
  }
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    Object.assign(el.style, {
      position: "fixed",
      inset: "0",
      zIndex: "-1",
      pointerEvents: "none",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      transition: "opacity 400ms ease",
      opacity: "0",
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
  }
  const veil = 1 - Math.min(1, Math.max(0, opts.opacity ?? 1));
  const top = (0.15 + veil * 0.7).toFixed(2);
  const bottom = (0.35 + veil * 0.6).toFixed(2);
  el.style.backgroundImage = `linear-gradient(hsl(var(--background)/${top}), hsl(var(--background)/${bottom})), url("${url}")`;
  el.style.filter = opts.blur ? `blur(${opts.blur}px)` : "none";
  setBackdropActive("image", true);
  requestAnimationFrame(() => { if (el) el.style.opacity = "1"; });
}

let imageObjectUrl: string | null = null;

/** Charge l'image de fond enregistrée localement (IndexedDB) et l'applique. */
export async function applyStoredImageBackground(opts: BackgroundImageOptions = {}): Promise<string | null> {
  const blob = await readMediaBlob("bg-image");
  if (!blob) { applyBackground(null); return null; }
  if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
  imageObjectUrl = URL.createObjectURL(blob);
  applyBackground(imageObjectUrl, opts);
  return imageObjectUrl;
}

export function toggleFavorite(path: string): string[] {
  const cur = readPersonalization().favorites ?? [];
  const next = cur.includes(path) ? cur.filter((p) => p !== path) : [...cur, path];
  writePersonalization({ favorites: next });
  return next;
}

export function pushHistory(path: string, title?: string) {
  const cur = readPersonalization().history ?? [];
  const filtered = cur.filter((h) => h.path !== path).slice(0, 49);
  writePersonalization({
    history: [{ path, title, ts: Date.now() }, ...filtered],
  });
}
