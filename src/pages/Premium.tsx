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
  { label: "CosmoX, JetX, Virtuel", free: false, premium: true },
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
              className={`relative text-left rounded-2xl p-3 border-2 transition-all active:scale-[0.97] backdrop-blur ${
                p.popular
                  ? "border-primary bg-gradient-to-br from-primary/20 via-primary/8 to-transparent shadow-lg glow-gold"
                  : "border-border/60 bg-card/70 hover:border-primary/50"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full gold-gradient text-[8px] font-black text-primary-foreground uppercase tracking-wider">
                  Populaire
                </div>
              )}
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">{p.label}</div>
              <div className="text-2xl font-black mt-0.5 leading-none flex items-baseline gap-1">
                {p.days}<span className="text-xs font-medium text-muted-foreground">j</span>
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{p.tagline}</div>
              <div className="mt-2 pt-2 border-t border-border/40">
                <div className="text-base font-black gold-text leading-none">{p.price.toLocaleString()}<span className="text-[10px]"> Ar</span></div>
                <div className="text-[8px] text-muted-foreground mt-0.5">{Math.round(p.price / p.days).toLocaleString()} Ar/jour</div>
              </div>
            </button>
          ))}
        </div>

        {PLANS.filter((p) => p.lifetime).map((p, i) => (
          <button
            key={`life-${i}`}
            onClick={() => handleSelect(p)}
            className="relative w-full text-left rounded-2xl p-4 border-2 border-amber-400/70 bg-gradient-to-br from-amber-500/20 via-amber-500/8 to-amber-500/5 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition backdrop-blur"
          >
            <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-[9px] font-black text-white uppercase tracking-wider flex items-center gap-1">
              <Gem className="w-2.5 h-2.5" /> Offre à vie
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{p.label}</div>
                <div className="text-2xl font-black mt-0.5 flex items-baseline gap-1.5">
                  À <span className="gold-text">vie</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{p.tagline}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-black gold-text">{p.price.toLocaleString()}<span className="text-xs"> Ar</span></div>
                <div className="text-[9px] text-muted-foreground">paiement unique</div>
              </div>
            </div>
          </button>
        ))}

      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Comment souscrire — 6 étapes</h2>
        <ol className="space-y-2.5">
          {[
            { t: "Présentation Premium", d: "Découvrez tous les avantages inclus." },
            { t: "Choix de la durée", d: "Sélectionnez une formule ou l'option À Vie." },
            { t: "Moyen de paiement", d: "Yas ou Airtel Money — numéros affichés." },
            { t: "Confirmation du paiement", d: "Numéro de transaction + capture d'écran." },
            { t: "Vérification", d: "Contrôle automatique de votre paiement." },
            { t: "Activation", d: "Tous les services Premium débloqués." },
          ].map((s, i) => (
            <li key={i} className="flex gap-3 p-3 rounded-2xl border border-border/40 bg-card/60 backdrop-blur">
              <div className="w-7 h-7 shrink-0 rounded-full gold-gradient flex items-center justify-center text-[11px] font-black text-primary-foreground">
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-bold">{s.t}</div>
                <div className="text-[11px] text-muted-foreground leading-snug">{s.d}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Free vs Premium</h2>
        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur overflow-hidden">
          <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr] px-3 py-2.5 bg-secondary/50 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            <span>Fonctionnalité</span>
            <span className="text-center">Free</span>
            <span className="text-center gold-text">Premium</span>
          </div>
          {COMPARE.map((row, i) => (
            <div key={i} className="grid grid-cols-[1.6fr_0.7fr_0.7fr] px-3 py-2.5 text-[11px] border-t border-border/40 items-center">
              <span className="text-foreground/90">{row.label}</span>
              <span className="text-center">{renderCell(row.free, false)}</span>
              <span className="text-center">{renderCell(row.premium, true)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="rounded-2xl p-5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/30 text-center space-y-3 backdrop-blur">
          <Sparkles className="w-6 h-6 text-primary mx-auto" />
          <p className="text-sm font-semibold">Prêt à débloquer tous les services Premium ?</p>
          <p className="text-[11px] text-muted-foreground">Paiement Yas / Airtel Money — activation rapide.</p>
          <Button
            variant="premium"
            className="w-full h-12 font-bold"
            onClick={() => handleSelect(PLANS.find((p) => p.popular) || PLANS[0])}
          >
            <Crown className="w-4 h-4 mr-2" /> Souscrire maintenant <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Link to="/games" className="block text-[11px] text-muted-foreground hover:text-foreground">
            Continuer avec le plan gratuit →
          </Link>
        </div>
      </section>
    </div>
  );

  void access; // status handled inside dashboard component

  return (
    <div className="premium-scope min-h-screen pb-24 relative overflow-hidden text-slate-100">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 -left-20 w-96 h-96 rounded-full bg-[hsl(var(--pm-violet)/0.35)] blur-[120px]" />
      <div className="pointer-events-none absolute top-40 -right-24 w-96 h-96 rounded-full bg-[hsl(var(--pm-blue)/0.30)] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-[hsl(var(--pm-gold)/0.15)] blur-[120px]" />

      <div className="relative px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/10 pm-ripple text-slate-200">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Menu Premium</span>
        <div className="w-8" />
      </div>

      <div className="relative px-5 pt-3 pb-5 text-center space-y-2 pm-anim-slide">
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-3xl pm-gradient-gold flex items-center justify-center mx-auto shadow-2xl pm-glow-gold pm-anim-float">
            <Crown className="w-10 h-10 text-slate-900" strokeWidth={2.5} />
          </div>
          <div className="absolute -top-1 -right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur border border-[hsl(var(--pm-gold)/0.5)] text-[9px] font-black pm-text-gold pm-anim-badge">
            PRO
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">
          Espace <span className="pm-text-gold">Premium</span>
        </h1>
        {isAdmin && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--pm-violet)/0.15)] border border-[hsl(var(--pm-violet)/0.4)] text-[hsl(var(--pm-violet))] text-[11px] font-semibold">
            <Shield className="w-3 h-3" /> Compte admin — accès total automatique
          </div>
        )}
      </div>

      <div className="relative px-4">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-14 pm-glass p-1 rounded-2xl border-white/10">
            <TabsTrigger value="dashboard" className="rounded-xl text-[10px] flex-col gap-0.5 pm-ripple text-slate-300 data-[state=active]:bg-[hsl(var(--pm-violet)/0.25)] data-[state=active]:text-white data-[state=active]:shadow-lg">
              <LayoutDashboard className="w-4 h-4" />
              <span>Tableau</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="rounded-xl text-[10px] flex-col gap-0.5 pm-ripple text-slate-300 data-[state=active]:bg-[hsl(var(--pm-gold)/0.25)] data-[state=active]:text-[hsl(var(--pm-gold))] data-[state=active]:shadow-lg">
              <CreditCard className="w-4 h-4" />
              <span>Abonnement</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl text-[10px] flex-col gap-0.5 pm-ripple text-slate-300 data-[state=active]:bg-[hsl(var(--pm-blue)/0.25)] data-[state=active]:text-[hsl(var(--pm-blue))] data-[state=active]:shadow-lg">
              <History className="w-4 h-4" />
              <span>Historique</span>
            </TabsTrigger>
            <TabsTrigger value="help" className="rounded-xl text-[10px] flex-col gap-0.5 pm-ripple text-slate-300 data-[state=active]:bg-[hsl(var(--pm-green)/0.25)] data-[state=active]:text-[hsl(var(--pm-green))] data-[state=active]:shadow-lg">
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
