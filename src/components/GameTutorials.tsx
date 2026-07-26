import InteractiveTutorialPlayer, { TutorialStep } from "./InteractiveTutorialPlayer";

const cosmoxSteps: TutorialStep[] = [
  { narration: "Bienvenue dans le tutoriel CosmoX. Découvrez les prédictions cosmiques en quelques étapes." },
  { narration: "Étape une : entrez l'heure courante affichée sur la plateforme, par exemple quinze heures vingt.", time: "15:20" },
  { narration: "Étape deux : entrez le coefficient observé, ici deux point dix.", coeff: "2.10" },
  { narration: "L'algorithme cosmique analyse les données et propose une prédiction fiable.", reveal: true, predicted: "3.20x" },
  { narration: "Utilisez la prédiction CosmoX pour optimiser votre prochaine mise. Bonne chance !" },
];

const jetxSteps: TutorialStep[] = [
  { narration: "Voici le tutoriel JetX. Ce mode prédit la trajectoire de vol avec précision." },
  { narration: "Saisissez l'heure exacte, par exemple dix sept heures dix.", time: "17:10" },
  { narration: "Entrez ensuite le coefficient en cours, comme un point quatre vingt dix.", coeff: "1.90" },
  { narration: "Le moteur JetX calcule la trajectoire probable et affiche la prédiction.", reveal: true, predicted: "2.65x" },
  { narration: "JetX est idéal pour les vols courts et moyens. Jouez de manière responsable." },
];

const virtuelSteps: TutorialStep[] = [
  { narration: "Bienvenue dans le tutoriel Virtuel Football. Prédisez les résultats des matchs simulés." },
  { narration: "Sélectionnez d'abord une ligue parmi les huit disponibles, puis choisissez votre match." },
  { narration: "Indiquez les cotes du match, par exemple un point quatre vingts pour l'équipe à domicile.", coeff: "1.80" },
  { narration: "L'analyse statistique pondérée propose le score le plus probable et le gagnant.", reveal: true, predicted: "2-1" },
  { narration: "Virtuel Football vous donne un avantage stratégique sur chaque rencontre simulée." },
];

const penaltySteps: TutorialStep[] = [
  { narration: "Découvrez le tutoriel Penalty ShootOut. Anticipez la direction de chaque tir." },
  { narration: "Choisissez d'abord la difficulté : facile, moyen ou difficile selon votre niveau." },
  { narration: "Entrez l'heure courante de la partie, par exemple vingt heures quinze.", time: "20:15" },
  { narration: "Le système analyse les probabilités et révèle la direction la plus probable.", reveal: true, predicted: "↗️ 78%" },
  { narration: "Suivez les recommandations Penalty ShootOut pour maximiser vos chances." },
];

interface Props {
  game: "cosmox" | "jetx" | "virtuel" | "penalty";
}

const configs = {
  cosmox:  { title: "CosmoX",          subtitle: "Prédictions cosmiques",       steps: cosmoxSteps,  accent: "blue"    as const },
  jetx:    { title: "JetX",            subtitle: "Prédictions de vol",          steps: jetxSteps,    accent: "amber"   as const },
  virtuel: { title: "Virtuel Football",subtitle: "Analyse de matchs simulés",   steps: virtuelSteps, accent: "emerald" as const },
  penalty: { title: "Penalty ShootOut",subtitle: "Direction des tirs au but",   steps: penaltySteps, accent: "gold"    as const },
};

const GameTutorial = ({ game }: Props) => {
  const cfg = configs[game];
  return (
    <div className="px-5 pb-4">
      <InteractiveTutorialPlayer
        title={cfg.title}
        subtitle={cfg.subtitle}
        steps={cfg.steps}
        accent={cfg.accent}
      />
    </div>
  );
};

export default GameTutorial;
