import { useState } from "react";
import { ChevronRight, History, Trophy, TrendingUp, Clock, BarChart3, Plane, Rocket, Zap, Globe2, Target, Clapperboard } from "lucide-react";
import aviatorLogo from "@/assets/aviator-logo.png";
import cosmoxLogo from "@/assets/cosmox-logo.png";
import jetxLogo from "@/assets/jetx-logo.png";
import virtuelLogo from "@/assets/virtuel-logo.png";
import aviatorPremiumLogo from "@/assets/aviator-premium-logo.png";

interface Platform {
  id: string;
  name: string;
  logo: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  features: string[];
  stats: { label: string; value: string }[];
}

const platforms: Platform[] = [
  {
    id: "aviator",
    name: "Aviator",
    logo: aviatorLogo,
    description: "Modes Basique et Professionnel avec analyse de coefficients et prédictions temporelles.",
    icon: Plane,
    color: "text-amber-400",
    bgColor: "from-amber-500/15 to-amber-900/5",
    borderColor: "border-amber-500/25",
    features: ["Calcul HH:MM", "Coefficient max", "Analyse de tendance"],
    stats: [
      { label: "Modes", value: "2" },
      { label: "Précision", value: "~85%" },
    ],
  },
  {
    id: "aviator-premium",
    name: "Aviator Premium",
    logo: aviatorPremiumLogo,
    description: "Modes Temps Réel et Équilibré avec algorithmes avancés pour une précision maximale.",
    icon: Trophy,
    color: "text-primary",
    bgColor: "from-amber-500/15 to-amber-900/5",
    borderColor: "border-primary/25",
    features: ["Temps réel", "Mode équilibré", "Algorithme IA"],
    stats: [
      { label: "Modes", value: "2" },
      { label: "Précision", value: "~92%" },
    ],
  },
  {
    id: "cosmox",
    name: "CosmoX",
    logo: cosmoxLogo,
    description: "Prédictions cosmiques avec analyse multi-facteurs et calcul de probabilités avancé.",
    icon: Rocket,
    color: "text-amber-400",
    bgColor: "from-amber-500/15 to-amber-900/5",
    borderColor: "border-amber-500/25",
    features: ["Multi-facteurs", "Probabilités", "Analyse cosmique"],
    stats: [
      { label: "Modes", value: "1" },
      { label: "Précision", value: "~88%" },
    ],
  },
  {
    id: "jetx",
    name: "JetX",
    logo: jetxLogo,
    description: "Prédictions de vol avec calcul de trajectoire et analyse de données en temps réel.",
    icon: Zap,
    color: "text-amber-400",
    bgColor: "from-amber-500/15 to-amber-900/5",
    borderColor: "border-amber-500/25",
    features: ["Trajectoire", "Données temps réel", "Coefficient"],
    stats: [
      { label: "Modes", value: "1" },
      { label: "Précision", value: "~86%" },
    ],
  },
  {
    id: "virtuel",
    name: "Virtuel Football",
    logo: virtuelLogo,
    description: "Prédictions de matchs virtuels avec 8 ligues et analyse de statistiques pondérées.",
    icon: Globe2,
    color: "text-emerald-400",
    bgColor: "from-emerald-500/15 to-emerald-900/5",
    borderColor: "border-emerald-500/25",
    features: ["8 ligues", "Stats pondérées", "Multi-matchs"],
    stats: [
      { label: "Ligues", value: "8" },
      { label: "Précision", value: "~80%" },
    ],
  },
  {
    id: "penalty",
    name: "Penalty ShootOut",
    logo: aviatorLogo,
    description: "Prédictions probabilistes pour les tirs au but avec analyse de tendances.",
    icon: Target,
    color: "text-green-400",
    bgColor: "from-green-500/15 to-green-900/5",
    borderColor: "border-green-500/25",
    features: ["Probabilités", "Analyse tendance", "Score prédit"],
    stats: [
      { label: "Modes", value: "1" },
      { label: "Précision", value: "~82%" },
    ],
  },
  {
    id: "studio-spribe",
    name: "Studio & Spribe",
    logo: aviatorPremiumLogo,
    description: "Aviator Studio (Temps réel + Équilibré) et Aviator Spribe (HH:MM:SS + Coeff) pour 1XBET.",
    icon: Clapperboard,
    color: "text-emerald-400",
    bgColor: "from-emerald-500/15 to-emerald-900/5",
    borderColor: "border-emerald-500/25",
    features: ["1XBET dédié", "4 sous-modes", "Calcul avancé"],
    stats: [
      { label: "Modes", value: "4" },
      { label: "Précision", value: "~90%" },
    ],
  },
];

const PlatformCategories = () => {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold">Plateformes & Catégories</h2>
      </div>

      <div className="space-y-2">
        {platforms.map((platform) => {
          const isOpen = expanded === platform.id;
          const Icon = platform.icon;

          return (
            <div
              key={platform.id}
              className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                isOpen
                  ? `${platform.borderColor} bg-gradient-to-br ${platform.bgColor} shadow-lg`
                  : "border-border/30 bg-card/60 hover:bg-card"
              }`}
            >
              {/* Header */}
              <button
                onClick={() => setExpanded(isOpen ? null : platform.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/50 p-1.5 flex items-center justify-center flex-shrink-0">
                  <img src={platform.logo} alt={platform.name} className="w-7 h-7 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${platform.color}`}>{platform.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{platform.description.slice(0, 50)}...</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-300 flex-shrink-0 ${isOpen ? "rotate-90" : ""}`} />
              </button>

              {/* Expanded Content */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-3" style={{ animation: "fade-up 0.3s ease forwards" }}>
                  <p className="text-xs text-muted-foreground leading-relaxed">{platform.description}</p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1.5">
                    {platform.features.map((f) => (
                      <span key={f} className="text-[9px] px-2 py-1 rounded-lg bg-secondary/60 border border-border/30 text-muted-foreground font-medium">
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-2">
                    {platform.stats.map((s) => (
                      <div key={s.label} className="flex-1 text-center p-2 rounded-lg bg-secondary/40 border border-border/20">
                        <p className="text-sm font-bold">{s.value}</p>
                        <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* History indicator */}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                    <History className="w-3 h-3" />
                    <span>Historique des prédictions disponible dans le jeu</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlatformCategories;
