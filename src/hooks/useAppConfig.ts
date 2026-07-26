import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppConfig {
  theme?: { primary?: string; background?: string; accent?: string; radius?: string };
  home?: {
    hero?: { title?: string; subtitle?: string; ctaLabel?: string; ctaHref?: string };
    banners?: Array<{ id: string; type?: "info" | "success" | "warning"; title?: string; message?: string; dismissible?: boolean }>;
    sections?: Array<
      | { id: string; kind: "cards"; title?: string; items?: Array<{ title?: string; description?: string; icon?: string; href?: string }> }
      | { id: string; kind: "text"; title?: string; body?: string }
    >;
  };
  games?: {
    highlightedSlugs?: string[];
    labels?: Record<string, string>;
    descriptions?: Record<string, string>;
  };
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>({});
  const [version, setVersion] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("app_config")
      .select("config, version")
      .eq("is_active", true)
      .maybeSingle();
    if (data) {
      setConfig((data.config as AppConfig) || {});
      setVersion(data.version);
      applyTheme((data.config as AppConfig)?.theme);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("app-config-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_config" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return { config, version, loading, reload: load };
}

function applyTheme(theme?: AppConfig["theme"]) {
  if (!theme) return;
  const root = document.documentElement;
  if (theme.primary) root.style.setProperty("--primary", theme.primary);
  if (theme.background) root.style.setProperty("--background", theme.background);
  if (theme.accent) root.style.setProperty("--accent", theme.accent);
  if (theme.radius) root.style.setProperty("--radius", theme.radius);
}
