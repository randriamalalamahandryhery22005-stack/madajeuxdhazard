import { useEffect, useState } from "react";
import { Download, X, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AppUpdate { id: string; title: string; update_url: string; }

const DISMISS_KEY = "dismissed_optional_update_v1";
const INSTALLED_KEY = "installed_app_update_v1";

const OptionalUpdateBanner = () => {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(() => localStorage.getItem(DISMISS_KEY));
  const [installedId, setInstalledId] = useState<string | null>(() => localStorage.getItem(INSTALLED_KEY));
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchLatest = async () => {
      const { data } = await supabase
        .from("app_updates")
        .select("id, title, update_url")
        .order("created_at", { ascending: false })
        .limit(1);
      setUpdate(data?.[0] || null);
    };
    fetchLatest();
    const ch = supabase
      .channel("optional-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_updates" }, fetchLatest)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (!update || dismissedId === update.id || installedId === update.id) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, update.id);
    setDismissedId(update.id);
  };

  const install = async () => {
    setInstalling(true);
    setProgress(0);
    for (let i = 1; i <= 100; i++) {
      await new Promise((r) => setTimeout(r, 12));
      setProgress(i);
    }
    localStorage.setItem(INSTALLED_KEY, update.id);
    setInstalledId(update.id);
    setInstalling(false);
    toast.success("Application mise à jour");
  };

  return (
    <div className="relative mx-3 sm:mx-5 mt-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-fuchsia-500/10 to-primary/15 backdrop-blur-sm p-3 flex items-center gap-2 sm:gap-3 shadow-lg shadow-primary/10 animate-blur-in">
      <div className="w-10 h-10 rounded-xl violet-gradient flex items-center justify-center flex-shrink-0 shadow-md">
        {installing ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Sparkles className="w-5 h-5 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold violet-text truncate">{update.title}</p>
        {installing ? (
          <div className="mt-1 h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
            <div className="h-full violet-gradient" style={{ width: `${progress}%` }} />
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">Nouvelle version disponible — installation in-app</p>
        )}
      </div>
      {!installing && (
        <button onClick={install}
          className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl violet-gradient text-white text-[11px] font-bold shadow-md active:scale-95 transition-transform">
          <Download className="w-3.5 h-3.5" /> Installer
        </button>
      )}
      {!installing && (
        <button onClick={dismiss} className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-secondary/60 flex items-center justify-center text-muted-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default OptionalUpdateBanner;
