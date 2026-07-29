import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Crown, Shield, KeyRound, Users, UserPlus, Trophy, Bell, Sparkles, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGameStats } from "@/hooks/useGameStats";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import OptionalUpdateBanner from "@/components/OptionalUpdateBanner";
import { DynamicConfigRenderer } from "@/components/DynamicConfigRenderer";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import InfoModal from "@/components/InfoModal";
import Bet261Hub, { BET261_GAMES } from "@/components/hubs/Bet261Hub";
import OnexbetHub, { ONEXBET_GAMES } from "@/components/hubs/OnexbetHub";
import OnlineUsersDialog from "@/components/OnlineUsersDialog";
import StatsDetailDialog from "@/components/StatsDetailDialog";

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  delay,
  onClick,
  action,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "gold" | "trophy" | "bell";
  delay: number;
  onClick?: () => void;
  action?: React.ReactNode;
}) => {
  const tones = {
    emerald: { bg: "hsl(152 70% 45% / 0.14)", ring: "hsl(152 70% 45% / 0.35)", text: "hsl(152 80% 65%)", glow: "hsl(152 70% 45% / 0.35)" },
    gold:    { bg: "hsl(152 70% 45% / 0.14)", ring: "hsl(152 70% 45% / 0.35)", text: "hsl(152 80% 65%)", glow: "hsl(152 70% 45% / 0.30)" },
    trophy:  { bg: "hsl(42 82% 50% / 0.14)",  ring: "hsl(42 82% 50% / 0.40)",  text: "hsl(45 90% 65%)",  glow: "hsl(42 82% 50% / 0.30)" },
    bell:    { bg: "hsl(152 70% 45% / 0.14)", ring: "hsl(152 70% 45% / 0.35)", text: "hsl(152 80% 65%)", glow: "hsl(152 70% 45% / 0.35)" },
  }[tone];
  return (
    <div
      className={`relative rounded-2xl p-2.5 border overflow-hidden backdrop-blur-xl ${onClick ? "cursor-pointer hover:brightness-110 active:scale-[0.98] transition" : ""}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={{
        borderColor: "hsl(42 45% 45% / 0.25)",
        background: "linear-gradient(160deg, hsl(0 0% 8% / 0.85), hsl(0 0% 4% / 0.9))",
        boxShadow: `0 8px 26px -14px ${tones.glow}, inset 0 1px 0 hsl(0 0% 100% / 0.04)`,
        animation: `fade-up 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
      }}
    >
      <div className="absolute top-1.5 right-1.5">
        <span className="block w-1.5 h-1.5 rounded-full" style={{ background: tones.text, boxShadow: `0 0 8px ${tones.text}` }} />
      </div>
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center ring-1"
          style={{ background: tones.bg, borderColor: tones.ring, boxShadow: `0 0 18px -6px ${tones.glow}` }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color: tones.text }} />
        </div>
        <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold text-center leading-tight">{label}</p>
        <p className="text-base font-black leading-none" style={{ color: tones.text }}>{value}</p>
        <p className="text-[9px] text-slate-500 leading-tight text-center truncate max-w-full">{sub}</p>
        {action}
      </div>
    </div>
  );
};

