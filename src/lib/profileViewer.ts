/**
 * Profil consultable depuis n'importe quelle section de l'application.
 *
 * N'importe quel composant peut appeler `openUserProfile(userId)` : la fiche
 * s'ouvre via `ProfileViewerRoot`, monté une seule fois à la racine.
 */

const EVENT = "jh:open-profile";

export function openUserProfile(userId?: string | null) {
  if (!userId || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: userId }));
}

export function onOpenUserProfile(handler: (userId: string) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
