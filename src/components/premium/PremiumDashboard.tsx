import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Crown, Check, Infinity as InfinityIcon, ChevronRight, RefreshCcw,
  Zap, TrendingUp, BarChart3, Rocket, Plane, Sparkles, ArrowRight, Clock,
} from "lucide-react";
import { usePremiumAccess } from "@/lib/premiumAccess";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface PremiumDashboardProps {
  onSubscribe: () => void;
  onNavigate?: (tab: string) => void;
}

const LIFETIME_PERKS = [
  "Accès permanent sans expiration",
  "Toutes les fonctionnalités débloquées",
  "Support prioritaire",
  "Mises à jour incluses",
];

const TIMED_PERKS = [
  "Tous les jeux Premium débloqués",
  "Prédictions illimitées en temps réel",
  "Support prioritaire",
  "Mises à jour incluses",
];

const FREE_PERKS = [
  "Aviator Basique — 10 prédictions/jour",
  "Accès à la boutique J&H",
  "Chat avec l'équipe support",
  "Passez Premium pour tout débloquer",
];

const QUICK_ACCESS = [
  { name: "Aviator Premium", desc: "Précision élevée", to: "/aviator-premium", Icon: Plane, tone: "emerald" as const },
  { name: "CosmoX", desc: "Prédictions avancées", to: "/cosmox", Icon: Sparkles, tone: "emerald" as const },
  { name: "JetX", desc: "Vol premium", to: "/jetx", Icon: Rocket, tone: "gold" as const },
];

