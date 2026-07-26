import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook for real-time synchronization across the app.
 * Listens to key tables and triggers callbacks on changes.
 */
export function useRealtimeSync(callbacks?: {
  onGameAccessChange?: () => void;
  onSettingsChange?: () => void;
  onPredictionChange?: () => void;
}) {
  useEffect(() => {
    const ch = supabase
      .channel("app-realtime-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_access" }, () => {
        callbacks?.onGameAccessChange?.();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => {
        callbacks?.onSettingsChange?.();
        toast.info("Paramètres mis à jour", { description: "L'application a été synchronisée." });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, () => {
        callbacks?.onPredictionChange?.();
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [callbacks?.onGameAccessChange, callbacks?.onSettingsChange, callbacks?.onPredictionChange]);
}
