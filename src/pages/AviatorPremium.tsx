import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PremiumPaywall from "@/components/PremiumPaywall";
import { PREMIUM_GAME_MODES, computeTrial } from "@/lib/premiumAccess";
import AviatorRealtimeMode from "@/components/AviatorRealtimeMode";
import { Button } from "@/components/ui/button";

const AviatorPremium = () => {
  const navigate = useNavigate();
  const { user, isAdmin, profile } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [subEnabled, setSubEnabled] = useState(true);
  const [accessExpiry, setAccessExpiry] = useState<string | null>(null);
  const [accessStart, setAccessStart] = useState<string | null>(null);
  const [showSeconds, setShowSeconds] = useState(true);

  useEffect(() => {
    if (!user) return;
    checkAccess();
    supabase.from("activation_codes").select("code_value").eq("code_name", "seconds_premium").maybeSingle()
      .then(({ data }) => setShowSeconds(data?.code_value === "enabled"));
    supabase.from("activation_codes").select("code_value").eq("code_name", "sub_aviator_premium").maybeSingle()
      .then(({ data }) => setSubEnabled(data?.code_value === "enabled"));
    const interval = setInterval(checkAccess, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;
    const trial = computeTrial(profile?.trial_started_at ?? null);
    if (isAdmin || trial.active) { setHasAccess(true); setIsExpired(false); return; }
    const { data } = await supabase
      .from("game_access").select("*")
      .eq("user_id", user.id)
      .in("game_mode", PREMIUM_GAME_MODES as unknown as string[])
      .eq("is_active", true);
    const now = new Date();
    const active = data?.find(d => !!d.granted_by && (!d.expires_at || new Date(d.expires_at) > now));
    const expired = data?.find(d => d.expires_at && new Date(d.expires_at) <= now);
    if (active) { setHasAccess(true); setIsExpired(false); setAccessExpiry(active.expires_at); setAccessStart(active.granted_at); }
    else if (expired) { setHasAccess(false); setIsExpired(true); setAccessExpiry(expired.expires_at); setAccessStart(expired.granted_at); }
    else { setHasAccess(false); setIsExpired(false); }
  };

  if (!user) { navigate("/login"); return null; }

  if (hasAccess === null) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!hasAccess && isExpired) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
          <button onClick={() => navigate("/games")} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-lg font-bold flex items-center gap-2"><Crown className="w-5 h-5 text-primary" /> Aviator Premium</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5 text-center">
          <div className="w-20 h-20 rounded-3xl bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <div className="space-y-2 max-w-sm">
            <h2 className="text-xl font-bold">Abonnement expiré</h2>
            <p className="text-sm text-muted-foreground">
              Votre accès Premium a expiré le{" "}
              <span className="font-semibold text-foreground">
                {accessExpiry ? new Date(accessExpiry).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : ""}
              </span>.
            </p>
          </div>
          <Button onClick={() => navigate("/premium")} className="h-12 px-8 gold-gradient text-primary-foreground font-bold shadow-lg shadow-primary/30">
            <RefreshCw className="w-4 h-4 mr-2" /> Renouveler mon abonnement
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!hasAccess && subEnabled) {
    return <PremiumPaywall gameName="Aviator Premium" icon={<Crown className="w-5 h-5 text-primary" />} />;
  }

  return (
    <>
      <AviatorRealtimeMode
        showSeconds={showSeconds}
        accessStart={accessStart}
        accessExpiry={accessExpiry}
        onBack={() => navigate("/games")}
      />
      <div className="h-20" />
      <BottomNav />
    </>
  );
};

export default AviatorPremium;
