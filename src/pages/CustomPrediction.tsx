import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PredictionResults from "@/components/PredictionResults";
import {
  generateCustomPrediction,
  type CustomPredictionType,
  type CustomPredictionConfig,
} from "@/lib/customPredictions";
import type { PredictionResult } from "@/lib/predictions";

const CustomPrediction = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { user, isAdmin } = useAuth();

  const [type, setType] = useState<CustomPredictionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [coeff, setCoeff] = useState("");
  const [results, setResults] = useState<PredictionResult[] | null>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!slug) { navigate("/games"); return; }

    (async () => {
      const { data, error } = await supabase
        .from("custom_predictions")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        toast.error("Prédiction introuvable");
        navigate("/games");
        return;
      }

      const fetched: CustomPredictionType = {
        ...data,
        config: (data.config as CustomPredictionConfig) ?? {},
      };
      setType(fetched);

      // Subscription check
      if (isAdmin || !fetched.requires_subscription) {
        setHasAccess(true);
      } else if (fetched.subscription_key) {
        const { data: access } = await supabase
          .from("game_access")
          .select("id, expires_at, is_active")
          .eq("user_id", user.id)
          .eq("game_mode", fetched.subscription_key)
          .eq("is_active", true)
          .maybeSingle();
        const valid = !!access && (!access.expires_at || new Date(access.expires_at) > new Date());
        setHasAccess(valid);
      }
      setLoading(false);
    })();
  }, [slug, user, isAdmin, navigate]);

  const handleGenerate = () => {
    if (!type) return;
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const c = parseFloat(coeff);
    if (Number.isNaN(h) || h < 0 || h > 23) { toast.error("Heure invalide (0-23)"); return; }
    if (Number.isNaN(m) || m < 0 || m > 59) { toast.error("Minute invalide (0-59)"); return; }
    if (Number.isNaN(c) || c < 1) { toast.error("Coefficient invalide"); return; }
    setResults(generateCustomPrediction(type, h, m, c, true));
  };

  if (loading || !type) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (results) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
          <button onClick={() => setResults(null)} className="p-2 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">{type.name}</h1>
        </div>
        <div className="flex-1 px-4 py-4 max-w-md w-full mx-auto">
          <PredictionResults
            results={results}
            title={type.name}
            onBack={() => setResults(null)}
            variant="pro"
          />
        </div>
        <div className="h-20" />
        <BottomNav />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
          <button onClick={() => navigate("/games")} className="p-2 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">{type.name}</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-bold">Abonnement requis</h2>
          <p className="text-xs text-muted-foreground max-w-xs">
            Cette prédiction nécessite un abonnement actif. Contactez l'administrateur.
          </p>
          <Button variant="premium" onClick={() => navigate("/games")}>Retour</Button>
        </div>
        <div className="h-20" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
        <button onClick={() => navigate("/games")} className="p-2 rounded-lg hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{type.name}</h1>
      </div>

      <div className="flex-1 px-5 py-6 max-w-md w-full mx-auto space-y-5">
        <div className="rounded-2xl bg-card border border-border/50 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm">{type.name}</p>
            {type.description && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{type.description}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Heure</label>
              <Input value={hour} onChange={(e) => setHour(e.target.value)} placeholder="HH" inputMode="numeric" maxLength={2} className="h-12 text-center font-mono text-lg" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Minute</label>
              <Input value={minute} onChange={(e) => setMinute(e.target.value)} placeholder="MM" inputMode="numeric" maxLength={2} className="h-12 text-center font-mono text-lg" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Dernier coefficient</label>
            <Input value={coeff} onChange={(e) => setCoeff(e.target.value)} placeholder="ex: 2.45" inputMode="decimal" className="h-12 text-center font-mono text-lg" />
          </div>
          <Button variant="premium" className="w-full h-12" onClick={handleGenerate}>
            Générer la prédiction
          </Button>
        </div>
      </div>
      <div className="h-20" />
      <BottomNav />
    </div>
  );
};

export default CustomPrediction;
