import { supabase } from "@/integrations/supabase/client";

/**
 * Upload d'un fichier vers Supabase Storage avec suivi de progression réel.
 * L'API JS ne remonte pas la progression : on passe par XHR sur l'endpoint REST.
 */
export async function uploadWithProgress(
  bucket: string,
  path: string,
  file: Blob,
  opts: {
    contentType?: string;
    upsert?: boolean;
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<void> {
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  // Fallback : SDK classique (sans progression) si on n'a pas les infos REST.
  if (!baseUrl || !apikey || !token) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: opts.contentType || (file as File).type || "application/octet-stream",
      upsert: opts.upsert ?? false,
    });
    if (error) throw error;
    opts.onProgress?.(100);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${baseUrl}/storage/v1/object/${bucket}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    xhr.open("POST", url, true);
    xhr.setRequestHeader("apikey", apikey);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", String(opts.upsert ?? false));
    xhr.setRequestHeader(
      "Content-Type",
      opts.contentType || (file as File).type || "application/octet-stream",
    );
    xhr.setRequestHeader("cache-control", "max-age=31536000");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        opts.onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        opts.onProgress?.(100);
        resolve();
      } else {
        let msg = `Upload échoué (${xhr.status})`;
        try {
          const j = JSON.parse(xhr.responseText);
          msg = j.message || j.error || msg;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Réseau indisponible pendant l'envoi"));
    xhr.onabort = () => reject(new Error("Envoi annulé"));
    opts.signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(file);
  });
}
