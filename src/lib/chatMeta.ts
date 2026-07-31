// Métadonnées d'édition des messages du chat global.
// Le contenu modifié embarque le message d'origine et l'horodatage de la
// modification dans un bloc invisible, afin de rester compatible avec le
// schéma existant de `global_chat_messages`.

const MARK = "\u2063#JHEDIT:";

export type ParsedMessage = {
  text: string;
  original: string | null;
  editedAt: string | null;
};

const encode = (value: unknown) => {
  const json = JSON.stringify(value);
  try {
    return btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  } catch {
    return encodeURIComponent(json);
  }
};

const decode = (raw: string): { o?: string; t?: string } | null => {
  try {
    const bin = atob(raw);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
};

/** Construit le contenu à enregistrer pour un message modifié. */
export function buildEditedContent(newText: string, original: string, editedAt = new Date().toISOString()) {
  return `${newText}${MARK}${encode({ o: original, t: editedAt })}`;
}

/** Sépare le texte affichable des métadonnées d'édition. */
export function parseMessage(content: string | null | undefined): ParsedMessage {
  const raw = content ?? "";
  const idx = raw.indexOf(MARK);
  if (idx === -1) return { text: raw, original: null, editedAt: null };
  const text = raw.slice(0, idx);
  const meta = decode(raw.slice(idx + MARK.length));
  return { text, original: meta?.o ?? null, editedAt: meta?.t ?? null };
}

/** Texte brut affichable (sans métadonnées). */
export const plainText = (content: string | null | undefined) => parseMessage(content).text;
