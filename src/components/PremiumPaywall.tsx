import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Lock, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumPaywallProps {
  gameName: string;
  /** Optional icon shown in the header */
  icon?: React.ReactNode;
}

/**
 * Standardized "Service indisponible" screen shown when a user tries to
 * access a Premium-gated game without an active subscription.
 * Replaces inline SubscriptionFlow on game pages — subscription is handled
 * exclusively from the /premium menu.
 */
const PremiumPaywall = ({ gameName, icon }: PremiumPaywallProps) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
        <button onClick={() => navigate("/games")} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          {icon} {gameName}
        </h1>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div
          className="w-full max-w-md rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-7 text-center space-y-5 shadow-2xl shadow-primary/20"
          style={{ animation: "fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
        >
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-3xl gold-gradient blur-xl opacity-50" />
            <div className="relative w-20 h-20 rounded-3xl gold-gradient flex items-center justify-center shadow-xl">
              <Lock className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-[10px] font-bold uppercase tracking-widest">
              <AlertCircle className="w-3 h-3" /> Service indisponible
            </span>
            <h2 className="text-2xl font-black gold-text">{gameName}</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Veuillez souscrire à un abonnement Premium pour accéder à cette fonctionnalité.
            </p>
            <p className="text-xs text-muted-foreground">
              Utilisez le menu <span className="text-primary font-semibold">Premium</span> afin de finaliser
              votre abonnement et débloquer l’ensemble des services.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left pt-2">
            {["Aviator complet", "CosmoX", "JetX", "Penalty"].map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-[11px] text-foreground/90 px-2.5 py-2 rounded-lg bg-secondary/40 border border-border/40">
                <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="font-semibold">{s}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-1">
            <Link to="/premium" className="block">
              <Button variant="premium" className="w-full h-12 font-bold">
                <Crown className="w-4 h-4 mr-2" /> Aller au menu Premium <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <button
              onClick={() => navigate("/games")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Retour aux jeux
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumPaywall;