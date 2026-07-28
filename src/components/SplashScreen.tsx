import { useState, useEffect, useRef, useCallback } from "react";
import jhLogo from "@/assets/jh-logo.png";
import splashTheme from "@/assets/splash-theme-v5.mp3.asset.json";
import welcomeTheme from "@/assets/welcome-theme-v5.mp3.asset.json";

interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * Splash luxe "Jeux d'Hazard" — Émeraude Prestige.
 * Bande sonore de 14 s, animations calées exactement sur la musique.
 */
const SPLASH_DURATION_MS = 13885;
const FADE_OUT_MS = 3500;

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const doneRef = useRef(false);
  const rafRef = useRef(0);
  const startedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeStartedRef = useRef(false);

  const steps = [
    "Initialisation du salon",
    "Authentification sécurisée",
    "Synchronisation temps réel",
    "Analyse des tendances",
    "Préparation de l'interface",
    "Prêt à jouer",
  ];

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    const el = audioRef.current;
    if (el) {
      try {
        el.volume = 0;
        el.pause();
      } catch {
        /* noop */
      }
    }
    setTimeout(() => onComplete(), 400);
  }, [onComplete]);

  // Timeline animée — démarre en même temps que la musique.
  const startTimeline = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const startedAt = performance.now();
    const tick = (t: number) => {
      const elapsed = t - startedAt;
      const p = Math.min(100, (elapsed / SPLASH_DURATION_MS) * 100);
      setProgress(p);
      setStepIdx(Math.min(steps.length - 1, Math.floor((p / 100) * steps.length)));
      // Fondu de sortie progressif (équi-puissance) sur la fin de la piste.
      const el = audioRef.current;
      if (el && !el.muted) {
        const remaining = SPLASH_DURATION_MS - elapsed;
        if (remaining <= FADE_OUT_MS) {
          fadeStartedRef.current = true;
          const k = Math.max(0, Math.min(1, remaining / FADE_OUT_MS));
          el.volume = Math.max(0, Math.sin((k * Math.PI) / 2));
        }
      }
      if (p < 100) rafRef.current = requestAnimationFrame(tick);
      else finish();
    };
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finish]);

  useEffect(() => {
    const el = new Audio(splashTheme.url);
    // Préchargement de la piste de bienvenue pour un enchaînement sans coupure.
    const preloadWelcome = new Audio(welcomeTheme.url);
    preloadWelcome.preload = "auto";
    try { preloadWelcome.load(); } catch { /* noop */ }
    el.preload = "auto";
    el.volume = 1;
    el.setAttribute("playsinline", "");
    audioRef.current = el;

    const onPlaying = () => {
      el.muted = false;
      el.volume = 1;
      startTimeline();
    };
    el.addEventListener("playing", onPlaying);

    const tryPlay = async () => {
      try {
        await el.play();
      } catch {
        // Autoplay bloqué : repli muet (autorisé sur Chrome Android/iOS)
        try {
          el.muted = true;
          await el.play();
        } catch {
          /* attend un geste utilisateur */
        }
      }
    };
    tryPlay();

    const onGesture = () => {
      el.muted = false;
      el.volume = 1;
      el.play().catch(() => {});
      startTimeline();
    };
    const evts: (keyof WindowEventMap)[] = ["pointerdown", "touchstart", "click", "keydown"];
    evts.forEach((e) => window.addEventListener(e, onGesture, { once: true, passive: true } as any));

    // Filet de sécurité : ne jamais bloquer l'utilisateur si l'audio échoue.
    const safety = window.setTimeout(startTimeline, 1500);

    return () => {
      window.clearTimeout(safety);
      cancelAnimationFrame(rafRef.current);
      evts.forEach((e) => window.removeEventListener(e, onGesture));
      el.removeEventListener("playing", onPlaying);
      try {
        el.pause();
      } catch {
        /* noop */
      }
      audioRef.current = null;
    };
  }, [startTimeline]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ${
        leaving ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
      style={{
        background:
          "radial-gradient(1000px 700px at 20% 10%, hsl(152 72% 22% / 0.55), transparent 60%)," +
          "radial-gradient(900px 700px at 100% 100%, hsl(42 82% 45% / 0.28), transparent 60%)," +
          "radial-gradient(700px 500px at 50% 60%, hsl(158 65% 15% / 0.65), transparent 70%)," +
          "linear-gradient(180deg, hsl(158 60% 4%) 0%, hsl(158 55% 6%) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[hsl(152_72%_35%_/_0.35)] blur-3xl animate-aurora" />
      <div className="absolute -bottom-24 -right-16 h-[28rem] w-[28rem] rounded-full bg-[hsl(42_82%_50%_/_0.22)] blur-3xl animate-aurora" style={{ animationDelay: "1.2s" }} />

      <div className="relative z-10 flex flex-col items-center px-8">
        <div className="relative flex items-center justify-center">
          <div
            className="absolute h-56 w-56 rounded-full animate-orbit"
            style={{
              background:
                "conic-gradient(from 0deg, hsl(42 82% 55% / 0), hsl(45 92% 70% / 0.9), hsl(42 82% 55% / 0), hsl(152 72% 45% / 0.55), hsl(42 82% 55% / 0))",
              WebkitMask: "radial-gradient(closest-side, transparent 68%, black 70%)",
              mask: "radial-gradient(closest-side, transparent 68%, black 70%)",
            }}
          />
          <div className="absolute h-40 w-40 rounded-full border border-[hsl(42_82%_55%_/_0.4)] animate-pulse-ring" />
          <div className="absolute h-40 w-40 rounded-full border border-[hsl(152_72%_45%_/_0.45)] animate-pulse-ring" style={{ animationDelay: "0.8s" }} />

          <div
            className="relative h-36 w-36 rounded-3xl overflow-hidden animate-blur-in"
            style={{
              boxShadow:
                "0 30px 80px -20px hsl(42 82% 40% / 0.55), 0 0 0 1px hsl(42 82% 55% / 0.25) inset",
            }}
          >
            <img src={jhLogo} alt="Jeux d'Hazard" className="h-full w-full object-cover" width={512} height={512} />
            <div className="pointer-events-none absolute inset-0 animate-shimmer-sunset" />
          </div>
        </div>

        <div className="mt-10 text-center animate-blur-in" style={{ animationDelay: "0.15s" }}>
          <div className="text-[10px] tracking-[0.55em] font-medium text-[hsl(45_60%_75%_/_0.75)] uppercase mb-2">
            Premium · Casino Édition
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold gold-text leading-none">
            Jeux d'Hazard
          </h1>
          <div className="mt-3 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.4em] text-[hsl(45_50%_82%_/_0.55)]">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[hsl(42_82%_55%_/_0.6)]" />
            Analyses & Prédictions
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-[hsl(42_82%_55%_/_0.6)]" />
          </div>
        </div>

        <div className="mt-12 w-72 max-w-[80vw] animate-blur-in" style={{ animationDelay: "0.3s" }}>
          <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-[hsl(158_45%_12%)]">
            <div
              className="absolute inset-y-0 left-0 rounded-full gold-gradient transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full blur-md opacity-70"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, hsl(42 82% 55%), hsl(45 92% 70%))",
              }}
            />
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] font-mono tracking-widest text-[hsl(45_40%_82%_/_0.7)]">
            <span className="truncate pr-3">{steps[stepIdx]}</span>
            <span className="text-[hsl(42_82%_65%)]">{Math.floor(progress)}%</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] tracking-[0.4em] uppercase text-[hsl(45_30%_75%_/_0.4)]">
        Édition Or · 2026
      </div>
    </div>
  );
};

export default SplashScreen;
