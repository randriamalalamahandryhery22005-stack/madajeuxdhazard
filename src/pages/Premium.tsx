import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Crown, Check, X, Sparkles, Shield, ArrowLeft, ArrowRight, Gem,
  LayoutDashboard, CreditCard, History, LifeBuoy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import SubscriptionWizard from "@/components/SubscriptionWizard";
import { usePremiumAccess } from "@/lib/premiumAccess";
import PremiumDashboard from "@/components/premium/PremiumDashboard";
import PremiumHistory from "@/components/premium/PremiumHistory";
import PremiumHelp from "@/components/premium/PremiumHelp";

const COMPARE: { label: string; free: boolean | string; premium: boolean | string }[] = [
  { label: "Aviator Basique (10/jour)", free: true, premium: true },
  { label: "Aviator Premium / Pro / Spribe", free: false, premium: true },
  { label: "CosmoX, JetX", free: false, premium: true },
  { label: "Fréquence des prédictions", free: "limitée", premium: "illimitée" },
  { label: "Activation automatique", free: false, premium: true },
  { label: "Support admin", free: "standard", premium: "prioritaire" },
];

type PlanId = "premium-global" | "premium-lifetime";

interface Plan {
  id: PlanId;
  days: number;
  price: number;
  label: string;
  tagline: string;
  popular?: boolean;
  lifetime?: boolean;
}

const DAILY_RATE = 30000 / 31; // Ar / jour
const priceFor = (d: number) => Math.round(d * DAILY_RATE);

export const LIFETIME_PRICE = 45000;

const PLANS: Plan[] = [
  { id: "premium-global", days: 7,   price: priceFor(7),   label: "Découverte",   tagline: "1 semaine" },
  { id: "premium-global", days: 15,  price: priceFor(15),  label: "Standard",     tagline: "2 semaines" },
  { id: "premium-global", days: 30,  price: priceFor(30),  label: "Mensuel",      tagline: "1 mois", popular: true },
  { id: "premium-lifetime", days: 0, price: LIFETIME_PRICE, label: "À Vie", tagline: "Accès permanent, sans expiration", lifetime: true },
];

const renderCell = (v: boolean | string, premium: boolean) => {
  if (v === true) return <Check className={`w-4 h-4 mx-auto ${premium ? "text-primary" : "text-green-400"}`} />;
  if (v === false) return <X className="w-4 h-4 mx-auto text-muted-foreground/40" />;
  return <span className={`text-[10px] font-semibold ${premium ? "gold-text" : "text-muted-foreground"}`}>{v}</span>;
};

