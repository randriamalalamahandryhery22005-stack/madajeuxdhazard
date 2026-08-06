/**
 * Composition automatique des codes USSD Mobile Money.
 *
 * Yas Money  : #111*1*2*<destinataire>*<montant>*2*21#
 * Airtel Money : *436# (menu interactif)
 *
 * Le code est ouvert via une URI `tel:` : sur mobile, le composeur s'ouvre
 * pré-rempli et l'utilisateur saisit directement son code secret.
 */

export const YAS_NUMBER = "0383955105";
export const AIRTEL_NUMBER = "0336756185";

/** Construit le code USSD Yas Money pour un montant donné. */
export const buildYasUssd = (amount: number, recipient = YAS_NUMBER) =>
  `#111*1*2*${recipient}*${Math.round(amount)}*2*21#`;

/** Code USSD Airtel Money (menu guidé). */
export const AIRTEL_USSD = "*436#";

/** Encode un code USSD pour une URI `tel:` (# et * doivent être échappés). */
export const ussdToTelUri = (code: string) =>
  `tel:${code.replace(/#/g, "%23").replace(/\*/g, "%2A")}`;

export const isMobileDevice = () =>
  typeof navigator !== "undefined" &&
  /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

/**
 * Lance l'appel USSD. Retourne false si l'appareil n'est pas un mobile
 * (l'appelant affiche alors le code à composer manuellement).
 */
export const launchUssd = (code: string): boolean => {
  if (typeof window === "undefined") return false;
  const uri = ussdToTelUri(code);
  try {
    const a = document.createElement("a");
    a.href = uri;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
    return isMobileDevice();
  } catch {
    window.location.href = uri;
    return isMobileDevice();
  }
};
