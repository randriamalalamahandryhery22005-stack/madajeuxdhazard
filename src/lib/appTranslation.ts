import { readPersonalization } from "@/lib/appPersonalization";

export type AppLanguage = {
  code: string;
  label: string;
  native: string;
  flag: string;
  rtl?: boolean;
};

export const APP_LANGUAGES: AppLanguage[] = [
  { code: "fr", label: "French", native: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "es", label: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Portuguese", native: "Português", flag: "🇵🇹" },
  { code: "de", label: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "nl", label: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "ru", label: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "uk", label: "Ukrainian", native: "Українська", flag: "🇺🇦" },
  { code: "pl", label: "Polish", native: "Polski", flag: "🇵🇱" },
  { code: "tr", label: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "ar", label: "Arabic", native: "العربية", flag: "🇸🇦", rtl: true },
  { code: "he", label: "Hebrew", native: "עברית", flag: "🇮🇱", rtl: true },
  { code: "fa", label: "Persian", native: "فارسی", flag: "🇮🇷", rtl: true },
  { code: "ur", label: "Urdu", native: "اردو", flag: "🇵🇰", rtl: true },
  { code: "hi", label: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "bn", label: "Bengali", native: "বাংলা", flag: "🇧🇩" },
  { code: "zh", label: "Chinese", native: "中文", flag: "🇨🇳" },
  { code: "ja", label: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", label: "Thai", native: "ไทย", flag: "🇹🇭" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "sw", label: "Swahili", native: "Kiswahili", flag: "🇰🇪" },
  { code: "mg", label: "Malagasy", native: "Malagasy", flag: "🇲🇬" },
  { code: "am", label: "Amharic", native: "አማርኛ", flag: "🇪🇹" },
  { code: "el", label: "Greek", native: "Ελληνικά", flag: "🇬🇷" },
  { code: "cs", label: "Czech", native: "Čeština", flag: "🇨🇿" },
  { code: "sv", label: "Swedish", native: "Svenska", flag: "🇸🇪" },
  { code: "no", label: "Norwegian", native: "Norsk", flag: "🇳🇴" },
  { code: "da", label: "Danish", native: "Dansk", flag: "🇩🇰" },
  { code: "fi", label: "Finnish", native: "Suomi", flag: "🇫🇮" },
  { code: "ro", label: "Romanian", native: "Română", flag: "🇷🇴" },
  { code: "hu", label: "Hungarian", native: "Magyar", flag: "🇭🇺" },
];

const TEXT_CACHE_PREFIX = "jh.i18n.cache.";
const ORIGINAL_TEXT = new WeakMap<Text, string>();
const ORIGINAL_ATTR = new WeakMap<Element, Map<string, string>>();
const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "SVG", "CANVAS", "IFRAME"]);
const PRESERVE = new Set(["Jeux d'Hazard", "Aviator", "JetX", "CosmoX", "Spribe", "Bet261", "1xBet", "J&H Studio"]);

let currentLanguage = "fr";
let observer: MutationObserver | null = null;
let queued = false;
let translating = false;

function normalise(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function getCache(lang: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(TEXT_CACHE_PREFIX + lang) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function setCache(lang: string, cache: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TEXT_CACHE_PREFIX + lang, JSON.stringify(cache));
  } catch {
    /* localStorage full: translation still works for this render */
  }
}

function shouldTranslate(value: string) {
  const s = normalise(value);
  if (!s || s.length < 2 || s.length > 480) return false;
  if (PRESERVE.has(s)) return false;
  if (/^[\d\s.,:%+\-–—/()]+$/.test(s)) return false;
  if (/^https?:\/\//i.test(s) || s.startsWith("/")) return false;
  return /[A-Za-zÀ-ÿ]/.test(s);
}

function isSkippableNode(node: Node) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest("[data-no-translate], [translate='no']")) return true;
  return false;
}