const Premium = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const access = usePremiumAccess();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const initialTab = (location.hash || "").replace("#", "") || "dashboard";
  const [tab, setTab] = useState<string>(initialTab);
  useEffect(() => {
    const h = (location.hash || "").replace("#", "");
    if (h && ["dashboard", "plans", "history", "help"].includes(h)) setTab(h);
  }, [location.hash]);

  if (selectedPlan) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
          <button onClick={() => setSelectedPlan(null)} className="p-2 rounded-lg hover:bg-secondary/60">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold">
            Souscription Premium <span className="text-muted-foreground font-normal">· {selectedPlan.label}</span>
          </h1>
        </div>
        <SubscriptionWizard
          gameMode={selectedPlan.id}
          gameName={selectedPlan.lifetime ? "Premium À Vie" : "Premium"}
          days={selectedPlan.lifetime ? 0 : selectedPlan.days}
          price={selectedPlan.price}
          lifetime={selectedPlan.lifetime}
          onAccessGranted={() => { setSelectedPlan(null); setTab("dashboard"); }}
          onCancel={() => setSelectedPlan(null)}
        />
      </div>
    );
  }

  const handleSelect = (p: Plan) => {
    if (!user) { navigate("/login"); return; }
    setSelectedPlan(p);
  };

  const goSubscribe = () => setTab("plans");

  const PlansSection = (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Choisissez la durée</h2>
        <p className="text-[11px] text-muted-foreground -mt-1">Sélectionnez une formule, puis suivez les étapes : paiement → preuve → validation admin.</p>
        <div className="grid grid-cols-2 gap-2.5">
          {PLANS.filter((p) => !p.lifetime).map((p, i) => (
            <button
              key={i}
              onClick={() => handleSelect(p)}
              className={`relative text-left luxe-card p-3 transition-all active:scale-[0.97] ${
                p.popular ? "luxe-card-gold" : "luxe-card-emerald"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-2 right-2 luxe-badge-premium">Populaire</div>
              )}
              <div className="text-[9px] uppercase tracking-widest text-white/55 font-semibold">{p.label}</div>
              <div className="text-2xl font-black mt-0.5 leading-none flex items-baseline gap-1 text-white">
                {p.days}<span className="text-xs font-medium text-white/50">j</span>
              </div>
              <div className="text-[9px] text-white/55 mt-0.5">{p.tagline}</div>
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="text-base font-black luxe-gold-text leading-none">{p.price.toLocaleString()}<span className="text-[10px]"> Ar</span></div>
                <div className="text-[8px] text-white/50 mt-0.5">{Math.round(p.price / p.days).toLocaleString()} Ar/jour</div>
              </div>
            </button>
          ))}
        </div>

        {PLANS.filter((p) => p.lifetime).map((p, i) => (
          <button
            key={`life-${i}`}
            onClick={() => handleSelect(p)}
            className="relative w-full text-left luxe-card luxe-card-lg luxe-card-gold p-4 active:scale-[0.98] transition"
          >
            <div className="absolute -top-2.5 left-4 luxe-badge-premium flex items-center gap-1">
              <Gem className="w-2.5 h-2.5" /> Offre à vie
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-white/55 font-semibold">{p.label}</div>
                <div className="text-2xl font-black mt-0.5 flex items-baseline gap-1.5 text-white">
                  À <span className="luxe-gold-text">vie</span>
                </div>
                <div className="text-[10px] text-white/55 mt-0.5">{p.tagline}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-black luxe-gold-text">{p.price.toLocaleString()}<span className="text-xs"> Ar</span></div>
                <div className="text-[9px] text-white/50">paiement unique</div>
              </div>
            </div>
          </button>
        ))}


      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-white/55 font-bold">Comment souscrire — 6 étapes</h2>
        <ol className="space-y-2.5">
          {[
            { t: "Présentation Premium", d: "Découvrez tous les avantages inclus." },
            { t: "Choix de la durée", d: "Sélectionnez une formule ou l'option À Vie." },
            { t: "Moyen de paiement", d: "Yas ou Airtel Money — numéros affichés." },
            { t: "Confirmation du paiement", d: "Numéro de transaction + capture d'écran." },
            { t: "Vérification", d: "Contrôle automatique de votre paiement." },
            { t: "Activation", d: "Tous les services Premium débloqués." },
          ].map((s, i) => (
            <li key={i} className="flex gap-3 p-3 luxe-card">
              <div className="w-7 h-7 shrink-0 luxe-icon-badge text-[11px] font-black">
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{s.t}</div>
                <div className="text-[11px] text-white/55 leading-snug">{s.d}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-white/55 font-bold">Free vs Premium</h2>
        <div className="luxe-card overflow-hidden">
          <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr] px-3 py-2.5 bg-white/5 text-[10px] uppercase tracking-wider font-bold text-white/55">
            <span>Fonctionnalité</span>
            <span className="text-center">Free</span>
            <span className="text-center luxe-gold-text">Premium</span>
          </div>
          {COMPARE.map((row, i) => (
            <div key={i} className="grid grid-cols-[1.6fr_0.7fr_0.7fr] px-3 py-2.5 text-[11px] border-t border-white/8 items-center">
              <span className="text-white/85">{row.label}</span>
              <span className="text-center">{renderCell(row.free, false)}</span>
              <span className="text-center">{renderCell(row.premium, true)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="luxe-card luxe-card-gold p-5 text-center space-y-3">
          <Sparkles className="w-6 h-6 luxe-gold mx-auto luxe-float" />
          <p className="text-sm font-semibold text-white">Prêt à débloquer tous les services Premium ?</p>
          <p className="text-[11px] text-white/55">Paiement Yas / Airtel Money — activation rapide.</p>
          <Button
            className="luxe-btn w-full h-12 font-bold"
            onClick={() => handleSelect(PLANS.find((p) => p.popular) || PLANS[0])}
          >
            <Crown className="w-4 h-4 mr-2" /> Souscrire maintenant <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Link to="/games" className="block text-[11px] text-white/55 hover:text-white">
            Continuer avec le plan gratuit →
          </Link>
        </div>
      </section>

    </div>
  );

  void access; // status handled inside dashboard component

  return (
    <div className="premium-scope luxe-page min-h-screen pb-24 relative overflow-hidden text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 -left-20 w-96 h-96 rounded-full bg-[#00D084]/25 blur-[120px]" />
      <div className="pointer-events-none absolute top-40 -right-24 w-96 h-96 rounded-full bg-[#F4C542]/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-[#00D084]/15 blur-[120px]" />

      <div className="relative px-4 pt-5 pb-4 flex items-start gap-3 pm-anim-slide">
        <button onClick={() => navigate(-1)} className="luxe-back shrink-0 mt-1" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.3em] luxe-gold font-bold">Tableau de bord</p>
          <h1 className="text-[27px] leading-tight font-black text-white tracking-tight">Espace Premium</h1>
          <p className="text-[12px] text-white/55 mt-0.5">Statut, statistiques et accès rapide</p>
        </div>
        <div className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-[#F4C542]/60 bg-[#F4C542]/8 luxe-gold text-[12px] font-black tracking-wide"
          style={{ boxShadow: "0 0 24px rgba(244,197,66,0.25)" }}>
          <Crown className="w-4 h-4" /> PREMIUM
        </div>
      </div>

      {isAdmin && (
        <div className="relative px-4 pb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00D084]/12 border border-[#00D084]/45 luxe-emerald text-[11px] font-semibold">
            <Shield className="w-3 h-3" /> Compte admin — accès total automatique
          </div>
        </div>
      )}


      <div className="relative px-4">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-14 luxe-card p-1 rounded-2xl">
            <TabsTrigger value="dashboard" className="rounded-xl text-[10px] flex-col gap-0.5 text-white/60 data-[state=active]:bg-[#00D084]/18 data-[state=active]:text-[#00D084] data-[state=active]:shadow-lg">
              <LayoutDashboard className="w-4 h-4" />
              <span>Tableau</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="rounded-xl text-[10px] flex-col gap-0.5 text-white/60 data-[state=active]:bg-[#F4C542]/18 data-[state=active]:text-[#F4C542] data-[state=active]:shadow-lg">
              <CreditCard className="w-4 h-4" />
              <span>Abonnement</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl text-[10px] flex-col gap-0.5 text-white/60 data-[state=active]:bg-[#00D084]/18 data-[state=active]:text-[#00D084] data-[state=active]:shadow-lg">
              <History className="w-4 h-4" />
              <span>Historique</span>
            </TabsTrigger>
            <TabsTrigger value="help" className="rounded-xl text-[10px] flex-col gap-0.5 text-white/60 data-[state=active]:bg-[#F4C542]/18 data-[state=active]:text-[#F4C542] data-[state=active]:shadow-lg">
              <LifeBuoy className="w-4 h-4" />
              <span>Aide</span>
            </TabsTrigger>
          </TabsList>


          <TabsContent value="dashboard" className="mt-5">
            <PremiumDashboard onSubscribe={goSubscribe} onNavigate={setTab} />
          </TabsContent>
          <TabsContent value="plans" className="mt-5">
            {PlansSection}
          </TabsContent>
          <TabsContent value="history" className="mt-5">
            <PremiumHistory />
          </TabsContent>
          <TabsContent value="help" className="mt-5">
            <PremiumHelp />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Premium;
