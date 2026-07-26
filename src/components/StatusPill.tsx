import { TONE, type Tone } from "@/lib/statusStyles";
import { CheckCircle2, AlertTriangle, XCircle, Minus } from "lucide-react";

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  neutral: Minus,
} as const;

interface StatusPillProps {
  tone: Tone;
  label: string;
  caption?: string;
  size?: "sm" | "md";
  withIcon?: boolean;
  className?: string;
}

/** Coherent inline status indicator (icon + label + optional caption). */
export const StatusPill = ({
  tone,
  label,
  caption,
  size = "sm",
  withIcon = true,
  className = "",
}: StatusPillProps) => {
  const t = TONE[tone];
  const Icon = ICONS[tone];
  const pad = size === "md" ? "px-2 py-1 text-[11px]" : "px-1.5 py-0.5 text-[9px]";
  const iconSize = size === "md" ? "w-3 h-3" : "w-2.5 h-2.5";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${pad} ${t.text} ${t.bg} ${t.border} ${className}`}
      title={caption}
    >
      {withIcon && <Icon className={`${iconSize} flex-shrink-0`} aria-hidden />}
      <span className="truncate">{label}</span>
    </span>
  );
};

/** Small pulsing dot used for very compact contexts. */
export const StatusDot = ({ tone, className = "" }: { tone: Tone; className?: string }) => {
  const t = TONE[tone];
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${t.dot} ${className}`}
      aria-hidden
    />
  );
};
