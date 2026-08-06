import { Fragment } from "react";

/**
 * Rendu enrichi d'un message : liens cliquables et mentions mises en valeur.
 * Les mentions restent du texte simple (`@Nom`) : le message reste visible par
 * tous les participants du salon.
 */

const URL_RX = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)"'\]])/gi;

export default function RichText({
  text,
  mentionNames,
  onMentionClick,
  className,
}: {
  text: string;
  mentionNames?: string[];
  onMentionClick?: (name: string) => void;
  className?: string;
}) {
  const names = (mentionNames || []).filter(Boolean).sort((a, b) => b.length - a.length);

  const renderMentions = (chunk: string, keyBase: string) => {
    if (names.length === 0) return chunk;
    const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const rx = new RegExp(`@(${escaped.join("|")})`, "gi");
    const out: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(chunk)) !== null) {
      if (m.index > last) out.push(chunk.slice(last, m.index));
      const label = m[0];
      out.push(
        <button
          key={`${keyBase}-m-${m.index}`}
          type="button"
          onClick={() => onMentionClick?.(m![1])}
          className="font-semibold text-primary underline-offset-2 hover:underline"
        >
          {label}
        </button>,
      );
      last = m.index + label.length;
    }
    if (last < chunk.length) out.push(chunk.slice(last));
    return out;
  };

  const parts = text.split(URL_RX);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const href = part.startsWith("http") ? part : `https://${part}`;
          return (
            <a
              key={`u-${i}`}
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2 break-all font-medium opacity-95 hover:opacity-100"
            >
              {part}
            </a>
          );
        }
        return <Fragment key={`t-${i}`}>{renderMentions(part, `t-${i}`)}</Fragment>;
      })}
    </span>
  );
}