/** Compteurs d'utilisation réels de l'utilisateur (aujourd'hui / 7 jours / total). */
function useUsageCounters() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ today: 0, week: 0, total: 0 });

  useEffect(() => {
    if (!user) { setCounts({ today: 0, week: 0, total: 0 }); return; }
    let alive = true;
    const load = async () => {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const weekAgo = new Date(Date.now() - 7 * 86_400_000);
      const [t, w, all] = await Promise.all([
        supabase.from("game_usage").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).gte("used_at", startOfDay.toISOString()),
        supabase.from("game_usage").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).gte("used_at", weekAgo.toISOString()),
        supabase.from("game_usage").select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      if (!alive) return;
      setCounts({ today: t.count ?? 0, week: w.count ?? 0, total: all.count ?? 0 });
    };
    load();
    const ch = supabase
      .channel(`premium-usage-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_usage", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user]);

  return counts;
}

const PremiumDashboard = ({ onSubscribe, onNavigate }: PremiumDashboardProps) => {
  const access = usePremiumAccess();
  const navigate = useNavigate();
  const usage = useUsageCounters();

  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  const remaining = useMemo(() => {
    if (!access.hasAccess || access.isLifetime || !access.expiresAt) return null;
    const ms = new Date(access.expiresAt).getTime() - Date.now();
    if (ms <= 0) return null;
    return { days: Math.floor(ms / 86_400_000), hours: Math.floor((ms % 86_400_000) / 3_600_000) };
  }, [access]);

  const perks = access.isLifetime ? LIFETIME_PERKS : access.hasAccess ? TIMED_PERKS : FREE_PERKS;

  const statusLabel = access.isLifetime
    ? "À VIE ACTIF"
    : access.isTrial
    ? "ESSAI EN COURS"
    : access.hasAccess
    ? "ABONNEMENT ACTIF"
    : "AUCUN ABONNEMENT";

  const ringLabel = access.isLifetime ? "À VIE" : access.hasAccess ? `${remaining?.days ?? 0}J` : "FREE";

  const stats = [
    { value: usage.today, label: "AUJOURD'HUI", Icon: Zap, tone: "emerald" as const },
    { value: usage.week, label: "7 JOURS", Icon: TrendingUp, tone: "emerald" as const },
    { value: usage.total, label: "TOTAL", Icon: BarChart3, tone: "gold" as const },
  ];

  return (
    <div className="space-y-6 pm-stagger pb-4">
      {/* ===== Carte abonnement principale ===== */}
      <div
        className="relative overflow-hidden rounded-[28px] p-5"
        style={{
          background: "linear-gradient(150deg, rgba(6,24,16,0.95) 0%, rgba(4,14,10,0.95) 55%, rgba(10,8,2,0.95) 100%)",
          border: "1px solid rgba(244,197,66,0.45)",
          boxShadow: "0 24px 60px -20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div className="pointer-events-none absolute -top-24 -left-16 w-64 h-64 rounded-full bg-[#00D084]/18 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-[#F4C542]/12 blur-[90px]" />

        <div className="relative flex items-center gap-5">
          {/* Anneau doré */}
          <div className="relative shrink-0 w-[112px] h-[112px]">
            <div
              className="absolute inset-0 rounded-full luxe-float"
              style={{
                background: "conic-gradient(from 200deg, #F4C542, #FDE68A, #E0A82F, #F4C542)",
                padding: "6px",
                boxShadow: "0 0 34px rgba(244,197,66,0.45)",
              }}
            >
              <div className="w-full h-full rounded-full bg-[#04120C] flex flex-col items-center justify-center gap-0.5">
                {access.isLifetime ? (
                  <InfinityIcon className="w-11 h-11 luxe-gold" strokeWidth={2.5} />
                ) : access.hasAccess ? (
                  <Crown className="w-9 h-9 luxe-gold" strokeWidth={2.4} />
                ) : (
                  <Clock className="w-9 h-9 luxe-gold" strokeWidth={2.4} />
                )}
                <span className="text-[11px] font-black tracking-widest luxe-emerald">{ringLabel}</span>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide"
              style={{
                background: access.hasAccess ? "rgba(0,208,132,0.12)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${access.hasAccess ? "rgba(0,208,132,0.55)" : "rgba(255,255,255,0.15)"}`,
                color: access.hasAccess ? "#00D084" : "rgba(255,255,255,0.7)",
              }}
            >
              <Crown className="w-3.5 h-3.5" /> {statusLabel}
            </div>

            <h2 className="mt-2 text-[22px] leading-tight font-black luxe-gold-text">Mon abonnement</h2>

            <ul className="mt-2 space-y-1.5">
              {perks.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full bg-[#00D084]/15 border border-[#00D084]/50 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-[#00D084]" strokeWidth={3.5} />
                  </span>
                  <span className="text-[12.5px] text-white/85 leading-snug">{p}</span>
                </li>
              ))}
            </ul>

            {remaining && !access.isLifetime && (
              <div className="mt-2 text-[11px] text-white/55">
                Expire dans <span className="luxe-gold font-bold">{remaining.days}j {remaining.hours}h</span>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onSubscribe}
          className="relative mt-5 w-full h-[58px] rounded-2xl overflow-hidden flex items-center active:scale-[0.985] transition"
          style={{
            border: "1px solid rgba(244,197,66,0.7)",
            background: "linear-gradient(90deg, rgba(244,197,66,0.95) 0%, rgba(224,168,47,0.75) 16%, rgba(8,18,12,0.9) 34%, rgba(6,14,10,0.9) 100%)",
            boxShadow: "0 14px 34px -12px rgba(244,197,66,0.5)",
          }}
        >
          <span className="w-[74px] h-full flex items-center justify-center shrink-0">
            <RefreshCcw className="w-6 h-6 text-[#06120C]" strokeWidth={2.6} />
          </span>
          <span className="flex-1 text-center text-[15px] font-black luxe-gold-text pr-4">
            {access.hasAccess ? "Renouveler / gérer mon abonnement" : "Souscrire à Premium"}
          </span>
          <ChevronRight className="w-5 h-5 luxe-gold mr-4 shrink-0" />
        </button>
      </div>

      {/* ===== Stats d'utilisation ===== */}
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map(({ value, label, Icon, tone }) => {
          const color = tone === "gold" ? "#F4C542" : "#00D084";
          return (
            <button
              key={label}
              onClick={() => onNavigate?.("history")}
              className="relative overflow-hidden rounded-[22px] p-3.5 text-center active:scale-[0.97] transition"
              style={{
                background: "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(0,0,0,0.35))",
                border: `1px solid ${color}44`,
                boxShadow: `0 14px 30px -18px ${color}88`,
              }}
            >
              <span
                className="mx-auto mb-2 w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: `${color}1f`, border: `1px solid ${color}55`, boxShadow: `0 0 18px ${color}33` }}
              >
                <Icon className="w-5 h-5" style={{ color }} strokeWidth={2.4} />
              </span>
              <div className="text-2xl font-black leading-none" style={{ color }}>{value}</div>
              <div className="mt-1 text-[9.5px] font-black tracking-widest text-white/85">{label}</div>
              <div className="text-[10px] text-white/45">Utilisation</div>
              <span
                className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-2/3 rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
              />
            </button>
          );
        })}
      </div>

      {/* ===== Accès rapide ===== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 luxe-emerald" />
          <h2 className="text-[12px] uppercase tracking-[0.2em] luxe-gold font-black">Accès rapide</h2>
          <span className="luxe-gold text-[10px]">◆</span>
          <span className="flex-1 h-px bg-gradient-to-r from-[#F4C542]/40 to-transparent" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {QUICK_ACCESS.map(({ name, desc, to, Icon, tone }) => {
            const color = tone === "gold" ? "#F4C542" : "#00D084";
            return (
              <button
                key={name}
                onClick={() => navigate(to)}
                className="relative overflow-hidden rounded-[20px] p-3.5 text-left active:scale-[0.97] transition"
                style={{
                  background: "linear-gradient(150deg, rgba(255,255,255,0.05), rgba(0,0,0,0.4))",
                  border: `1px solid ${color}44`,
                  boxShadow: `0 16px 34px -20px ${color}99`,
                }}
              >
                {/* Ruban couronne */}
                <span
                  className="pointer-events-none absolute top-0 right-0 w-12 h-12"
                  style={{ background: `linear-gradient(225deg, ${color} 0%, ${color}00 62%)` }}
                />
                <Crown className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-[#06120C]" strokeWidth={2.6} />

                <div className="flex items-start gap-3">
                  <span
                    className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center"
                    style={{ background: `${color}14`, border: `1px solid ${color}55`, boxShadow: `0 0 18px ${color}33` }}
                  >
                    <Icon className="w-6 h-6" style={{ color }} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-black text-white leading-tight truncate">{name}</div>
                    <div className="text-[10.5px] text-white/50 leading-snug">{desc}</div>
                  </div>
                </div>

                <span
                  className="mt-3 ml-auto flex w-fit items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black"
                  style={{ background: `${color}12`, border: `1px solid ${color}66`, color }}
                >
                  Lancer <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default PremiumDashboard;
