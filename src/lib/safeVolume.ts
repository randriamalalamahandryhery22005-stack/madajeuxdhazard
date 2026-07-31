// Empêche les erreurs `IndexSizeError` lorsqu'une animation calcule un volume
// très légèrement hors de l'intervalle [0, 1] (arrondis en virgule flottante).
if (typeof window !== "undefined" && typeof HTMLMediaElement !== "undefined") {
  const proto = HTMLMediaElement.prototype as unknown as Record<string, unknown>;
  if (!proto.__jhVolumeClamped) {
    const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
    if (desc?.set && desc.get) {
      Object.defineProperty(HTMLMediaElement.prototype, "volume", {
        configurable: true,
        enumerable: desc.enumerable,
        get: desc.get,
        set(value: number) {
          const n = Number(value);
          const safe = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
          desc.set!.call(this, safe);
        },
      });
      proto.__jhVolumeClamped = true;
    }
  }
}

export {};
