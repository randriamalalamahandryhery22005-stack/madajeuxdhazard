import { Crown, Gauge, Layers, Rocket, ShieldCheck, Sparkles, Target, TrendingUp, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LevelId, LevelRecommendation } from "@/lib/aviatorLevels";

interface LevelCardMeta {
  id: LevelId;
  name: string;
  tagline: string;
  Icon: LucideIcon;
  accent: string; // hex
  description: string;
  difficulty: string;
  difficultyLevel: number; // 1-4
  precision: string;
  /** Méthode de calcul — affichée uniquement pour le Niveau 1 (confidentielle pour les Niveaux 2 et 3). */
  calculation?: string;
  usage: string;
}

const LEVELS: LevelCardMeta[] = [
  {
    id: 1,
    name: "Niveau 1",
    tagline: "Analyse Standard",
    Icon: Target,
    accent: "#00D084",
    description:
      "Moteur historique entièrement recalibré. Projection courte sur les tours suivants avec une lecture fine de la structure du marché et un contrôle strict de la dérive statistique.",
    difficulty: "Facile",
    difficultyLevel: 1,
    precision: "88 – 95 %",
    calculation: "Projection courte pondérée · double passage",
    usage: "Idéal quand le marché est calme, régulier, dominé par des coefficients sous 3.00x.",
  },
  {
    id: 2,
    name: "Niveau 2",
    tagline: "Double Projection",
    Icon: Layers,
    accent: "#F4C542",
    description:
      "Déclenché par un coefficient supérieur à 5.00x. Le moteur projette deux fenêtres temporelles distinctes et livre un résultat principal fiable accompagné d'un indice haut.",
    difficulty: "Moyen",
    difficultyLevel: 2,
    precision: "86 – 96 %",
    // Méthode de calcul volontairement non affichée (confidentielle).
    usage: "Recommandé sur un marché équilibré avec des pics réguliers entre 2.00x et 5.00x.",
  },
  {
    id: 3,
    name: "Niveau 3",
    tagline: "Frappe Haute",
    Icon: Rocket,
    accent: "#FF5C7A",
    description:
      "Moteur agressif indépendant. Déclenché par un coefficient supérieur à 5.00x, il vise un résultat unique dans la zone haute et fournit un indice de protection.",
    difficulty: "Expert",
    difficultyLevel: 4,
    precision: "82 – 95 %",
    // Méthode de calcul volontairement non affichée (confidentielle).
    usage: "À privilégier lors des cycles explosifs, forte volatilité et séries bleues prolongées.",
  },
];

interface Props {
  recommendation: LevelRecommendation;
  onSelect: (level: LevelId) => void;
}

