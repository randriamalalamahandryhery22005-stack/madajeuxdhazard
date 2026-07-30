import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Unlock, Crown, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import basicLogo from "@/assets/aviator-basic-logo.png";
import premiumLogo from "@/assets/aviator-premium-logo.png";

const Aviator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingMode, setPendingMode] = useState<"basic" | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [basicCode, setBasicCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCodes = async () => {
      const { data } = await supabase.from("activation_codes").select("code_name, code_value").eq("code_name", "basic").single();
      setBasicCode(data?.code_value?.trim() || null);
      setLoading(false);
    };
    fetchCodes();
  }, []);

  if (!user) { navigate("/login"); return null; }

  const handleBasicClick = () => {
    if (!basicCode || basicCode === "") {
      navigate("/aviator/basic");
    } else {
      setPendingMode("basic");
    }
  };

  const handleCodeSubmit = () => {
    if (codeInput === basicCode) {
      navigate("/aviator/basic");
    } else {
      toast.error("Code incorrect");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
        <button onClick={() => pendingMode ? setPendingMode(null) : navigate("/games")} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-lg font-bold">Aviator</h1>
      </div>

      {!pendingMode ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 py-6" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          <div className="text-center space-y-1">
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.2em]">Modes disponibles</p>
            <p className="text-xs text-muted-foreground/70">Choisissez votre expérience</p>
          </div>

          {/* Analyse du tour actuel — dédiée */}
          <button
            onClick={() => navigate("/analyse/aviator")}
            className="w-full max-w-md relative overflow-hidden flex items-center gap-3 p-4 rounded-3xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/40 hover:border-primary/70 transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center shadow-lg shrink-0">
              <Radar className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-black text-sm gold-text">Analyse du tour actuel</p>
              <p className="text-[10px] text-muted-foreground leading-snug">Envoyez une capture, obtenez le verdict IA</p>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-primary/15 text-primary shrink-0">Lancer</span>
          </button>


          <div className="w-full max-w-md grid grid-cols-2 gap-3">
            {/* Accès libre */}
            <button
              onClick={handleBasicClick}
              className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-card border border-border/50 hover:border-primary/40 hover:shadow-2xl transition-all duration-300 active:scale-[0.98]"
            >
              <img src={basicLogo} alt="Prédictions" className="w-20 h-20 object-contain drop-shadow-2xl" loading="lazy" />
              <div className="text-center space-y-1">
                <p className="font-black text-sm">Prédictions</p>
                <p className="text-[10px] text-muted-foreground leading-snug">Prédictions standard</p>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-semibold mt-1 px-2 py-1 rounded-full bg-secondary/80">
                {basicCode ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5 text-green-400" />}
                {basicCode ? "Code requis" : "Accès libre"}
              </div>
            </button>

            {/* Jeux */}
            <button
              onClick={() => navigate("/premium-select")}
              className="relative flex flex-col items-center gap-3 p-5 rounded-3xl bg-gradient-to-b from-primary/10 via-card to-card border border-primary/40 hover:border-primary/70 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 active:scale-[0.98]"
            >
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] px-2 py-0.5 rounded-full gold-gradient text-primary-foreground font-bold flex items-center gap-0.5 shadow-lg">
                <Crown className="w-2.5 h-2.5" /> Jeux
              </span>
              <img src={premiumLogo} alt="Jeux" className="w-20 h-20 object-contain drop-shadow-2xl" loading="lazy" />
              <div className="text-center space-y-1">
                <p className="font-black text-sm gold-text">Jeux</p>
                <p className="text-[10px] text-muted-foreground leading-snug">Aviator · CosmoX · JetX</p>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-semibold mt-1 px-2 py-1 rounded-full bg-primary/15 text-primary">
                <Crown className="w-2.5 h-2.5" /> Abonnement
              </div>
            </button>

          </div>
        </div>

      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-5" style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="font-bold">Code d'accès requis</h2>
            <p className="text-xs text-muted-foreground mt-1">Entrez le code pour accéder aux prédictions</p>
          </div>
          <div className="w-full max-w-xs space-y-3">
            <Input
              placeholder="Entrez le code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className="h-14 bg-secondary/80 border-border/50 text-center text-lg font-mono tracking-widest"
              onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
            />
            <Button variant="premium" className="w-full h-12" onClick={handleCodeSubmit}>
              Accéder
            </Button>
          </div>
        </div>
      )}
      <div className="h-20" />
      <BottomNav />
    </div>
  );
};

export default Aviator;
