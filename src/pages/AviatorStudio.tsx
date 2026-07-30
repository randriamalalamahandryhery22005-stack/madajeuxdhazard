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
import { Zap, Timer, Brain, ShieldCheck, Signal } from "lucide-react";

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
    return <div className="min-h-screen flex items-center justify-center luxe-page"><div className="w-8 h-8 border-2 border-[#F4C542]/30 border-t-[#F4C542] rounded-full animate-spin" /></div>;
  }

  if (!hasAccess && subEnabled) {
    return <PremiumPaywall gameName="Aviator Studio" icon={<Crown className="w-5 h-5 luxe-gold" />} />;
  }

  if (studioMode === "select") {
    return (
      <div className="min-h-screen flex flex-col luxe-page">
        <div className="px-4 pt-4">
          <div className="luxe-header luxe-ring flex items-center gap-3">
            <button onClick={() => navigate("/games")} className="luxe-back" aria-label="Retour">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="luxe-icon-badge luxe-icon-badge-gold luxe-float">
              <Crown className="w-5 h-5" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg luxe-title leading-tight flex items-center gap-2">
                Aviator Studio
                <span className="luxe-badge-premium">Premium</span>
              </h1>
              <div className="flex gap-2 text-[10px] text-white/50 mt-0.5">
                <span>Powered by Spribe</span>
                {accessStart && <span>· Début · {new Date(accessStart).toLocaleDateString("fr-FR")}</span>}
                {accessExpiry && <span>· Expire · {new Date(accessExpiry).toLocaleDateString("fr-FR")}</span>}
              </div>
            </div>
            <span className="luxe-badge-live">LIVE</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          <div className="text-center space-y-1.5" style={{ animation: "fade-up 0.4s ease forwards" }}>
            <h2 className="text-2xl luxe-title">Choisissez votre mode</h2>
            <p className="text-xs text-white/55">Même technologie que Aviator Premium</p>
          </div>

          <button onClick={() => setStudioMode("realtime")}
            className="w-full text-left luxe-card luxe-card-lg luxe-card-emerald p-5 transition-transform active:scale-[0.98]"
            style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 100ms forwards", opacity: 0 }}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl luxe-icon-badge luxe-float shrink-0">
                <Zap className="w-8 h-8" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-black luxe-emerald-text">⚡ Temps Réel</h3>
                  <span className="luxe-badge-premium scale-90 origin-left">Pro</span>
                </div>
                <p className="text-[11px] text-white/60">Coeff: 5 – 500 · Haute précision</p>
                <div className="flex gap-3 mt-2 text-[10px] text-white/55">
                  <span className="flex items-center gap-1"><Signal className="w-3 h-3 luxe-emerald" /> Instantané</span>
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 luxe-gold" /> Sécurisé</span>
                </div>
              </div>
            </div>
          </button>

          <button onClick={() => setStudioMode("balanced")}
            className="w-full text-left luxe-card luxe-card-lg luxe-card-gold p-5 transition-transform active:scale-[0.98]"
            style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 200ms forwards", opacity: 0 }}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl luxe-icon-badge luxe-icon-badge-gold luxe-float shrink-0">
                <Timer className="w-8 h-8" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-black luxe-gold-text">⚖️ Temps Équilibré</h3>
                  <span className="luxe-badge-premium scale-90 origin-left">Pro</span>
                </div>
                <p className="text-[11px] text-white/60">Coeff: 5 – 25 · Stabilité</p>
                <div className="flex gap-3 mt-2 text-[10px] text-white/55">
                  <span className="flex items-center gap-1"><Brain className="w-3 h-3 luxe-emerald" /> Analyse stable</span>
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 luxe-gold" /> Régulier</span>
                </div>
              </div>
            </div>
          </button>

          <div className="luxe-card p-3 flex items-center justify-around text-[10px] text-white/60">
            <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 luxe-emerald" /> IA avancée</span>
            <span className="w-px h-4 bg-white/10" />
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 luxe-gold" /> 100% Sécurisé</span>
            <span className="w-px h-4 bg-white/10" />
            <span className="flex items-center gap-1.5"><Signal className="w-3.5 h-3.5 luxe-emerald" /> Temps réel</span>
          </div>
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
