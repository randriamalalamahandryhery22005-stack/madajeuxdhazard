import { useEffect } from "react";
import {
  applyBackground,
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

/**
 * Mounts once at the root: applies the current AI-generated background &
 * palette on mount, re-applies whenever they change, and records navigation
 * history for the Historique panel.
 */
export default function AppPersonalizationRoot() {
  const router = useRouter();

  useEffect(() => {
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
    applyBackground(p.bgUrl);
    syncVideo(p);
    if (p.darkMode === false) document.documentElement.classList.remove("dark");
    else document.documentElement.classList.add("dark");

    const unsub = subscribePersonalization((next) => {
      applyPalette(next.palette);
      applyBackground(next.bgUrl);
      syncVideo(next);
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
