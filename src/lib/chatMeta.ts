// Métadonnées des messages du chat global.
// Le contenu stocké peut embarquer, dans des blocs invisibles :
//  - les métadonnées d'édition (message original + horodatage) ;
//  - la liste des pièces jointes supplémentaires (galerie jusqu'à 5 images).
// Cela permet de rester compatible avec le schéma existant de
// `global_chat_messages` (une seule colonne `image_url`).

const PREFIX = "\u2063#";
const MARK_EDIT = `${PREFIX}JHEDIT:`;
const MARK_ATT = `${PREFIX}JHATT:`;

export type ParsedMessage = {
  text: string;
  original: string | null;
  editedAt: string | null;
  attachments: string[];
};

const encode = (value: unknown) => {
  const json = JSON.stringify(value);
  try {
    return btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  } catch {
    return encodeURIComponent(json);
  }
};

const decode = <T,>(raw: string): T | null => {
  try {
    const bin = atob(raw);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw)) as T;
    } catch {
      return null;
    }
  }
};

function readSegment(raw: string, mark: string): string | null {
  const idx = raw.indexOf(mark);
  if (idx === -1) return null;
  const rest = raw.slice(idx + mark.length);
  const next = rest.indexOf(PREFIX);
  return next === -1 ? rest : rest.slice(0, next);
}

/** Construit le contenu à enregistrer pour un message modifié. */
export function buildEditedContent(newText: string, original: string, editedAt = new Date().toISOString()) {
  return `${newText}${MARK_EDIT}${encode({ o: original, t: editedAt })}`;
}

/** Ajoute (ou remplace) le bloc des pièces jointes supplémentaires. */
export function withAttachments(content: string, attachments: string[]) {
  if (!attachments.length) return content;
  return `${content}${MARK_ATT}${encode(attachments)}`;
}

/** Sépare le texte affichable des métadonnées. */
export function parseMessage(content: string | null | undefined): ParsedMessage {
  const raw = content ?? "";
  const idx = raw.indexOf(PREFIX);
  const text = idx === -1 ? raw : raw.slice(0, idx);
  const editRaw = readSegment(raw, MARK_EDIT);
  const attRaw = readSegment(raw, MARK_ATT);
  const meta = editRaw ? decode<{ o?: string; t?: string }>(editRaw) : null;
  const att = attRaw ? decode<string[]>(attRaw) : null;
  return {
    text,
    original: meta?.o ?? null,
    editedAt: meta?.t ?? null,
    attachments: Array.isArray(att) ? att.filter((x) => typeof x === "string") : [],
  };
}

/** Texte brut affichable (sans métadonnées). */
export const plainText = (content: string | null | undefined) => parseMessage(content).text;
