import { useEffect, useRef, useState } from "react";
import jhLogo from "@/assets/jh-logo.png";
import welcomeMusic from "@/assets/bienvenue.mp3.asset.json";
import { takeWelcomeAudio, fadeAudio } from "@/lib/introAudio";

/**
 * Écran d'accueil animé affiché juste après le SplashScreen.
 * Affiche le logo + message textuel « Bienvenue dans l'univers de Jeux d'Hazard. Bonne chance ! »
 * accompagné d'une musique douce qui s'estompe (fade-out) avant transition.
 *
 * Voix off (optionnelle) : ajoutez un asset `src/assets/welcome-voice.mp3.asset.json`
 * pour qu'elle soit jouée automatiquement par-dessus la musique.
 */

const FALLBACK_TOTAL_MS = 5400; // Repli si la durée réelle est inconnue
const FADE_IN_MS = 900;         // Fondu entrant, en relais du fondu du Splash
const FADE_OUT_MS = 1200;       // Fondu sortant avant la sortie de l'écran
const TAIL_MS = 500;            // Petit silence après la piste

interface Props {
  onComplete: () => void;
  voiceUrl?: string;
}

const WelcomeIntro = ({ onComplete, voiceUrl }: Props) => {
  const [leaving, setLeaving] = useState(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    // Musique de bienvenue : élément préchargé pendant le Splash → démarrage instantané
    const music = takeWelcomeAudio(welcomeMusic.url);
    music.currentTime = 0;
    music.volume = 0;
    musicRef.current = music;

    const timers: number[] = [];

    const startFades = () => {
      // Fondu entrant qui prend le relais du fondu sortant du Splash
      fadeAudio(music, 0.95, FADE_IN_MS);
      const trackMs = Number.isFinite(music.duration) && music.duration > 0
        ? music.duration * 1000
        : FALLBACK_TOTAL_MS;
      const totalMs = Math.max(3200, trackMs + TAIL_MS);
      timers.push(window.setTimeout(() => fadeAudio(music, 0, FADE_OUT_MS), Math.max(0, totalMs - FADE_OUT_MS)));
      timers.push(window.setTimeout(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        setLeaving(true);
        window.setTimeout(() => {
          try { music.pause(); music.src = ""; } catch { /* noop */ }
          try { voiceRef.current?.pause(); if (voiceRef.current) voiceRef.current.src = ""; } catch { /* noop */ }
          onComplete();
        }, 400);
      }, totalMs));
    };

    const begin = () => {
      if (music.readyState >= 1) startFades();
      else music.addEventListener("loadedmetadata", startFades, { once: true });
    };

    const p = music.play();
    if (p && typeof p.then === "function") {
      p.then(begin).catch(() => {
        music.muted = true;
        music.play()
          .then(() => { setTimeout(() => { music.muted = false; }, 0); begin(); })
          .catch(() => { begin(); });
      });
    } else {
      begin();
    }

    // Voix off optionnelle
    if (voiceUrl) {
      const voice = new Audio(voiceUrl);
      voice.preload = "auto";
      voice.volume = 1;
      (voice as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
      voice.setAttribute("playsinline", "");
      voiceRef.current = voice;
      // Petit délai pour laisser la musique poser l'ambiance
      setTimeout(() => { voice.play().catch(() => { /* noop */ }); }, 500);
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      music.removeEventListener("loadedmetadata", startFades);
      try { music.pause(); music.src = ""; } catch { /* noop */ }
      try { voiceRef.current?.pause(); if (voiceRef.current) voiceRef.current.src = ""; } catch { /* noop */ }
    };
  }, [onComplete, voiceUrl]);

  return (
    <div
      className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ${
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
