import { useEffect, useMemo, useState } from "react";
import {
  Crown, Check, Sparkles, Zap, Shield, Headphones,
  Infinity as InfinityIcon, TrendingUp, Star, Plane, Rocket,
  Trophy, BadgeCheck, CalendarCheck, CalendarX, Clock, RefreshCcw,
  Gauge, History as HistoryIcon, LifeBuoy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePremiumAccess, usePremiumHistory } from "@/lib/premiumAccess";
import { useAuth } from "@/contexts/AuthContext";

const BENEFITS = [
  { icon: InfinityIcon, title: "Accès illimité", desc: "Tous les services Premium déverrouillés" },
  { icon: TrendingUp,   title: "Précision avancée", desc: "Algorithmes Pro temps réel" },
  { icon: Zap,          title: "Activation instantanée", desc: "Validation automatique après paiement" },
  { icon: Shield,       title: "Données protégées", desc: "Preuves de paiement chiffrées" },
  { icon: Headphones,   title: "Support prioritaire", desc: "Chat direct avec l'équipe admin" },
  { icon: Star,         title: "Une seule formule", desc: "Aviator + CosmoX + JetX + Virtuel inclus" },
];

const SERVICES = [
  { icon: Plane,    name: "Aviator", desc: "Pro · Spribe · Studio" },
  { icon: Sparkles, name: "CosmoX",  desc: "Prédictions cosmiques HH:MM:SS" },
  { icon: Rocket,   name: "JetX",    desc: "Algorithme HH:MM précis" },
  { icon: Trophy,   name: "Virtuel", desc: "8 ligues couvertes en direct" },
];

interface PremiumDashboardProps {
  onSubscribe: () => void;
  onNavigate?: (tab: string) => void;
}

const formatTime = (d: Date) =>
  d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const formatDate = (d: Date) =>
  d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

