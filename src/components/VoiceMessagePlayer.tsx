import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

const BARS = 28;
const seed = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};
const wave = (key: string) => {
  let h = seed(key) || 1;
  return Array.from({ length: BARS }, () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return 0.35 + ((h % 100) / 100) * 0.65;
  });
};

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export default function VoiceMessagePlayer({
  src,
  variant = "them",
  cacheKey,
}: {
  src: string;
  variant?: "me" | "them";
  cacheKey?: string;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);
  const bars = wave(cacheKey || src);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onT = () => setCur(a.currentTime);
    const onD = () => setDur(a.duration || 0);
    const onEnd = () => { setPlaying(false); setCur(0); };
    a.addEventListener("timeupdate", onT);
    a.addEventListener("loadedmetadata", onD);
    a.addEventListener("durationchange", onD);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onT);
      a.removeEventListener("loadedmetadata", onD);
      a.removeEventListener("durationchange", onD);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = ref.current;
    if (!a || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = pct * dur;
    setCur(a.currentTime);
  };

  const progress = dur ? cur / dur : 0;
  const isMe = variant === "me";

  return (
    <div className={`flex items-center gap-2.5 min-w-[200px] max-w-[280px] py-1 pr-1 ${isMe ? "text-white" : "text-slate-100"}`}>
      <audio ref={ref} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition active:scale-95 ${
          isMe ? "bg-white/20 hover:bg-white/25" : "bg-violet-500/80 hover:bg-violet-500"
        }`}
        aria-label={playing ? "Pause" : "Lecture"}
      >
        {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-[1px]" />}
      </button>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div
          onClick={seek}
          className="flex items-end gap-[2px] h-6 cursor-pointer select-none"
        >
          {bars.map((h, i) => {
            const active = i / BARS <= progress;
            return (
              <span
                key={i}
                className={`flex-1 rounded-full transition-colors ${
                  active
                    ? isMe ? "bg-white" : "bg-violet-300"
                    : isMe ? "bg-white/35" : "bg-white/25"
                }`}
                style={{ height: `${h * 100}%`, minHeight: 3 }}
              />
            );
          })}
        </div>
        <div className={`text-[10px] font-mono tabular-nums ${isMe ? "text-white/80" : "text-slate-400"}`}>
          {fmt(playing || cur > 0 ? cur : dur)}
        </div>
      </div>
    </div>
  );
}
