import { useCallback, useEffect, useRef, useState } from "react";
import jhLogo from "@/assets/jh-logo.png";
import welcomeTheme from "@/assets/welcome-theme-v5.mp3.asset.json";

/**
 * Écran d'accueil animé affiché juste après le SplashScreen.
 * Synchronisé sur la bande sonore de bienvenue (~4,7 s) avec fondu de sortie.
 */
const TOTAL_MS = 5000;
const FADE_MS = 700;

interface Props {
  onComplete: () => void;
}

const WelcomeIntro = ({ onComplete }: Props) => {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const startTimeline = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const exitAt = window.setTimeout(() => {
      setLeaving(true);
      const el = audioRef.current;
      if (el) {
        const from = el.volume;
        const t0 = performance.now();
        const fade = (t: number) => {
          const k = Math.min(1, (t - t0) / FADE_MS);
          el.volume = Math.max(0, from * (1 - k));
          if (k < 1) requestAnimationFrame(fade);
          else el.pause();
        };
        requestAnimationFrame(fade);
      }
    }, Math.max(0, TOTAL_MS - FADE_MS));

    const finishAt = window.setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      onComplete();
    }, TOTAL_MS);

    timersRef.current.push(exitAt, finishAt);
  }, [onComplete]);

  useEffect(() => {
    const el = new Audio(welcomeTheme.url);
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

    (async () => {
      try {
        await el.play();
      } catch {
        try {
          el.muted = true;
          await el.play();
        } catch {
          /* geste requis */
        }
      }
    })();

    const onGesture = () => {
      el.muted = false;
      el.volume = 1;
      el.play().catch(() => {});
      startTimeline();
    };
    const evts: (keyof WindowEventMap)[] = ["pointerdown", "touchstart", "click", "keydown"];
    evts.forEach((e) => window.addEventListener(e, onGesture, { once: true, passive: true } as any));

    const safety = window.setTimeout(startTimeline, 1200);

    return () => {
      window.clearTimeout(safety);
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
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
      className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ${
        leaving ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
      style={{
        background:
          "radial-gradient(900px 600px at 50% 30%, hsl(42 82% 45% / 0.28), transparent 65%)," +
          "radial-gradient(700px 500px at 50% 80%, hsl(152 72% 22% / 0.55), transparent 70%)," +
          "linear-gradient(180deg, hsl(158 60% 5%) 0%, hsl(158 55% 7%) 100%)",
      }}
    >
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[hsl(42_82%_50%_/_0.22)] blur-3xl animate-aurora" />
      <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-[hsl(152_72%_35%_/_0.28)] blur-3xl animate-aurora" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 flex flex-col items-center px-8 text-center">
        <div
          className="relative h-32 w-32 rounded-3xl overflow-hidden animate-blur-in"
          style={{
            boxShadow: "0 30px 80px -20px hsl(42 82% 40% / 0.55), 0 0 0 1px hsl(42 82% 55% / 0.3) inset",
          }}
        >
          <img src={jhLogo} alt="Jeux d'Hazard" className="h-full w-full object-cover" />
        </div>

        <h2
          className="mt-8 font-display text-2xl sm:text-3xl font-bold gold-text leading-tight max-w-xs animate-blur-in"
          style={{ animationDelay: "0.25s" }}
        >
          Bienvenue dans l'univers de Jeux d'Hazard.
        </h2>
        <p
          className="mt-3 text-base font-semibold text-[hsl(45_60%_82%)] animate-blur-in"
          style={{ animationDelay: "0.55s" }}
        >
          Bonne chance !
        </p>

        <div
          className="mt-8 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-[hsl(45_50%_82%_/_0.55)] animate-blur-in"
          style={{ animationDelay: "0.85s" }}
        >
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-[hsl(42_82%_55%_/_0.6)]" />
          Édition Or
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-[hsl(42_82%_55%_/_0.6)]" />
        </div>
      </div>
    </div>
  );
};

export default WelcomeIntro;
