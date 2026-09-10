import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Sparkles, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "info_modal_seen_session";

const InfoModal = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    let cancelled = false;
    (async () => {
      // Admins et abonnés actifs ne voient PAS le modal Basique.
      if (isAdmin) {
        sessionStorage.setItem(STORAGE_KEY, "1");
        return;
      }
      const { data } = await supabase
        .from("game_access")
        .select("expires_at,is_active")
        .eq("user_id", user.id)
        .eq("is_active", true);
      const hasActiveSub = (data || []).some(
        (a) => !a.expires_at || new Date(a.expires_at) > new Date()
      );
      if (hasActiveSub) {
        sessionStorage.setItem(STORAGE_KEY, "1");
        return;
      }
      if (!cancelled) {
        setTimeout(() => !cancelled && setOpen(true), 600);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  const close = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const goBasic = () => {
    close();
    navigate("/aviator/basic");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/70 backdrop-blur-md px-4 pb-6 pt-10"
      style={{ animation: "fade-up 0.3s ease forwards" }}
      onClick={close}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-2xl shadow-primary/20"
        style={{ animation: "fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Fermer"
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center shadow-lg shadow-primary/30">
            <Info className="w-6 h-6 text-primary-foreground" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-card animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Informations</p>
            <h2 className="text-lg font-black tracking-tight">Bienvenue 👋</h2>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <p className="text-sm text-foreground/90 leading-relaxed">
            Découvrez le <span className="gold-text font-bold">Mode Basique Aviator</span> — accès libre et limité à
            <span className="text-primary font-bold"> 10 prédictions par jour</span>.
          </p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>2 résultats fiables par prédiction</span>
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>Coefficients entre 3,00x et 10,00x</span>
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>Algorithme professionnel et précis</span>
            </li>
          </ul>
        </div>

        <Button variant="premium" className="w-full h-12 font-bold" onClick={goBasic}>
          <Play className="w-4 h-4 mr-2" /> Accéder au Mode Basique
        </Button>
        <button
          onClick={close}
          className="block mx-auto mt-3 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
};

export default InfoModal;