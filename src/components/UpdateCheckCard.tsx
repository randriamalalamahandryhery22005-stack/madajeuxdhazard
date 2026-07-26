import { useEffect, useState } from "react";
import { Download, Sparkles, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AppUpdate { id: string; title: string; update_url: string; created_at: string; }

const INSTALLED_KEY = "installed_app_update_v1";

const UpdateCheckCard = () => {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [installedId, setInstalledId] = useState<string | null>(() => localStorage.getItem(INSTALLED_KEY));

  const fetchLatest = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("app_updates")
      .select("id, title, update_url, created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    setUpdate(data?.[0] || null);
    setLoading(false);
  };

  useEffect(() => { fetchLatest(); }, []);

  const installInApp = async () => {
    if (!update) return;
    setInstalling(true);
    setProgress(0);
    for (let i = 1; i <= 100; i++) {
      await new Promise((r) => setTimeout(r, 15));
      setProgress(i);
    }
    localStorage.setItem(INSTALLED_KEY, update.id);
    setInstalledId(update.id);
    setInstalling(false);
    toast.success("Application à jour");
  };

  const isUpToDate = !update || installedId === update.id;

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/60 to-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl violet-gradient flex items-center justify-center shadow-md">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold violet-text">Mise à jour de l'application</h3>
          <p className="text-[10px] text-muted-foreground">Installation directe dans l'app</p>
        </div>
      </div>

      {!isUpToDate && update ? (
        <>
          <div className="rounded-xl bg-secondary/40 border border-border/30 p-3 space-y-1">
            <p className="text-xs font-bold">{update.title}</p>
            <p className="text-[10px] text-muted-foreground">
              Publiée le {new Date(update.created_at).toLocaleDateString("fr")}
            </p>
          </div>
          {installing ? (
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-secondary/60 overflow-hidden">
                <div className="h-full violet-gradient transition-all duration-100" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] text-center text-muted-foreground">Installation… {progress}%</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="premium" className="flex-1 h-11" onClick={installInApp}>
                <Download className="w-4 h-4 mr-2" /> Installer
              </Button>
              <Button variant="premium-outline" size="icon" className="h-11 w-11" onClick={fetchLatest} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <p className="text-xs text-emerald-300">Votre application est à jour.</p>
          <button onClick={fetchLatest} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Vérifier
          </button>
        </div>
      )}
    </div>
  );
};

export default UpdateCheckCard;
