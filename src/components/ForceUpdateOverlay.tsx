import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, X, KeyRound, Home, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AppUpdate {
  id: string;
  title: string;
  update_url: string;
}

const CANCEL_CODE = "admin1234";
const INSTALLED_KEY = "installed_app_update_v1";

const ForceUpdateOverlay = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [cancelCode, setCancelCode] = useState("");
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!user || isAdmin) return;
    fetchUpdate();
    const channel = supabase
      .channel("app-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_updates" }, () => fetchUpdate())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isAdmin]);

  const fetchUpdate = async () => {
    const { data } = await supabase
      .from("app_updates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);
    const latest = data?.[0] || null;
    if (latest && localStorage.getItem(INSTALLED_KEY) === latest.id) {
      setUpdate(null);
    } else {
      setUpdate(latest);
    }
  };

  const handleInstallInApp = async () => {
    if (!update) return;
    setInstalling(true);
    setProgress(0);
    // Simulated in-app install progression
    for (let i = 1; i <= 100; i++) {
      await new Promise((r) => setTimeout(r, 18));
      setProgress(i);
    }
    localStorage.setItem(INSTALLED_KEY, update.id);
    toast.success("Mise à jour installée avec succès");
    setInstalling(false);
    setUpdate(null);
  };

  const handleCancelUpdate = async () => {
    if (cancelCode !== CANCEL_CODE) {
      toast.error("Code incorrect");
      return;
    }
    if (update) {
      await supabase.from("app_updates").update({ is_active: false }).eq("id", update.id);
      setUpdate(null);
      setShowCancelInput(false);
      setCancelCode("");
      toast.success("Mise à jour annulée");
    }
  };

  const handleGoHome = () => {
    setUpdate(null);
    navigate("/games");
  };

  if (!update) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-sm text-center space-y-6" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-2xl violet-gradient flex items-center justify-center shadow-2xl glow-violet">
            {installing ? <Loader2 className="w-10 h-10 text-white animate-spin" /> : <Download className="w-10 h-10 text-white" />}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold violet-text">{update.title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {installing
              ? "Installation en cours, veuillez patienter…"
              : "Une nouvelle version est disponible. Installez-la directement dans l'application."}
          </p>
        </div>

        {installing && (
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-secondary/60 overflow-hidden">
              <div className="h-full violet-gradient transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {!installing && (
          <Button variant="premium" className="w-full h-14 text-base" onClick={handleInstallInApp}>
            <CheckCircle2 className="w-5 h-5 mr-2" /> Installer maintenant
          </Button>
        )}

        {!installing && (
          <Button variant="premium-outline" className="w-full h-12 text-sm" onClick={handleGoHome}>
            <Home className="w-4 h-4 mr-2" /> Plus tard
          </Button>
        )}

        {/* Cancel update section (admin code) */}
        {!installing && !showCancelInput && (
          <button
            onClick={() => setShowCancelInput(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto mt-4"
          >
            <X className="w-3 h-3" /> Annuler la mise à jour
          </button>
        )}

        {!installing && showCancelInput && (
          <div className="space-y-3 mt-4 p-4 rounded-xl bg-secondary/50 border border-border/40">
            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <KeyRound className="w-4 h-4 text-primary" />
              <span className="font-medium">Code d'annulation requis</span>
            </div>
            <Input
              type="password"
              value={cancelCode}
              onChange={(e) => setCancelCode(e.target.value)}
              placeholder="Entrez le code"
              className="h-12 bg-secondary/80 border-border/50 text-center font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleCancelUpdate()}
            />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 h-10 text-xs" onClick={() => { setShowCancelInput(false); setCancelCode(""); }}>
                Retour
              </Button>
              <Button variant="premium" className="flex-1 h-10 text-xs" onClick={handleCancelUpdate}>
                Valider
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForceUpdateOverlay;
