import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PremiumPaywall from "@/components/PremiumPaywall";
import { PREMIUM_GAME_MODES, computeTrial } from "@/lib/premiumAccess";
import AviatorRealtimeMode from "@/components/AviatorRealtimeMode";
import AviatorBalancedMode from "@/components/AviatorBalancedMode";
import { Zap, Timer } from "lucide-react";

type StudioMode = "select" | "realtime" | "balanced";

const AviatorStudio = () => {
  const navigate = useNavigate();
  const { user, isAdmin, profile } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [subEnabled, setSubEnabled] = useState(true);
  const [accessExpiry, setAccessExpiry] = useState<string | null>(null);
  const [accessStart, setAccessStart] = useState<string | null>(null);
  const [studioMode, setStudioMode] = useState<StudioMode>("select");
  const [showSeconds, setShowSeconds] = useState(true);

  useEffect(() => {
    if (!user) return;
    checkAccess();
    supabase.from("activation_codes").select("code_value").eq("code_name", "seconds_premium").maybeSingle()
      .then(({ data }) => setShowSeconds(data?.code_value === "enabled"));
    supabase.from("activation_codes").select("code_value").eq("code_name", "sub_aviator_studio").maybeSingle()
      .then(({ data }) => setSubEnabled(data?.code_value === "enabled"));
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;
    const trial = computeTrial(profile?.trial_started_at ?? null);
    if (isAdmin || trial.active) { setHasAccess(true); return; }
    const { data } = await supabase
      .from("game_access").select("*")
      .eq("user_id", user.id)
      .in("game_mode", PREMIUM_GAME_MODES as unknown as string[])
      .eq("is_active", true);
    const active = data?.find(d => !!d.granted_by && (!d.expires_at || new Date(d.expires_at) > new Date()));
    if (active) { setHasAccess(true); setAccessExpiry(active.expires_at); setAccessStart(active.granted_at); }
    else setHasAccess(false);
  };

  if (!user) { navigate("/login"); return null; }

  if (hasAccess === null) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[hsl(var(--sunset-orange)/0.3)] border-t-[hsl(var(--sunset-orange))] rounded-full animate-spin" /></div>;
  }

  if (!hasAccess && subEnabled) {
    return <PremiumPaywall gameName="Aviator Studio" icon={<Crown className="w-5 h-5 text-[hsl(var(--sunset-orange))]" />} />;
  }

  if (studioMode === "select") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[hsl(var(--sunset-magenta)/0.25)] bg-gradient-to-r mesh-sunset">
          <button onClick={() => navigate("/games")} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
           <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Crown className="w-5 h-5 text-[hsl(var(--sunset-orange))]" />
              <span className="text-[hsl(var(--sunset-orange))]">Aviator Studio</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">Premium</span>
            </h1>
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span className="text-[9px] opacity-60">Powered by Spribe</span>
              {accessStart && <span>· Début: {new Date(accessStart).toLocaleDateString("fr-FR")}</span>}
              {accessExpiry && <span>· Expire: {new Date(accessExpiry).toLocaleDateString("fr-FR")}</span>}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-8 space-y-6">
          <div className="text-center space-y-2" style={{ animation: "fade-up 0.4s ease forwards" }}>
            <h2 className="text-xl font-black">Choisissez votre mode</h2>
            <p className="text-sm text-muted-foreground">Même technologie que Aviator Premium</p>
          </div>

          <button onClick={() => setStudioMode("realtime")}
            className="w-full text-left rounded-2xl overflow-hidden border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card/90 to-green-500/5 hover:border-emerald-500/50 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-emerald-500/5"
            style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 100ms forwards", opacity: 0 }}>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-emerald-400">⚡ Temps Réel</h3>
                  <p className="text-xs text-muted-foreground">Coeff: 5 - 500 · Haute précision</p>
                </div>
              </div>
            </div>
          </button>

          <button onClick={() => setStudioMode("balanced")}
            className="w-full text-left rounded-2xl overflow-hidden border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card/90 to-amber-500/5 hover:border-amber-500/50 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-amber-500/5"
            style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 200ms forwards", opacity: 0 }}>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Timer className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-400">⚖️ Temps Équilibré</h3>
                  <p className="text-xs text-muted-foreground">Coeff: 5 - 25 · Stabilité</p>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {studioMode === "realtime" ? (
        <AviatorRealtimeMode showSeconds={showSeconds} accessStart={accessStart} accessExpiry={accessExpiry} onBack={() => setStudioMode("select")} />
      ) : (
        <AviatorBalancedMode showSeconds={showSeconds} accessStart={accessStart} accessExpiry={accessExpiry} onBack={() => setStudioMode("select")} />
      )}
      <div className="h-20" />
      <BottomNav />
    </>
  );
};

export default AviatorStudio;
