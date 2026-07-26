import { useEffect, useRef, useState } from "react";
import { Mic, Square, X, Send, Loader2, Play, Pause, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const BARS = 32;

export default function VoiceRecorder({
  onSend,
  disabled,
  onActiveChange,
}: {
  onSend: (blob: Blob, durationMs: number) => Promise<void> | void;
  disabled?: boolean;
  onActiveChange?: (active: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState<{ blob: Blob; url: string; duration: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.15));
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef(0);
  const accumRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  useEffect(() => () => {
    cleanupStream();
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (preview?.url) URL.revokeObjectURL(preview.url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onActiveChange?.(recording || !!preview);
  }, [recording, preview, onActiveChange]);

  const runLevels = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const step = Math.floor(data.length / BARS);
      const next: number[] = [];
      for (let i = 0; i < BARS; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j] || 0;
        next.push(Math.min(1, sum / step / 180 + 0.08));
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const duration = accumRef.current + (Date.now() - startTsRef.current);
        const url = URL.createObjectURL(blob);
        setPreview({ blob, url, duration });
        cleanupStream();
      };
      mediaRef.current = rec;

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      runLevels();

      rec.start(200);
      startTsRef.current = Date.now();
      accumRef.current = 0;
      setElapsed(0);
      setPaused(false);
      setRecording(true);
      if (navigator.vibrate) navigator.vibrate(15);
      timerRef.current = window.setInterval(() => {
        const total = accumRef.current + (Date.now() - startTsRef.current);
        setElapsed(Math.floor(total / 1000));
      }, 200);
    } catch {
      toast.error("Micro indisponible. Autorisez l'accès au microphone.");
    }
  };

  const togglePause = () => {
    const rec = mediaRef.current;
    if (!rec) return;
    if (paused) {
      rec.resume();
      startTsRef.current = Date.now();
      setPaused(false);
    } else {
      rec.pause();
      accumRef.current += Date.now() - startTsRef.current;
      setPaused(true);
    }
  };

  const stop = () => {
    try { mediaRef.current?.stop(); } catch {}
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRecording(false);
    setPaused(false);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const cancel = () => {
    if (recording) {
      try { mediaRef.current?.stop(); } catch {}
      cleanupStream();
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    setRecording(false);
    setPaused(false);
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setCur(0);
    setPlaying(false);
  };

  const rerecord = () => {
    cancel();
    setTimeout(start, 60);
  };

  const send = async () => {
    if (!preview) return;
    setSending(true);
    try {
      await onSend(preview.blob, preview.duration);
      if (preview.url) URL.revokeObjectURL(preview.url);
      setPreview(null);
      setCur(0);
      setPlaying(false);
    } finally {
      setSending(false);
    }
  };

  const togglePreview = () => {
    const a = previewAudioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (preview) {
    const dur = Math.max(1, Math.floor(preview.duration / 1000));
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-400/20 px-2 py-2">
        <button
          onClick={cancel}
          className="w-9 h-9 shrink-0 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 flex items-center justify-center transition"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={togglePreview}
          className="w-9 h-9 shrink-0 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center transition"
          title="Écouter"
        >
          {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-[1px]" />}
        </button>
        <audio
          ref={previewAudioRef}
          src={preview.url}
          onTimeUpdate={(e) => setCur((e.currentTarget as HTMLAudioElement).currentTime)}
          onEnded={() => { setPlaying(false); setCur(0); }}
          className="hidden"
        />
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-end gap-[2px] h-5">
            {levels.map((h, i) => {
              const active = i / BARS <= (cur / dur);
              return (
                <span
                  key={i}
                  className={`flex-1 rounded-full ${active ? "bg-violet-300" : "bg-white/25"}`}
                  style={{ height: `${Math.max(0.2, h) * 100}%`, minHeight: 3 }}
                />
              );
            })}
          </div>
          <span className="text-[10px] font-mono tabular-nums text-white/70">
            {fmt(playing || cur > 0 ? Math.floor(cur) : dur)}
          </span>
        </div>
        <button
          onClick={rerecord}
          className="w-9 h-9 shrink-0 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center transition"
          title="Réenregistrer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={send}
          disabled={sending}
          className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 hover:brightness-110 text-white flex items-center justify-center shadow-lg disabled:opacity-50 active:scale-95 transition"
          title="Envoyer"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0 rounded-2xl bg-rose-500/10 border border-rose-400/30 px-2.5 py-2">
        <span className={`w-2.5 h-2.5 shrink-0 rounded-full bg-rose-400 ${paused ? "" : "animate-pulse"}`} />
        <span className="text-xs text-rose-100 font-mono tabular-nums shrink-0">{fmt(elapsed)}</span>
        <div className="flex-1 min-w-0 flex items-end gap-[2px] h-6 opacity-90">
          {levels.map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-full bg-rose-300"
              style={{ height: `${Math.max(0.15, h) * 100}%`, minHeight: 3 }}
            />
          ))}
        </div>
        <button
          onClick={cancel}
          className="w-8 h-8 shrink-0 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center"
          title="Annuler"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={togglePause}
          className="w-8 h-8 shrink-0 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
          title={paused ? "Reprendre" : "Pause"}
        >
          {paused ? <Play className="w-3.5 h-3.5 fill-current translate-x-[1px]" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
        </button>
        <button
          onClick={stop}
          className="w-9 h-9 shrink-0 rounded-full bg-rose-500 hover:brightness-110 text-white flex items-center justify-center shadow-lg"
          title="Terminer"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={start}
      disabled={disabled}
      className="relative w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-400/25 flex items-center justify-center transition disabled:opacity-40 active:scale-95 group"
      title="Message vocal"
    >
      <span className="absolute inset-0 rounded-2xl bg-emerald-400/20 opacity-0 group-hover:opacity-100 blur-md transition" />
      <Mic className="relative w-4 h-4 text-emerald-300" />
    </button>
  );
}
