import { useEffect } from "react";
import {
  applyBackground,
  applyStoredImageBackground,
  applyPalette,
  readPersonalization,
  subscribePersonalization,
  pushHistory,
} from "@/lib/appPersonalization";
import { useRouter } from "@tanstack/react-router";
import {
  applyBackgroundVideo,
  applyStoredVideoBackground,
} from "@/lib/videoBackground";
import { applyBackgroundMusic, applyStoredBackgroundMusic } from "@/lib/backgroundMusic";

/**
 * Mounts once at the root: applies the current AI-generated background &
 * palette on mount, re-applies whenever they change, and records navigation
 * history for the Historique panel.
 */
export default function AppPersonalizationRoot() {
  const router = useRouter();

  useEffect(() => {
    const syncImage = (p: ReturnType<typeof readPersonalization>) => {
      const opts = { opacity: p.bgOpacity ?? 1, blur: p.bgBlur ?? 0 };
      if (p.bgImageSource === "local") void applyStoredImageBackground(opts);
      else applyBackground(p.bgUrl, opts);
    };
    const syncMusic = (p: ReturnType<typeof readPersonalization>) => {
      const opts = { volume: p.bgMusicVolume ?? 0.4, paused: p.bgMusicPaused === true };
      if (p.bgMusicSource === "remote" && p.bgMusicUrl) applyBackgroundMusic(p.bgMusicUrl, opts);
      else if (p.bgMusicSource === "local") void applyStoredBackgroundMusic(opts);
      else applyBackgroundMusic(null);
    };
    const syncVideo = (p: ReturnType<typeof readPersonalization>) => {
      const opts = {
        opacity: p.bgVideoOpacity ?? 1,
        blur: p.bgVideoBlur ?? 0,
        muted: p.bgVideoMuted !== false,
        volume: p.bgVideoVolume ?? 0.7,
        paused: p.bgVideoPaused === true,
      };
      if (p.bgVideoSource === "remote" && p.bgVideoUrl) applyBackgroundVideo(p.bgVideoUrl, opts);
      else if (p.bgVideoSource === "local") void applyStoredVideoBackground(opts);
      else applyBackgroundVideo(null);
    };
    const p = readPersonalization();
    applyPalette(p.palette);
    syncImage(p);
    syncVideo(p);
    syncMusic(p);
    if (p.darkMode === false) document.documentElement.classList.remove("dark");
    else document.documentElement.classList.add("dark");

    const unsub = subscribePersonalization((next) => {
      applyPalette(next.palette);
      syncImage(next);
      syncVideo(next);
      syncMusic(next);
      if (next.darkMode === false) document.documentElement.classList.remove("dark");
      else document.documentElement.classList.add("dark");
    });
    return unsub;
  }, []);

  useEffect(() => {
    const un = router.subscribe("onResolved", ({ toLocation }) => {
      const p = toLocation.pathname;
      if (p && p !== "/") pushHistory(p, document.title);
    });
    return un;
  }, [router]);

  return null;
}