const Games = () => {
  const navigate = useNavigate();
  const { user, isAdmin, signOut, loading, accessCodeRequired, accessCodeVerified, verifyAccessCode } = useAuth();
  const { gameStats, trackGameUsage, getMostPopular, refreshStats } = useGameStats();
  const unreadNotifs = useUnreadNotifications(user?.id ?? null);
  const [codeInput, setCodeInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [customPreds, setCustomPreds] = useState<Array<{ id: string; name: string; slug: string; description: string | null; requires_subscription: boolean }>>([]);
  const { onlineNow, totalAccounts, winsToday, claimWin, claimingWin } = useDashboardStats();
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [winsOpen, setWinsOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("custom_predictions")
        .select("id, name, slug, description, requires_subscription")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setCustomPreds(data ?? []);
    })();
  }, []);

  const refreshAll = useCallback(() => { refreshStats(); }, []);
  useRealtimeSync({ onGameAccessChange: refreshAll, onSettingsChange: refreshAll });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="w-10 h-10 border-2 border-[hsl(152_70%_45%)]/30 border-t-[hsl(152_70%_45%)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) { navigate("/login"); return null; }

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  const handleCodeVerify = async () => {
    if (!codeInput.trim()) return;
    setVerifying(true);
    const ok = await verifyAccessCode(codeInput.trim());
    if (ok) toast.success("Code vérifié !");
    else toast.error("Code d'accès incorrect");
    setVerifying(false);
  };

  const mostPopular = getMostPopular();

  if (accessCodeRequired && !accessCodeVerified && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 bg-[#050505]" style={{ animation: "fade-up 0.5s ease forwards" }}>
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <KeyRound className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Code d'accès requis</h1>
          <p className="text-sm text-muted-foreground max-w-xs">Entrez le code fourni par l'administrateur.</p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <Input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Entrez le code d'accès"
            className="h-14 bg-secondary/80 border-border/50 text-center text-lg font-mono font-bold tracking-widest"
            onKeyDown={(e) => e.key === "Enter" && handleCodeVerify()} />
          <Button variant="premium" className="w-full h-12 font-bold" onClick={handleCodeVerify} disabled={verifying}>
            {verifying ? "Vérification..." : "Valider"}
          </Button>
        </div>
        <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-destructive transition-colors mt-4 flex items-center gap-1">
          <LogOut className="w-3 h-3" /> Se déconnecter
        </button>
      </div>
    );
  }

  const totalOnline = 1248;
  const totalWins = gameStats.reduce((s, g) => s + g.total_uses, 0) || 8456;

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white relative overflow-x-hidden">
      {/* ambient luxury glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 -left-20 w-[420px] h-[420px] rounded-full blur-[120px] opacity-[0.22]" style={{ background: "hsl(152 78% 40%)" }} />
        <div className="absolute top-1/3 -right-24 w-[380px] h-[380px] rounded-full blur-[120px] opacity-[0.12]" style={{ background: "hsl(42 82% 50%)" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[120px] opacity-[0.10]" style={{ background: "hsl(152 78% 40%)" }} />
      </div>

      <InfoModal />

      {/* Header — J&H tile · title · Admin */}
      <header className="relative px-4 pt-5 pb-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          {/* J&H tile */}
          <div className="relative shrink-0">
            <div className="absolute inset-[-3px] rounded-2xl opacity-70 pointer-events-none"
              style={{
                background: "conic-gradient(from 0deg, hsl(42 82% 55% / 0.65), transparent, hsl(42 82% 55% / 0.65))",
                animation: "spin 6s linear infinite",
                filter: "blur(6px)",
              }} />
            <div
              className="relative w-[68px] h-[68px] rounded-2xl flex flex-col items-center justify-center"
              style={{
                background: "linear-gradient(160deg, #0a0a0a, #050505)",
                border: "1.5px solid hsl(42 70% 50% / 0.55)",
                boxShadow: "0 10px 26px -10px hsl(42 82% 50% / 0.55), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
              }}
            >
              <Crown className="w-3 h-3 -mb-0.5" style={{ color: "hsl(45 90% 65%)" }} />
              <span
                className="font-black text-[22px] leading-none tracking-tight"
                style={{
                  background: "linear-gradient(180deg, hsl(45 90% 72%), hsl(42 82% 48%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                J&amp;H
              </span>
            </div>
          </div>

          {/* Center title */}
          <div className="min-w-0 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] font-black tracking-[0.18em]" style={{ color: "hsl(45 90% 65%)" }}>PREMIUM</span>
              <span className="w-1 h-1 rounded-full" style={{ background: "hsl(45 90% 65%)" }} />
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">v0.0.1</span>
            </div>
            <h1
              className="font-black text-[22px] leading-tight truncate"
              style={{
                background: "linear-gradient(180deg, #fff, hsl(45 30% 88%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Jeux d'Hazard
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: "hsl(152 80% 55%)", boxShadow: "0 0 10px hsl(152 80% 55% / 0.9)" }}
              />
              Session sécurisée
            </p>
          </div>

          {/* Admin button */}
          <button
            onClick={() => (isAdmin ? navigate("/admin") : toast.error("Accès réservé aux administrateurs"))}
            className="shrink-0 h-11 px-3.5 rounded-2xl flex items-center gap-1.5 text-[12px] font-bold transition active:scale-95"
            style={{
              background: "linear-gradient(160deg, hsl(0 0% 8% / 0.85), hsl(0 0% 4% / 0.9))",
              border: "1.5px solid hsl(42 70% 50% / 0.55)",
              color: "hsl(45 90% 70%)",
              boxShadow: "0 6px 18px -8px hsl(42 82% 50% / 0.6), inset 0 1px 0 hsl(0 0% 100% / 0.05)",
            }}
          >
            <Shield className="w-4 h-4" />
            Admin
          </button>
        </div>
      </header>

      <OptionalUpdateBanner />

      {/* Dashboard stats */}
      <section className="px-4 mt-1">
        <div className="grid grid-cols-4 gap-2">
          <StatCard
            icon={Users}
            label="En ligne"
            value={onlineNow.toLocaleString("fr-FR")}
            sub="Temps réel"
            tone="emerald"
            delay={60}
            onClick={() => setOnlineOpen(true)}
          />
          <StatCard
            icon={UserPlus}
            label="Comptes"
            value={totalAccounts.toLocaleString("fr-FR")}
            sub="Enregistrés"
            tone="emerald"
            delay={120}
            onClick={() => setAccountsOpen(true)}
          />
          <StatCard
            icon={Trophy}
            label="Paris gagnés"
            value={winsToday.toLocaleString("fr-FR")}
            sub="Dernières 24 h"
            tone="trophy"
            delay={180}
            onClick={() => setWinsOpen(true)}
            action={
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  const res = await claimWin();
                  if (res.ok) toast.success("Prédiction gagnée validée !");
                  else toast.error("Impossible d'enregistrer la validation");
                }}
                disabled={claimingWin}
                className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-400/40 px-2 py-0.5 text-[9px] font-bold text-amber-300 hover:bg-amber-500/25 transition disabled:opacity-50"
              >
                {claimingWin ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />}
                Gagné
              </button>
            }
          />
          <StatCard
            icon={Bell}
            label="Notifications"
            value={String(unreadNotifs)}
            sub="Nouvelles"
            tone="bell"
            delay={240}
            onClick={() => navigate("/notifications")}
          />
        </div>
      </section>

      <OnlineUsersDialog open={onlineOpen} onOpenChange={setOnlineOpen} />
      <StatsDetailDialog open={accountsOpen} onOpenChange={setAccountsOpen} kind="accounts" />
      <StatsDetailDialog open={winsOpen} onOpenChange={setWinsOpen} kind="wins" />


      {/* Content */}
      <main className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
        <DynamicConfigRenderer />

        {/* Bet261 platform */}
        <div
          className="rounded-[28px] p-4 backdrop-blur-xl"
          style={{
            background: "linear-gradient(160deg, hsl(0 0% 6% / 0.85), hsl(0 0% 3% / 0.92))",
            border: "1.5px solid hsl(42 60% 45% / 0.35)",
            boxShadow: "0 20px 50px -20px hsl(152 70% 30% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.04)",
          }}
        >
          <Bet261Hub gameStats={gameStats} mostPopular={mostPopular} onTrack={trackGameUsage} />
        </div>

        {/* Custom predictions (admin-defined) */}
        {customPreds.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4" style={{ animation: "fade-up 0.4s ease 200ms forwards", opacity: 0 }}>
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold gold-text">Prédictions personnalisées</h2>
                <p className="text-[9px] text-muted-foreground">{customPreds.length} disponibles</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {customPreds.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/custom/${p.slug}`)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 bg-gradient-to-b from-primary/10 to-card border-primary/25 hover:border-primary/50 transition-all active:scale-[0.96] hover:scale-[1.03]"
                  style={{ animation: `fade-up 0.4s ease ${300 + i * 60}ms forwards`, opacity: 0 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="font-bold text-xs truncate gold-text">{p.name}</p>
                    {p.description && <p className="text-[9px] text-muted-foreground truncate">{p.description}</p>}
                  </div>
                  {p.requires_subscription && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold flex items-center gap-0.5">
                      <Crown className="w-2 h-2" /> Pro
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 1xBet platform */}
        <div
          className="rounded-[28px] p-4 backdrop-blur-xl"
          style={{
            background: "linear-gradient(160deg, hsl(0 0% 6% / 0.85), hsl(0 0% 3% / 0.92))",
            border: "1.5px solid hsl(152 60% 40% / 0.35)",
            boxShadow: "0 20px 50px -20px hsl(152 70% 30% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.04)",
          }}
        >
          <OnexbetHub gameStats={gameStats} onTrack={trackGameUsage} />
        </div>
      </main>

      <div className="h-28" />
      <BottomNav />
    </div>
  );
};

export default Games;
