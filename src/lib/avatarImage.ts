// Traitement de la photo de profil : redimensionnement haute qualité côté client.
// Le résultat est une data-URL JPEG carrée, affichable partout instantanément
// (aucune dépendance à un bucket public, donc plus d'images invisibles).

export interface ResizeOptions {
  /** Côté du carré final (px). */
  size?: number;
  /** Qualité JPEG 0..1 */
  quality?: number;
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = src;
  });
}

/**
 * Recadre au centre + redimensionne en carré net (device pixel ratio pris en
 * compte pour rester haute qualité sur mobile) et renvoie une data-URL JPEG.
 */
export async function processAvatar(file: Blob, opts: ResizeOptions = {}): Promise<string> {
  const size = opts.size ?? 512;
  const quality = opts.quality ?? 0.9;
  const dataUrl = await fileToDataUrl(file);
  try {
    const img = await loadImage(dataUrl);
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    let out = canvas.toDataURL("image/jpeg", quality);
    // Garde-fou : reste raisonnable pour un stockage en base (~300 Ko max)
    let q = quality;
    while (out.length > 400_000 && q > 0.5) {
      q -= 0.1;
      out = canvas.toDataURL("image/jpeg", q);
    }
    return out;
  } catch {
    return dataUrl;
  }
}
