import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SplashScreen from "@/components/SplashScreen";
import WelcomeIntro from "@/components/WelcomeIntro";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, Loader2 } from "lucide-react";
import jhLogo from "@/assets/jh-logo.png";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    setShowWelcome(true);
  }, []);

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
    setIntroDone(true);
  }, []);

  // Une fois l'intro terminée : espace membre si connecté, sinon écran de connexion.
  useEffect(() => {
    if (!introDone || loading) return;
    navigate(user ? "/games" : "/login", { replace: true });
  }, [introDone, loading, user, navigate]);

  if (showSplash) return <SplashScreen onComplete={handleSplashComplete} />;
  if (showWelcome) return <WelcomeIntro onComplete={handleWelcomeComplete} />;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[hsl(152_72%_35%_/_0.35)] blur-3xl animate-aurora" />
        <div
          className="absolute -bottom-24 -right-16 w-[22rem] h-[22rem] rounded-full bg-[hsl(42_82%_50%_/_0.22)] blur-3xl animate-aurora"
          style={{ animationDelay: "1.4s" }}
        />
      </div>

      <div className="flex flex-col items-center gap-5 animate-blur-in">
        <div
          className="relative w-20 h-20 rounded-[22px] overflow-hidden ring-1 ring-[hsl(var(--gold)/0.35)]"
          style={{ boxShadow: "0 25px 60px -15px hsl(42 82% 45% / 0.55)" }}
        >
          <img src={jhLogo} alt="Jeux d'Hazard" className="w-full h-full object-cover" />
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--gold))]" />
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.35em] text-foreground/45">
          <ShieldCheck className="w-3 h-3" /> Sécurisé · Premium
        </p>
      </div>
    </div>
  );
};

export default Index;