const AviatorLevelSelect = ({ recommendation, onSelect }: Props) => {
  return (
    <div className="space-y-4">
      {/* Bandeau de recommandation */}
      <div
        className="luxe-card luxe-card-gold relative overflow-hidden p-4"
        style={{ animation: "fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <div
          className="absolute -top-16 -right-12 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(244,197,66,0.28), transparent 65%)" }}
        />
        <div className="relative flex items-start gap-3">
          <div className="luxe-icon-badge luxe-icon-badge-gold shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.22em] luxe-gold font-bold">Recommandation du moteur</p>
            <h3 className="text-lg font-black luxe-gold-text leading-tight">{recommendation.title}</h3>
            <p className="text-[11px] text-white/65 leading-relaxed mt-1.5">{recommendation.reason}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[#F4C542]/20 bg-black/30 px-3 py-2">
                <p className="text-[8px] uppercase tracking-widest text-white/45 font-bold">Confiance</p>
                <p className="text-sm font-black luxe-emerald-text">{recommendation.confidence}</p>
              </div>
              <div className="rounded-xl border border-[#F4C542]/20 bg-black/30 px-3 py-2">
                <p className="text-[8px] uppercase tracking-widest text-white/45 font-bold">Précision estimée</p>
                <p className="text-sm font-black luxe-gold-text tabular-nums">{recommendation.precision} %</p>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] font-semibold text-white/80 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 luxe-emerald" />
              Lancez maintenant l'analyse avec le {recommendation.title.split("·")[0].trim()}.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-3.5 h-3.5 luxe-gold" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/55 font-bold">Sélection du niveau d'analyse</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {LEVELS.map((lv, i) => {
          const isReco = lv.id === recommendation.level;
          return (
            <button
              key={lv.id}
              onClick={() => onSelect(lv.id)}
              className="luxe-card relative overflow-hidden text-left w-full p-4 transition-transform duration-300 active:scale-[0.985] hover:-translate-y-0.5"
              style={{
                animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
                animationDelay: `${100 + i * 90}ms`,
                borderColor: isReco ? `${lv.accent}66` : undefined,
                boxShadow: isReco ? `0 18px 50px -22px ${lv.accent}` : undefined,
              }}
            >
              <span
                className="absolute -top-20 -right-16 w-52 h-52 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${lv.accent}33, transparent 68%)` }}
              />
              {isReco && (
                <span
                  className="absolute top-3 right-3 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                  style={{ background: `${lv.accent}22`, color: lv.accent, border: `1px solid ${lv.accent}55` }}
                >
                  Recommandé
                </span>
              )}

              <div className="relative flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: `linear-gradient(140deg, ${lv.accent}33, rgba(0,0,0,0.5))`,
                    border: `1px solid ${lv.accent}55`,
                    boxShadow: `0 0 24px -6px ${lv.accent}`,
                  }}
                >
                  <lv.Icon className="w-6 h-6" style={{ color: lv.accent }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.22em] font-bold" style={{ color: lv.accent }}>
                    {lv.tagline}
                  </p>
                  <h4 className="text-base font-black text-white leading-tight">{lv.name}</h4>
                </div>
              </div>

              <p className="relative text-[11px] text-white/62 leading-relaxed mt-3">{lv.description}</p>

              <div className="relative mt-3 grid grid-cols-2 gap-2">
                <Meta label="Difficulté" icon={<Gauge className="w-3 h-3" />} accent={lv.accent}>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 4 }).map((_, k) => (
                      <span
                        key={k}
                        className="w-1.5 h-3 rounded-sm"
                        style={{ background: k < lv.difficultyLevel ? lv.accent : "rgba(255,255,255,0.14)" }}
                      />
                    ))}
                    <span className="ml-1.5 text-[11px] font-black text-white">{lv.difficulty}</span>
                  </span>
                </Meta>
                <Meta label="Précision" icon={<TrendingUp className="w-3 h-3" />} accent={lv.accent}>
                  <span className="text-[11px] font-black text-white tabular-nums">{lv.precision}</span>
                </Meta>
              </div>

              <div className="relative mt-2 space-y-1.5">
                {lv.calculation && (
                  <Line icon={<Sparkles className="w-3 h-3" />} accent={lv.accent} label="Calcul" value={lv.calculation} />
                )}
                <Line icon={<ShieldCheck className="w-3 h-3" />} accent={lv.accent} label="Conseil" value={lv.usage} />
              </div>


              <div
                className="relative mt-3 h-10 rounded-xl flex items-center justify-center text-[12px] font-black uppercase tracking-widest"
                style={{
                  background: `linear-gradient(90deg, ${lv.accent}22, ${lv.accent}0a)`,
                  border: `1px solid ${lv.accent}44`,
                  color: lv.accent,
                }}
              >
                Lancer le {lv.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Meta = ({
  label,
  icon,
  accent,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl border bg-black/30 px-3 py-2" style={{ borderColor: `${accent}22` }}>
    <div className="flex items-center gap-1 mb-0.5" style={{ color: accent }}>
      {icon}
      <span className="text-[8px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    {children}
  </div>
);

const Line = ({
  icon,
  accent,
  label,
  value,
}: {
  icon: React.ReactNode;
  accent: string;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5 shrink-0" style={{ color: accent }}>
      {icon}
    </span>
    <p className="text-[10.5px] text-white/60 leading-snug">
      <span className="font-bold text-white/85">{label} : </span>
      {value}
    </p>
  </div>
);

export default AviatorLevelSelect;
