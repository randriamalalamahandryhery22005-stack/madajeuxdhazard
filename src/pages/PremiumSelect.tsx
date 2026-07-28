import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Sparkles, Clock, CalendarDays, BarChart3, TrendingUp, ShieldCheck, Zap, RefreshCw, Infinity as InfinityIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumAccess } from "@/lib/premiumAccess";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";

/**
 * Tableau de bord Premium (remplace l'ancienne page "Choisissez un jeu").
 * Affiche le statut d'abonnement, les jours restants, les statistiques d'utilisation
 * et un accès rapide aux moteurs de prédiction premium.
 */
const PremiumSelect = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const access = usePremiumAccess();
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const sinceToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const [{ count: total }, { count: today }, { count: week }] = await Promise.all([
        supabase.from("prediction_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("prediction_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", sinceToday),
        supabase.from("prediction_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since7),
      ]);
      setStats({ total: total || 0, today: today || 0, week: week || 0 });
    })();
  }, [user]);

  if (!user) { navigate("/login"); return null; }

  const daysLeft = access.expiresAt
    ? Math.max(0, Math.ceil((new Date(access.expiresAt).getTime() - Date.now()) / 86400000))
    : null;

  // Ring math (jours restants /31)
  const ringMax = 31;
  const ringPct = access.isLifetime ? 100 : daysLeft !== null ? Math.min(100, (daysLeft / ringMax) * 100) : 0;
  const r = 52, circ = 2 * Math.PI * r;
  const offset = circ - (ringPct / 100) * circ;

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      {/* Header */}
      <header className="relative px-5 pt-5 pb-5 border-b border-primary/20 bg-gradient-to-br from-primary/15 via-card/60 to-background overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-amber-500/15 blur-3xl pointer-events-none animate-pulse" />
        <div className="relative flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary/80 transition-colors active:scale-95 border border-border/40">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Tableau de bord</p>
            </div>
            <h1 className="text-xl font-black tracking-tight gold-text leading-tight">Espace Premium</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Statut, statistiques et accès rapide</p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 space-y-5 overflow-y-auto">
        {/* Subscription status */}
        <section className="relative rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card/95 to-amber-900/10 p-5 shadow-xl shadow-primary/20 overflow-hidden" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            {/* Ring */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <defs>
                  <linearGradient id="ring-gold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fde047" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r={r} stroke="hsl(var(--border))" strokeWidth="7" fill="none" opacity="0.4" />
                {access.hasAccess && (
                  <circle cx="60" cy="60" r={r} stroke="url(#ring-gold)" strokeWidth="7" fill="none"
                    strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }} />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {access.isLifetime ? (
                  <>
                    <InfinityIcon className="w-7 h-7 gold-text" />
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mt-0.5">À vie</span>
                  </>
                ) : daysLeft !== null ? (
                  <>
                    <span className="text-3xl font-black gold-text tabular-nums leading-none">{daysLeft}</span>
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mt-1">jour{daysLeft > 1 ? "s" : ""}</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-7 h-7 text-muted-foreground/60" />
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-bold mt-0.5">Inactif</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30">
                <ShieldCheck className="w-3 h-3 text-primary" />
                <span className="text-[9px] uppercase tracking-widest font-bold gold-text">
                  {access.hasAccess ? (access.isLifetime ? "À vie actif" : "Actif") : "Aucun"}
                </span>
              </div>
              <h2 className="text-lg font-black gold-text leading-tight">Mon abonnement</h2>
              {access.hasAccess ? (
                <div className="space-y-0.5 text-[11px] text-muted-foreground">
                  {access.grantedAt && (
                    <p className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Début : <span className="text-foreground font-semibold">{new Date(access.grantedAt).toLocaleDateString("fr-FR")}</span></p>
                  )}
                  {access.expiresAt && (
                    <p className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Expire : <span className="text-foreground font-semibold">{new Date(access.expiresAt).toLocaleDateString("fr-FR")}</span></p>
                  )}
                  {access.isLifetime && (
                    <p className="flex items-center gap-1.5"><InfinityIcon className="w-3 h-3" /> Accès permanent sans expiration</p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Souscrivez pour débloquer tous les services Premium</p>
              )}
            </div>
          </div>

          <Button
            variant="premium"
            className="w-full h-11 mt-4 text-sm font-bold"
            onClick={() => navigate("/premium")}
          >
            {access.hasAccess ? <><RefreshCw className="w-4 h-4 mr-2" /> Renouveler / gérer</> : <><Crown className="w-4 h-4 mr-2" /> Souscrire maintenant</>}
          </Button>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-2.5" style={{ animation: "fade-up 0.55s cubic-bezier(0.16, 1, 0.3, 1) 80ms forwards", opacity: 0 }}>
          {[
            { label: "Aujourd'hui", value: stats.today, icon: Zap, accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
            { label: "7 jours", value: stats.week, icon: TrendingUp, accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
            { label: "Total", value: stats.total, icon: BarChart3, accent: "text-primary border-primary/30 bg-primary/10" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl p-3 border ${s.accent} text-center backdrop-blur-sm`}>
              <s.icon className="w-4 h-4 mx-auto mb-1 opacity-80" />
              <p className="text-xl font-black tabular-nums">{s.value}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5 font-semibold">{s.label}</p>
            </div>
          ))}
        </section>

        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-1 pt-1">Accès rapide</p>

        {/* Quick access tiles - compact */}
        <section className="grid grid-cols-2 gap-3">
          {[
            { name: "Aviator Premium", route: "/aviator-premium", icon: Crown, accent: "from-amber-500/20 to-amber-500/10 border-amber-500/40 text-amber-300" },
            { name: "CosmoX", route: "/cosmox", icon: Sparkles, accent: "from-emerald-500/20 to-emerald-500/10 border-emerald-500/40 text-emerald-300" },
            { name: "JetX", route: "/jetx", icon: Zap, accent: "from-amber-500/20 to-amber-500/10 border-amber-500/40 text-amber-300" },
            
          ].map((g, i) => (
            <button
              key={g.name}
              onClick={() => navigate(g.route)}
              className={`relative rounded-2xl border-2 bg-gradient-to-br ${g.accent} p-4 text-left active:scale-[0.97] hover:brightness-110 transition-all overflow-hidden shadow-lg`}
              style={{ animation: `fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${120 + i * 70}ms forwards`, opacity: 0 }}
            >
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              <g.icon className="w-5 h-5 mb-2 drop-shadow" />
              <p className="text-sm font-black truncate">{g.name}</p>
              <p className="text-[10px] text-foreground/70 mt-0.5">Lancer →</p>
            </button>
          ))}
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default PremiumSelect;
