import { useState, useEffect, useRef } from "react";
import jhLogo from "@/assets/jh-logo.png";
import splashTheme from "@/assets/splash-screen.mp3.asset.json";
import welcomeTheme from "@/assets/bienvenue.mp3.asset.json";
import { preloadWelcomeAudio } from "@/lib/introAudio";

interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * Splash luxe "Jeux d'Hazard" — Émeraude Prestige
 * Anneau conique doré tournant, halo pulsé, monogramme JH, barre de progression fine.
 * Synchronisé sur la bande sonore (13s).
 */
const SPLASH_DURATION_MS = 13800;
const FADE_OUT_MS = 4500; // fondu sonore progressif en fin de splash

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [needsTap, setNeedsTap] = useState(false);
  const doneRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);
  const rafRef = useRef(0);
  const fallbackTimerRef = useRef<number | null>(null);

  const steps = [
    "Initialisation du salon",
    "Authentification sécurisée",
    "Synchronisation temps réel",
    "Analyse des tendances",
    "Préparation de l'interface",
    "Prêt à jouer",
  ];

  useEffect(() => {
    // Précharge la musique de bienvenue pour un enchaînement sans coupure
    preloadWelcomeAudio(welcomeTheme.url);
    // Élément audio compatible iOS Safari + Android Chrome
    const audio = new Audio();
    audio.src = splashTheme.url;
    audio.preload = "auto";
    audio.volume = 1;
    // Attributs iOS: lecture inline, pas en plein écran
    (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");
    audio.setAttribute("x-webkit-airplay", "deny");
    audioRef.current = audio;

    const totalMs = SPLASH_DURATION_MS;

    const unmuteToFull = () => {
      // Restaure le volume à 100% une fois la lecture réellement démarrée
      try {
        audio.muted = false;
        audio.volume = 1;
      } catch { /* noop */ }
    };

    const startTimer = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      setNeedsTap(false);
      const startedAt = performance.now();
      // Fondu sortant progressif de 5 s avant la fin du splash
      let fadeStartedAt = 0;
      let fadeBaseVol = 1;
      const tick = (t: number) => {
        const elapsed = t - startedAt;
        const p = Math.min(100, (elapsed / totalMs) * 100);
        setProgress(p);
        setStepIdx(Math.min(steps.length - 1, Math.floor((p / 100) * steps.length)));
        if (elapsed >= totalMs - FADE_OUT_MS) {
          if (!fadeStartedAt) {
            fadeStartedAt = t;
            fadeBaseVol = audio.volume || 1;
          }
          const fp = Math.min(1, (t - fadeStartedAt) / FADE_OUT_MS);
          // Courbe équi-puissance : décroissance perçue comme naturelle
          const gain = Math.cos((fp * Math.PI) / 2);
          try { audio.volume = Math.max(0, fadeBaseVol * gain); } catch { /* noop */ }
        }
        if (p < 100) {
          rafRef.current = requestAnimationFrame(tick);
        } else if (!doneRef.current) {
          doneRef.current = true;
          setLeaving(true);
          try { audio.volume = 0; } catch { /* noop */ }
          setTimeout(() => {
            try {
              audio.pause();
              audio.src = "";
            } catch { /* noop */ }
            onComplete();
          }, 300);
        }

      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const cleanupGestureListeners = () => {
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("touchstart", onGesture, true);
      window.removeEventListener("touchend", onGesture, true);
      window.removeEventListener("click", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };

    function onGesture() {
      audio.muted = false;
      audio.volume = 1;
      audio
        .play()
        .then(() => {
          cleanupGestureListeners();
          unmuteToFull();
          startTimer();
        })
        .catch(() => { /* l'utilisateur peut réessayer */ });
    }

    function onVisibility() {
      if (document.visibilityState === "visible" && !startedRef.current) {
        audio.play().then(() => { unmuteToFull(); startTimer(); }).catch(() => { /* noop */ });
      }
    }

    const armGestureFallback = () => {
      setNeedsTap(true);
      window.addEventListener("pointerdown", onGesture, true);
      window.addEventListener("touchstart", onGesture, { capture: true, passive: true });
      window.addEventListener("touchend", onGesture, { capture: true, passive: true });
      window.addEventListener("click", onGesture, true);
      window.addEventListener("keydown", onGesture, true);
      document.addEventListener("visibilitychange", onVisibility);
      // Sécurité: si l'utilisateur n'interagit jamais, on démarre quand même
      // l'animation après 2s pour ne pas bloquer l'application.
      fallbackTimerRef.current = window.setTimeout(() => {
        if (!startedRef.current) startTimer();
      }, 2000);
    };

    // Démarre le timer dès que la lecture est effectivement en cours
    const onPlaying = () => { unmuteToFull(); startTimer(); };
    audio.addEventListener("playing", onPlaying);

    // Stratégie autoplay multi-plateforme:
    // 1) Tentative en son plein (fonctionne si le site a déjà une interaction / PWA)
    // 2) Si bloqué, on tente en muet (autorisé partout) puis on démonte le mute
    //    après le premier événement "playing". Android Chrome autorise ce chemin.
    // 3) Si même le muet est refusé, on arme le fallback geste utilisateur.
    const tryMutedAutoplay = () => {
      audio.muted = true;
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          // Démonte le mute très vite pour retrouver le son à 100%
          setTimeout(unmuteToFull, 0);
        }).catch(() => {
          armGestureFallback();
        });
      }
    };

    const attempt = audio.play();
    if (attempt && typeof attempt.then === "function") {
      attempt
        .then(() => {
          unmuteToFull();
        })
        .catch(() => {
          tryMutedAutoplay();
        });
    } else {
      startTimer();
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
      cleanupGestureListeners();
      audio.removeEventListener("playing", onPlaying);
      try {
        audio.pause();
        audio.src = "";
      } catch { /* noop */ }
    };
  }, [onComplete]);

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
      {/* Grain overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Aurora blobs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[hsl(152_72%_35%_/_0.35)] blur-3xl animate-aurora" />
      <div className="absolute -bottom-24 -right-16 h-[28rem] w-[28rem] rounded-full bg-[hsl(42_82%_50%_/_0.22)] blur-3xl animate-aurora" style={{ animationDelay: "1.2s" }} />

      {/* Logo cluster */}
      <div className="relative z-10 flex flex-col items-center px-8">
        <div className="relative flex items-center justify-center">
          {/* Conic gold ring */}
          <div
            className="absolute h-56 w-56 rounded-full animate-orbit"
            style={{
              background:
                "conic-gradient(from 0deg, hsl(42 82% 55% / 0), hsl(45 92% 70% / 0.9), hsl(42 82% 55% / 0), hsl(152 72% 45% / 0.55), hsl(42 82% 55% / 0))",
              WebkitMask: "radial-gradient(closest-side, transparent 68%, black 70%)",
              mask: "radial-gradient(closest-side, transparent 68%, black 70%)",
            }}
          />
          {/* Pulse rings */}
          <div className="absolute h-40 w-40 rounded-full border border-[hsl(42_82%_55%_/_0.4)] animate-pulse-ring" />
          <div className="absolute h-40 w-40 rounded-full border border-[hsl(152_72%_45%_/_0.45)] animate-pulse-ring" style={{ animationDelay: "0.8s" }} />

          {/* Logo card */}
          <div
            className="relative h-36 w-36 rounded-3xl overflow-hidden animate-blur-in"
            style={{
              boxShadow:
                "0 30px 80px -20px hsl(42 82% 40% / 0.55), 0 0 0 1px hsl(42 82% 55% / 0.25) inset",
            }}
          >
            <img
              src={jhLogo}
              alt="Jeux d'Hazard"
              className="h-full w-full object-cover"
              width={512}
              height={512}
            />
            {/* Shimmer sheen */}
            <div className="pointer-events-none absolute inset-0 animate-shimmer-sunset" />
          </div>
        </div>

        {/* Wordmark */}
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

        {/* Progress */}
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

      {/* Bottom mark */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] tracking-[0.4em] uppercase text-[hsl(45_30%_75%_/_0.4)]">
        Édition Or · 2026
      </div>

      {/* Overlay iOS: autoplay bloqué — invite à toucher l'écran */}
      {needsTap && (
        <div className="absolute inset-0 z-20 flex items-end justify-center pb-24 pointer-events-none animate-blur-in">
          <div className="pointer-events-auto px-5 py-3 rounded-full bg-black/40 backdrop-blur border border-[hsl(var(--gold)/0.4)] text-[11px] uppercase tracking-[0.35em] text-[hsl(45_60%_82%)] shadow-lg">
            Touchez pour activer le son
          </div>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