function textNodes(root: ParentNode) {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (isSkippableNode(node)) return NodeFilter.FILTER_REJECT;
      return shouldTranslate(node.textContent || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  let next = walker.nextNode();
  while (next) {
    out.push(next as Text);
    next = walker.nextNode();
  }
  return out;
}

function rememberAttr(el: Element, attr: string, value: string) {
  let map = ORIGINAL_ATTR.get(el);
  if (!map) {
    map = new Map();
    ORIGINAL_ATTR.set(el, map);
  }
  if (!map.has(attr)) map.set(attr, value);
}

function collect(root: ParentNode, lang: string) {
  const cache = getCache(lang);
  const pending = new Set<string>();

  for (const node of textNodes(root)) {
    const original = ORIGINAL_TEXT.get(node) || node.textContent || "";
    if (!ORIGINAL_TEXT.has(node)) ORIGINAL_TEXT.set(node, original);
    const key = normalise(original);
    if (!shouldTranslate(key)) continue;
    if (cache[key]) node.textContent = original.replace(key, cache[key]);
    else pending.add(key);
  }

  const elements = Array.from(root.querySelectorAll?.("*") || []);
  for (const el of elements) {
    if (el.closest("[data-no-translate], [translate='no']")) continue;
    for (const attr of TRANSLATABLE_ATTRS) {
      const current = el.getAttribute(attr);
      if (!current) continue;
      const existing = ORIGINAL_ATTR.get(el)?.get(attr) || current;
      rememberAttr(el, attr, existing);
      const key = normalise(existing);
      if (!shouldTranslate(key)) continue;
      if (cache[key]) el.setAttribute(attr, existing.replace(key, cache[key]));
      else pending.add(key);
    }
  }

  return { pending: Array.from(pending).slice(0, 100), cache };
}

function restore(root: ParentNode) {
  for (const node of textNodes(root)) {
    const original = ORIGINAL_TEXT.get(node);
    if (original !== undefined) node.textContent = original;
  }
  const elements = Array.from(root.querySelectorAll?.("*") || []);
  for (const el of elements) {
    const attrs = ORIGINAL_ATTR.get(el);
    if (!attrs) continue;
    for (const [attr, value] of attrs) el.setAttribute(attr, value);
  }
}

async function requestTranslations(lang: string, texts: string[]) {
  const res = await fetch("/api/translate-ui", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetLanguage: lang, texts }),
  });
  if (!res.ok) return {} as Record<string, string>;
  const data = (await res.json()) as { translations?: Record<string, string> };
  return data.translations || {};
}

async function translateDocument(lang = currentLanguage) {
  if (typeof document === "undefined" || translating) return;
  translating = true;
  try {
    const body = document.body;
    if (!body) return;
    if (lang === "fr") {
      restore(body);
      return;
    }
    const { pending, cache } = collect(body, lang);
    if (pending.length === 0) return;
    const translated = await requestTranslations(lang, pending);
    const nextCache = { ...cache, ...translated };
    setCache(lang, nextCache);
    collect(body, lang);
  } finally {
    translating = false;
  }
}

function scheduleTranslate() {
  if (queued) return;
  queued = true;
  window.setTimeout(() => {
    queued = false;
    void translateDocument();
  }, 80);
}

export function applyAppLanguage(code?: string | null) {
  if (typeof document === "undefined") return;
  const lang = APP_LANGUAGES.find((l) => l.code === code)?.code || "fr";
  const meta = APP_LANGUAGES.find((l) => l.code === lang);
  currentLanguage = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = meta?.rtl ? "rtl" : "ltr";
  void translateDocument(lang);
}

export function startAppTranslation() {
  if (typeof document === "undefined") return () => undefined;
  applyAppLanguage(readPersonalization().language || "fr");
  if (!observer) {
    observer = new MutationObserver(() => scheduleTranslate());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRS],
    });
  }
  return () => {
    observer?.disconnect();
    observer = null;
  };
}