const PremiumDashboard = ({ onSubscribe, onNavigate }: PremiumDashboardProps) => {
  const access = usePremiumAccess();
  const { entries } = usePremiumHistory();
  const { user, profile } = useAuth();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const status: "active" | "expired" | "inactive" = access.hasAccess
    ? "active"
    : entries.some((e) => e.expires_at && new Date(e.expires_at) < new Date() && e.granted_by)
    ? "expired"
    : "inactive";

  const { remainingMs, totalMs } = useMemo(() => {
    if (!access.hasAccess || access.isLifetime || !access.expiresAt || !access.grantedAt) {
      return { remainingMs: 0, totalMs: 0 };
    }
    const start = new Date(access.grantedAt).getTime();
    const end = new Date(access.expiresAt).getTime();
    return { remainingMs: Math.max(0, end - Date.now()), totalMs: Math.max(1, end - start) };
  }, [access]);

  const remainingDays  = Math.floor(remainingMs / 86_400_000);
  const remainingHours = Math.floor((remainingMs % 86_400_000) / 3_600_000);
  const progressPercent = access.isLifetime
    ? 100
    : totalMs ? Math.max(0, Math.min(100, ((totalMs - remainingMs) / totalMs) * 100)) : 0;

  const statusMeta = {
    active:   { label: "Actif",   cls: "bg-[hsl(var(--pm-green)/0.15)] text-[hsl(var(--pm-green))] border-[hsl(var(--pm-green)/0.4)]",  Icon: CalendarCheck },
    expired:  { label: "Expiré",  cls: "bg-amber-500/15 text-amber-300 border-amber-500/40", Icon: CalendarX },
    inactive: { label: "Inactif", cls: "bg-white/5 text-slate-300 border-white/10", Icon: Clock },
  }[status];
  const StatusIcon = statusMeta.Icon;

  const fmt = (v: string | null) => (v ? new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");

  const displayName = profile?.full_name || profile?.name || user?.email?.split("@")[0] || "Invité";
  const initials = displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U";

  return (
    <div className="space-y-6 pm-stagger">
      {access.isTrial && (
        <div
          className="pm-glass-strong relative overflow-hidden p-4 border-[hsl(var(--pm-gold)/0.4)]"
          style={{ animation: "scale-in 0.4s cubic-bezier(0.16,1,0.3,1) forwards" }}
        >
          <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-[hsl(var(--pm-gold)/0.25)] blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl pm-gradient-gold flex items-center justify-center pm-glow-gold shrink-0">
              <Clock className="w-6 h-6 text-slate-900" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Essai gratuit en cours</div>
              <div className="text-lg font-black text-white font-mono tabular-nums">
                {Math.floor(access.trialRemainingMs / 60_000)}:
                {Math.floor((access.trialRemainingMs % 60_000) / 1000).toString().padStart(2, "0")}
              </div>
              <div className="text-[10px] text-slate-400">15 minutes offertes — accès total Premium</div>
            </div>
          </div>
          <div className="relative mt-3 h-1.5 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full pm-gradient-gold transition-[width] duration-700"
              style={{ width: `${Math.max(0, Math.min(100, (access.trialRemainingMs / (15 * 60_000)) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Welcome / identity card */}
      <div className="pm-glass-strong relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-[hsl(var(--pm-violet)/0.35)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-[hsl(var(--pm-blue)/0.30)] blur-3xl" />

        <div className="relative flex items-center gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl pm-gradient-primary flex items-center justify-center text-white font-black text-lg shadow-lg pm-glow-violet">
                {initials}
              </div>
            )}
            {access.hasAccess && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full pm-gradient-gold flex items-center justify-center border-2 border-[hsl(var(--pm-bg))] pm-anim-badge">
                <Crown className="w-2.5 h-2.5 text-slate-900" strokeWidth={3} />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Bienvenue</div>
            <div className="text-lg font-black text-white truncate">{displayName}</div>
            <div className="text-[11px] text-slate-400 truncate">{user?.email || "Connectez-vous pour continuer"}</div>
          </div>

          {access.hasAccess && (
            <Badge className="pm-gradient-gold text-slate-900 border-0 font-black shrink-0 pm-anim-badge">
              <Crown className="w-3 h-3 mr-1" /> PREMIUM
            </Badge>
          )}
        </div>

        {/* Live time / date */}
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-black/30 border border-white/10 p-3">
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Heure</div>
            <div className="text-lg font-black pm-text-gold font-mono tabular-nums">{formatTime(now)}</div>
          </div>
          <div className="rounded-2xl bg-black/30 border border-white/10 p-3">
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Date</div>
            <div className="text-xs font-bold text-white capitalize truncate mt-1">{formatDate(now)}</div>
          </div>
        </div>
      </div>

      {/* Subscription status card */}
      <div className="pm-glass relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-[hsl(var(--pm-gold)/0.20)] blur-3xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl pm-gradient-gold flex items-center justify-center shadow-lg pm-glow-gold">
              <Crown className="w-6 h-6 text-slate-900" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Mon abonnement</div>
              <div className="text-base font-black text-white">{access.isLifetime ? "Premium À Vie" : "Premium"}</div>
            </div>
          </div>
          <Badge className={`border font-bold flex items-center gap-1 ${statusMeta.cls}`}>
            <StatusIcon className="w-3 h-3" /> {statusMeta.label}
          </Badge>
        </div>

        <div className="relative grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-xl bg-black/30 border border-white/10 p-2.5 text-center">
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Activé</div>
            <div className="text-[11px] font-black text-white mt-1">{fmt(access.grantedAt)}</div>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-2.5 text-center">
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Expire</div>
            <div className="text-[11px] font-black text-white mt-1">{access.isLifetime ? "Jamais" : fmt(access.expiresAt)}</div>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-2.5 text-center">
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Restant</div>
            <div className="text-[11px] font-black pm-text-gold mt-1">
              {access.isLifetime ? "∞" : access.hasAccess ? `${remainingDays}j ${remainingHours}h` : "—"}
            </div>
          </div>
        </div>

        {access.hasAccess && !access.isLifetime && (
          <div className="relative mt-4">
            <div className="h-2 rounded-full bg-black/40 overflow-hidden relative">
              <div
                className="h-full pm-gradient-primary transition-[width] duration-700"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="absolute top-0 h-full w-20 opacity-70"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                  animation: "pm-progress-shine 2.2s ease-in-out infinite",
                }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-slate-400 uppercase tracking-widest font-bold">
              <span>Période en cours</span>
              <span className="pm-text-gold">{Math.round(progressPercent)}%</span>
            </div>
          </div>
        )}

        <Button
          className="relative w-full h-11 mt-4 pm-gradient-primary text-white font-bold border-0 hover:opacity-90 pm-ripple pm-glow-violet"
          onClick={onSubscribe}
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          {access.hasAccess ? "Renouveler mon abonnement" : "Souscrire maintenant"}
        </Button>
      </div>

      {/* Quick access */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Accès rapide</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => onNavigate?.("plans")}
            className="pm-glass pm-ripple flex flex-col items-center justify-center gap-1.5 p-3 hover:border-[hsl(var(--pm-gold)/0.5)] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl pm-gradient-gold flex items-center justify-center">
              <Crown className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-[10px] font-bold text-white">Abonnement</span>
          </button>
          <button
            onClick={() => onNavigate?.("history")}
            className="pm-glass pm-ripple flex flex-col items-center justify-center gap-1.5 p-3 hover:border-[hsl(var(--pm-blue)/0.5)] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl pm-gradient-primary flex items-center justify-center">
              <HistoryIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-white">Historique</span>
          </button>
          <button
            onClick={() => onNavigate?.("help")}
            className="pm-glass pm-ripple flex flex-col items-center justify-center gap-1.5 p-3 hover:border-[hsl(var(--pm-green)/0.5)] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl pm-gradient-success flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-white">Aide</span>
          </button>
        </div>
      </section>

      {/* Services */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Services inclus</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {SERVICES.map((s) => (
            <div key={s.name} className="pm-glass p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-lg pm-gradient-primary flex items-center justify-center">
                  <s.icon className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm font-black text-white">{s.name}</div>
                <BadgeCheck className="w-3.5 h-3.5 text-[hsl(var(--pm-gold))] ml-auto" />
              </div>
              <div className="text-[10px] text-slate-400 leading-snug">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Avantages Premium</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {BENEFITS.map((b) => (
            <div key={b.title} className="pm-glass p-3 hover:border-[hsl(var(--pm-violet)/0.5)] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[hsl(var(--pm-violet)/0.15)] border border-[hsl(var(--pm-violet)/0.3)] flex items-center justify-center mb-2">
                <b.icon className="w-5 h-5 text-[hsl(var(--pm-violet))]" />
              </div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <Check className="w-3 h-3 text-[hsl(var(--pm-green))]" /> {b.title}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Global stats footer */}
      <div className="pm-glass p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--pm-blue)/0.15)] border border-[hsl(var(--pm-blue)/0.3)] flex items-center justify-center">
          <Gauge className="w-5 h-5 text-[hsl(var(--pm-blue))]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Transactions Premium</div>
          <div className="text-sm font-black text-white">{entries.length} enregistrée{entries.length > 1 ? "s" : ""}</div>
        </div>
        <button
          onClick={() => onNavigate?.("history")}
          className="text-[10px] px-3 py-1.5 rounded-lg pm-gradient-primary text-white font-bold pm-ripple"
        >
          Voir
        </button>
      </div>
    </div>
  );
};

export default PremiumDashboard;
