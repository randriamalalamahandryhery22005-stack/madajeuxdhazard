import { supabase } from "@/integrations/supabase/client";

export const GEN_STORE_BUCKET = "gen-store";

export interface GenStoreItem {
  id: string;
  title: string;
  description: string;
  category: string;
  post_type?: string | null;
  body?: string | null;
  link_url?: string | null;
  file_path: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number;
  mime_type: string | null;
  thumbnail_url: string | null;
  download_count: number;
  created_by?: string | null;
  created_at: string;
}

export const hasFile = (item: Pick<GenStoreItem, "file_path" | "file_url">) =>
  Boolean(item.file_path || item.file_url);

/**
 * Resolve a usable URL for an item's file.
 * Tries the public URL first (works when the bucket is public), then falls back
 * to a fresh signed URL. Stored `file_url` values can expire, so they are used last.
 */
export const resolveFileUrl = async (
  item: Pick<GenStoreItem, "file_path" | "file_url" | "file_name">,
  opts: { download?: boolean } = {},
): Promise<string | null> => {
  const download = opts.download ? item.file_name || true : undefined;

  if (item.file_path) {
    const { data: pub } = supabase.storage
      .from(GEN_STORE_BUCKET)
      .getPublicUrl(item.file_path, download ? { download } : undefined);
    if (pub?.publicUrl) {
      // Verify the object is really publicly reachable before using it.
      const reachable = await headOk(pub.publicUrl);
      if (reachable) return pub.publicUrl;
    }

    const { data: signed } = await supabase.storage
      .from(GEN_STORE_BUCKET)
      .createSignedUrl(item.file_path, 60 * 60 * 24, download ? { download } : undefined);
    if (signed?.signedUrl) return signed.signedUrl;
  }

  return item.file_url ?? null;
};

const headOk = async (url: string) => {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
};

/** Force a real download of any file type, without opening a viewer tab. */
export const downloadItem = async (item: GenStoreItem): Promise<void> => {
  const url = await resolveFileUrl(item, { download: true });
  if (!url) throw new Error("Fichier indisponible");

  const filename = item.file_name || item.title || "fichier";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerAnchor(objectUrl, filename);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch {
    // CORS or network fallback: let the browser handle the URL directly.
    triggerAnchor(url, filename, true);
  }

  // Best-effort counter; never blocks the download.
  try {
    await supabase
      .from("gen_store_items")
      .update({ download_count: (item.download_count || 0) + 1 })
      .eq("id", item.id);
  } catch {
    /* ignore */
  }
};

const triggerAnchor = (href: string, filename: string, newTab = false) => {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  if (newTab) {
    a.target = "_blank";
    a.rel = "noopener";
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
