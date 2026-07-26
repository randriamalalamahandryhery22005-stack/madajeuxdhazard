import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TutorialStep {
  /** narration in French */
  narration: string;
  /** typed time value (HH:MM) shown progressively */
  time?: string;
  /** typed coefficient value shown progressively */
  coeff?: string;
  /** if true, triggers the result animation */
  reveal?: boolean;
  /** sample predicted coefficient shown when reveal=true */
  predicted?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  steps: TutorialStep[];
  accent?: "gold" | "emerald" | "amber" | "blue";
}

const accentMap = {
  gold:    { ring: "border-primary/40", btn: "bg-primary text-primary-foreground", glow: "shadow-primary/30", text: "text-primary" },
  emerald: { ring: "border-emerald-500/40", btn: "bg-emerald-500 text-white", glow: "shadow-emerald-500/30", text: "text-emerald-400" },
  amber:   { ring: "border-amber-500/40", btn: "bg-amber-500 text-white", glow: "shadow-amber-500/30", text: "text-amber-400" },
  blue:    { ring: "border-emerald-500/40", btn: "bg-emerald-500 text-white", glow: "shadow-emerald-500/30", text: "text-emerald-400" },
};

const cache = new Map<string, string>(); // narration -> base64 audio

const InteractiveTutorialPlayer = ({ title, subtitle, steps, accent = "gold" }: Props) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [typedTime, setTypedTime] = useState("");
  const [typedCoeff, setTypedCoeff] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [predictedValue, setPredictedValue] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelRef = useRef(false);
  const a = accentMap[accent];

  const reset = () => {
    cancelRef.current = true;
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
    setLoadingAudio(false);
    setStepIdx(0);
    setTypedTime("");
    setTypedCoeff("");
    setShowResult(false);
    setPredictedValue(null);
  };

  const fetchAudio = async (text: string): Promise<string | null> => {
    if (cache.has(text)) return cache.get(text)!;
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
        body: { text },
      });
      if (error) throw error;
      const audioContent = (data as any)?.audioContent;
      if (!audioContent) throw new Error("No audio");
      cache.set(text, audioContent);
      return audioContent;
    } catch (e: any) {
      toast.error("Voix indisponible : " + (e?.message || "erreur"));
      return null;
    }
  };

  const typeText = async (
    full: string,
    setter: (v: string) => void,
    speedMs = 80,
  ) => {
    for (let i = 1; i <= full.length; i++) {
      if (cancelRef.current) return;
      setter(full.slice(0, i));
      await new Promise((r) => setTimeout(r, speedMs));
    }
  };

  const playStep = async (idx: number) => {
    if (idx >= steps.length) {
      setIsPlaying(false);
      return;
    }
    const step = steps[idx];
    setStepIdx(idx);

    setLoadingAudio(true);
    const audioB64 = await fetchAudio(step.narration);
    setLoadingAudio(false);
    if (cancelRef.current) return;

    let audioPromise: Promise<void> = Promise.resolve();
    if (audioB64) {
      const audio = new Audio(`data:audio/mpeg;base64,${audioB64}`);
      audioRef.current = audio;
      audioPromise = new Promise((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    }

    // Run animations in parallel with audio
    const animations: Promise<void>[] = [];
    if (step.time) {
      setTypedTime("");
      animations.push(typeText(step.time, setTypedTime, 110));
    }
    if (step.coeff) {
      setTypedCoeff("");
      animations.push(typeText(step.coeff, setTypedCoeff, 140));
    }
    if (step.reveal) {
      animations.push(
        new Promise<void>(async (resolve) => {
          await new Promise((r) => setTimeout(r, 600));
          if (cancelRef.current) return resolve();
          setShowResult(true);
          setPredictedValue(step.predicted || "2.45x");
          resolve();
        }),
      );
    }

    await Promise.all([audioPromise, ...animations]);
    if (cancelRef.current) return;

    // Small pause between steps
    await new Promise((r) => setTimeout(r, 400));
    if (cancelRef.current) return;

    playStep(idx + 1);
  };

  const start = () => {
    cancelRef.current = false;
    reset();
    cancelRef.current = false;
    setIsPlaying(true);
    playStep(0);
  };

  const pause = () => {
    cancelRef.current = true;
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  useEffect(() => () => { cancelRef.current = true; audioRef.current?.pause(); }, []);

  return (
    <div className={`rounded-2xl border-2 ${a.ring} bg-gradient-to-b from-card/95 to-secondary/40 p-4 space-y-4 shadow-lg ${a.glow}`}>
      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className={`text-sm font-bold ${a.text} flex items-center gap-1.5`}>
            <Sparkles className="w-4 h-4" /> {title}
          </h3>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground bg-secondary/60 px-2 py-1 rounded-full">
          <Volume2 className="w-2.5 h-2.5" /> FR
        </div>
      </div>

      {/* Mock predictor screen */}
      <div className="rounded-xl bg-background/70 border border-border/40 p-4 space-y-3 min-h-[180px]">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-[8px] uppercase tracking-wider text-muted-foreground">Heure</p>
            <div className="h-10 rounded-lg bg-secondary/80 border border-border/40 flex items-center justify-center font-mono text-base">
              {typedTime || <span className="text-muted-foreground/40">--:--</span>}
              <span className={`ml-0.5 w-0.5 h-4 ${isPlaying && stepIdx < steps.length && steps[stepIdx]?.time ? "bg-primary animate-pulse" : "bg-transparent"}`} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[8px] uppercase tracking-wider text-muted-foreground">Coefficient</p>
            <div className="h-10 rounded-lg bg-secondary/80 border border-border/40 flex items-center justify-center font-mono text-base">
              {typedCoeff || <span className="text-muted-foreground/40">0.00</span>}
              <span className={`ml-0.5 w-0.5 h-4 ${isPlaying && stepIdx < steps.length && steps[stepIdx]?.coeff ? "bg-primary animate-pulse" : "bg-transparent"}`} />
            </div>
          </div>
        </div>

        {/* Result animation */}
        <div className={`rounded-xl border transition-all duration-500 overflow-hidden ${showResult ? `${a.ring} bg-gradient-to-br from-secondary/60 to-card opacity-100 max-h-32` : "border-transparent opacity-0 max-h-0"}`}>
          <div className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Prédiction</p>
              <p className={`text-2xl font-black ${a.text} font-mono`} style={{ animation: showResult ? "fade-up 0.4s ease forwards" : undefined }}>
                {predictedValue || "—"}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Fiable
            </div>
          </div>
        </div>
      </div>

      {/* Narration */}
      <div className="min-h-[44px] flex items-start gap-2 text-xs text-muted-foreground italic leading-relaxed">
        {loadingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary mt-0.5 flex-shrink-0" /> : <Volume2 className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isPlaying ? a.text : "text-muted-foreground/50"}`} />}
        <p>{isPlaying || stepIdx > 0 ? steps[Math.min(stepIdx, steps.length - 1)]?.narration : "Cliquez sur Démarrer pour lancer le tutoriel narré en français."}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <Button onClick={start} className={`flex-1 h-10 ${a.btn} font-semibold`}>
            <Play className="w-4 h-4 mr-1.5" /> {stepIdx > 0 && stepIdx >= steps.length - 1 ? "Rejouer" : "Démarrer"}
          </Button>
        ) : (
          <Button onClick={pause} variant="secondary" className="flex-1 h-10">
            <Pause className="w-4 h-4 mr-1.5" /> Pause
          </Button>
        )}
        <Button onClick={reset} variant="outline" size="icon" className="h-10 w-10" title="Réinitialiser">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < stepIdx ? a.btn : i === stepIdx && isPlaying ? `${a.btn} animate-pulse` : "bg-secondary"}`} />
        ))}
      </div>
    </div>
  );
};

export default InteractiveTutorialPlayer;
