// Rend le fond du <body> transparent quand un fond personnalisé (image ou
// vidéo) est actif : sans cela, le dégradé opaque du body masque les couches
// placées derrière (z-index négatif) et le fond choisi reste invisible.

const active = { image: false, video: false };

export function setBackdropActive(kind: "image" | "video", on: boolean) {
  active[kind] = on;
  if (typeof document === "undefined" || !document.body) return;
  if (active.image || active.video) {
    document.body.style.setProperty("background", "transparent", "important");
    document.documentElement.style.setProperty("background", "transparent", "important");
  } else {
    document.body.style.removeProperty("background");
    document.documentElement.style.removeProperty("background");
  }
}
