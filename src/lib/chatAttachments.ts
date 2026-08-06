import { uploadWithProgress } from "@/lib/uploadWithProgress";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pièces jointes du chat (salon public et messages privés).
 *
 * Règles produit :
 *  - jusqu'à 5 images dans un même message ;
 *  - un seul fichier par message pour tous les autres types (vidéo, PDF, APK,
 *    audio, archive, document…).
 *
 * Les fichiers sont stockés dans le bucket privé `chat-files`, sous le préfixe
 * `<user_id>/` (imposé par les règles d'accès du stockage). Le nom d'origine est
 * conservé dans le chemin et dans les métadonnées du message.
 */

export const CHAT_BUCKET = "chat-files";
export const MAX_IMAGES_PER_MESSAGE = 5;
export const MAX_FILE_MB = 100;

export type Attachment = {
  path: string;
  name: string;
  size: number;
  type: string;
};

export type AttachmentKind = "image" | "video" | "audio" | "file";

const AUDIO_RX = /\.(webm|ogg|mp3|m4a|wav|aac|flac|opus)(\?|$)/i;
const IMAGE_RX = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|avif)(\?|$)/i;
const VIDEO_RX = /\.(mp4|mov|webm|mkv|m4v|3gp|avi)(\?|$)/i;

/** Type de média déduit du type MIME puis, à défaut, de l'extension. */
export function attachmentKind(att: { path?: string | null; type?: string | null }): AttachmentKind {
  const mime = (att.type || "").toLowerCase();
  const path = att.path || "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (/voice-/i.test(path) && AUDIO_RX.test(path)) return "audio";
  if (IMAGE_RX.test(path)) return "image";
  if (AUDIO_RX.test(path) && !/\.webm(\?|$)/i.test(path)) return "audio";
  if (VIDEO_RX.test(path)) return "video";
  return "file";
}

export const isVoicePath = (path?: string | null) => !!path && /(^|\/)voice-/i.test(path);

/** Nom d'origine encodé dans le chemin : `<uid>/<ts>-<rand>-<nom.ext>`. */
export function fileNameFromPath(p: string) {
  const raw = decodeURIComponent(p.split("/").pop() || p);
  const stripped = raw.replace(/^\d{10,}-[a-z0-9]{4,10}-?/i, "");
  return stripped || raw;
}

export const humanSize = (bytes: number) =>
  bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const sanitizeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "_")
    .slice(-60) || "fichier";

export const isImageFile = (f: File) => f.type.startsWith("image/") || IMAGE_RX.test(f.name);

/**
 * Applique les règles de sélection (5 images max, ou 1 seul autre fichier).
 * Retourne la nouvelle sélection et, le cas échéant, un message d'erreur.
 */
export function mergeSelection(
  current: File[],
  incoming: File[],
): { files: File[]; error: string | null } {
  let error: string | null = null;
  const tooBig = incoming.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
  if (tooBig) {
    return { files: current, error: `« ${tooBig.name} » dépasse la limite de ${MAX_FILE_MB} MB` };
  }

  const all = [...current, ...incoming];
  const allImages = all.every(isImageFile);

  if (allImages) {
    if (all.length > MAX_IMAGES_PER_MESSAGE) {
      error = `${MAX_IMAGES_PER_MESSAGE} images maximum par message`;
      return { files: all.slice(0, MAX_IMAGES_PER_MESSAGE), error };
    }
    return { files: all, error: null };
  }

  // Dès qu'un fichier non-image est présent : un seul fichier par message.
  const lastNonImage = [...incoming].reverse().find((f) => !isImageFile(f));
  if (lastNonImage) {
    if (current.length > 0 || incoming.length > 1) {
      error = "Un seul fichier (vidéo, PDF, APK, document…) par message";
    }
    return { files: [lastNonImage], error };
  }
  return { files: current, error: "Un seul fichier par message avec ce type de fichier" };
}

/** Envoie les fichiers sélectionnés et retourne les métadonnées à enregistrer. */
export async function uploadAttachments(
  userId: string,
  files: File[],
  onProgress?: (percent: number, index: number, total: number) => void,
): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${userId}/${stamp}-${sanitizeName(file.name)}`;
    await uploadWithProgress(CHAT_BUCKET, path, file, {
      contentType: file.type || "application/octet-stream",
      onProgress: (pct) => onProgress?.(pct, i, files.length),
    });
    out.push({
      path,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    });
  }
  return out;
}

/** Envoie un message vocal et retourne sa pièce jointe. */
export async function uploadVoice(
  userId: string,
  blob: Blob,
  onProgress?: (percent: number) => void,
): Promise<Attachment> {
  const path = `${userId}/voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webm`;
  await uploadWithProgress(CHAT_BUCKET, path, blob, {
    contentType: blob.type || "audio/webm",
    onProgress,
  });
  return { path, name: "Message vocal", size: blob.size, type: blob.type || "audio/webm" };
}

/** Normalise la colonne `attachments` (+ compatibilité `image_url` historique). */
export function readAttachments(row: {
  attachments?: unknown;
  image_url?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
}): Attachment[] {
  const raw = Array.isArray(row.attachments) ? (row.attachments as unknown[]) : [];
  const list: Attachment[] = [];
  for (const item of raw) {
    if (item && typeof item === "object" && typeof (item as Attachment).path === "string") {
      const a = item as Attachment;
      list.push({
        path: a.path,
        name: a.name || fileNameFromPath(a.path),
        size: Number(a.size) || 0,
        type: a.type || "",
      });
    }
  }
  const legacy = row.image_url || row.attachment_url;
  if (list.length === 0 && legacy) {
    list.push({
      path: legacy,
      name: row.attachment_name || fileNameFromPath(legacy),
      size: Number(row.attachment_size) || 0,
      type: row.attachment_type || "",
    });
  }
  return list;
}

/** URLs signées (7 jours) pour un lot de chemins du bucket privé. */
export async function signPaths(paths: string[], ttl = 60 * 60 * 24 * 7) {
  const out: Record<string, string> = {};
  const stored = paths.filter((p) => p && !p.startsWith("http"));
  for (const p of paths) if (p?.startsWith("http")) out[p] = p;
  if (stored.length > 0) {
    const { data } = await supabase.storage.from(CHAT_BUCKET).createSignedUrls(stored, ttl);
    for (const item of data || []) {
      if (item.signedUrl && item.path) out[item.path] = item.signedUrl;
    }
  }
  return out;
}
