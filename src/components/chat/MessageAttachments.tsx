import { useState } from "react";
import { Download, FileArchive, FileText, Film, Package, File as FileIcon, Play } from "lucide-react";
import VoiceMessagePlayer from "@/components/VoiceMessagePlayer";
import {
  attachmentKind,
  fileNameFromPath,
  humanSize,
  isVoicePath,
  type Attachment,
} from "@/lib/chatAttachments";

/** Icône selon le type de fichier (PDF, APK, archive, document…). */
function FileGlyph({ name, type }: { name: string; type: string }) {
  const n = `${name} ${type}`.toLowerCase();
  if (n.includes("pdf")) return <FileText className="w-5 h-5" />;
  if (n.includes(".apk") || n.includes("android")) return <Package className="w-5 h-5" />;
  if (/zip|rar|7z|tar|gz/.test(n)) return <FileArchive className="w-5 h-5" />;
  if (n.includes("video")) return <Film className="w-5 h-5" />;
  return <FileIcon className="w-5 h-5" />;
}

export default function MessageAttachments({
  attachments,
  urls,
  mine,
  messageId,
}: {
  attachments: Attachment[];
  urls: Record<string, string>;
  mine: boolean;
  messageId: string;
}) {
  const [zoom, setZoom] = useState<string | null>(null);
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => attachmentKind(a) === "image");
  const others = attachments.filter((a) => attachmentKind(a) !== "image");

  const gridCols =
    images.length === 1 ? "grid-cols-1" : images.length === 2 || images.length === 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div className={`grid ${gridCols} gap-1.5`}>
          {images.map((a, i) => {
            const src = urls[a.path];
            const wide = images.length === 1;
            return (
              <button
                key={a.path + i}
                type="button"
                onClick={() => src && setZoom(src)}
                className={`group relative overflow-hidden rounded-xl border border-border/40 bg-muted/40 ${
                  wide ? "max-h-72" : "aspect-square"
                }`}
              >
                {src ? (
                  <img
                    src={src}
                    alt={a.name || "Image"}
                    loading="lazy"
                    className={`w-full ${wide ? "max-h-72 object-contain" : "h-full object-cover"} transition-transform duration-300 group-hover:scale-[1.03]`}
                  />
                ) : (
                  <div className="w-full h-full min-h-24 animate-pulse bg-muted" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {others.map((a, i) => {
        const src = urls[a.path];
        const kind = attachmentKind(a);
        const name = a.name || fileNameFromPath(a.path);

        if (kind === "audio") {
          return src ? (
            <VoiceMessagePlayer
              key={a.path + i}
              src={src}
              variant={mine ? "me" : "them"}
              cacheKey={`${messageId}-${i}`}
            />
          ) : (
            <div key={a.path + i} className="h-10 w-48 rounded-full bg-muted/50 animate-pulse" />
          );
        }

        if (kind === "video") {
          return src ? (
            <video
              key={a.path + i}
              src={src}
              controls
              preload="metadata"
              className="w-full max-h-72 rounded-xl border border-border/40 bg-black/60"
            />
          ) : (
            <div key={a.path + i} className="flex items-center gap-2 rounded-xl border border-border/40 p-3 text-xs">
              <Play className="w-4 h-4" /> Chargement de la vidéo…
            </div>
          );
        }

        return (
          <a
            key={a.path + i}
            href={src || "#"}
            target="_blank"
            rel="noreferrer noopener"
            download={name}
            className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
              mine
                ? "border-primary-foreground/25 bg-primary-foreground/10 hover:bg-primary-foreground/20"
                : "border-border/50 bg-muted/50 hover:bg-muted"
            }`}
          >
            <span className="grid place-items-center w-9 h-9 shrink-0 rounded-lg bg-primary/15 text-primary">
              <FileGlyph name={name} type={a.type} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{name}</span>
              <span className="block text-[10px] opacity-70">
                {a.size ? humanSize(a.size) : "Fichier"}
                {isVoicePath(a.path) ? " · vocal" : ""}
              </span>
            </span>
            <Download className="w-4 h-4 opacity-70" />
          </a>
        );
      })}

      {zoom && (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-background/95 backdrop-blur-xl p-4"
          onClick={() => setZoom(null)}
          role="presentation"
        >
          <img src={zoom} alt="Aperçu" className="max-h-[88vh] max-w-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
