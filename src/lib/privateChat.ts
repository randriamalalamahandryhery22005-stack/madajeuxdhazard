/**
 * Petit bus d'événements permettant d'ouvrir le chat privé (et éventuellement
 * une conversation précise) depuis n'importe quel endroit de l'application,
 * par exemple au clic sur une notification temps réel.
 */
const EVENT = "jh:open-private-chat";

export function openPrivateChat(conversationId?: string | null) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { conversationId: conversationId ?? null } }));
}

export function onOpenPrivateChat(handler: (conversationId: string | null) => void) {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<{ conversationId: string | null }>).detail;
    handler(detail?.conversationId ?? null);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
