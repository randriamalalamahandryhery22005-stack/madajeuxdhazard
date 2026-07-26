import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, Crown, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, TRIAL_DURATION_MS } from "@/contexts/AuthContext";

/**
 * Global trial UI:
 * - A floating countdown pill visible during the 15-min free trial.
 * - An elegant end-of-trial modal shown once when the trial expires.
 */
const TrialOverlay = () => {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(() => Date.now());
  const [dismissedModal, setDismissedModal] = useState(false);

  const trialStart = profile?.trial_started_at
    ? new Date(profile.trial_started_at).getTime()
    : null;
  const trialEnd = trialStart ? trialStart + TRIAL_DURATION_MS : null;
  const remaining = trialEnd ? Math.max(0, trialEnd - now) : 0;
  const active = !!trialEnd && remaining > 0;
  const justExpired = !!trialEnd && remaining <= 0;

  useEffect(() => {
    if (!trialEnd) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [trialEnd]);

  // Show end-of-trial modal only once per user per session
  useEffect(() => {
    if (!user) return;
    if (!justExpired) return;
    const key = `trial-modal-shown-${user.id}`;
    if (sessionStorage.getItem(key)) setDismissedModal(true);
  }, [user, justExpired]);

  const dismiss = () => {
    if (user) sessionStorage.setItem(`trial-modal-shown-${user.id}`, "1");
    setDismissedModal(true);
  };

  const label = useMemo(() => {
    const m = Math.floor(remaining / 60_000);
    const s = Math.floor((remaining % 60_000) / 1_000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [remaining]);

  const progress = trialEnd
    ? Math.max(0, Math.min(100, (remaining / TRIAL_DURATION_MS) * 100))
    : 0;

  if (!user || isAdmin) return null;
  if (!trialEnd) return null;
  // Hide overlays on the premium page itself
  const onPremium = location.pathname.startsWith("/premium");

  return (
    <>
      {/* Trial runs silently — no banner or countdown during the 15 free minutes */}

      {justExpired && !dismissedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-background/70 backdrop-blur-md animate-fade-in">
          <div
            className="relative w-full max-w-sm rounded-3xl border border-primary/40 bg-gradient-to-br from-card via-card to-primary/10 p-6 shadow-2xl shadow-primary/30"
            style={{ animation: "scale-in 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }}
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-secondary/70 text-muted-foreground"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-3xl gold-gradient blur-2xl opacity-60" />
              <div className="relative w-20 h-20 rounded-3xl gold-gradient flex items-center justify-center shadow-xl">
                <Crown className="w-10 h-10 text-primary-foreground" strokeWidth={2.5} />
              </div>
            </div>

            <div className="mt-4 text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-widest">
                <Sparkles className="w-3 h-3" /> Essai terminé
              </span>
              <h2 className="text-xl font-black gold-text">Votre période d'essai est terminée.</h2>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Nous espérons que vous avez apprécié votre expérience.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Profitez maintenant de la <span className="text-primary font-semibold">Version Premium</span> pour
                débloquer toutes les fonctionnalités, une meilleure précision et les mises à jour exclusives.
              </p>
            </div>

            <div className="mt-5 space-y-2">
              <Button
                variant="premium"
                className="w-full h-12 font-bold"
                onClick={() => { dismiss(); navigate("/premium"); }}
              >
                <Crown className="w-4 h-4 mr-2" /> S'abonner
              </Button>
              <Button
                variant="ghost"
                className="w-full h-10 text-xs text-muted-foreground"
                onClick={dismiss}
              >
                Plus tard
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TrialOverlay;
