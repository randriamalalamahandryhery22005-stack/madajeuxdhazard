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


const penaltySteps: TutorialStep[] = [
  { narration: "Découvrez le tutoriel Penalty ShootOut. Anticipez la direction de chaque tir." },
  { narration: "Choisissez d'abord la difficulté : facile, moyen ou difficile selon votre niveau." },
  { narration: "Entrez l'heure courante de la partie, par exemple vingt heures quinze.", time: "20:15" },
  { narration: "Le système analyse les probabilités et révèle la direction la plus probable.", reveal: true, predicted: "↗️ 78%" },
  { narration: "Suivez les recommandations Penalty ShootOut pour maximiser vos chances." },
];

interface Props {
  game: "cosmox" | "jetx" | "penalty";
}

const configs = {
  cosmox:  { title: "CosmoX",          subtitle: "Prédictions cosmiques",       steps: cosmoxSteps,  accent: "blue"    as const },
  jetx:    { title: "JetX",            subtitle: "Prédictions de vol",          steps: jetxSteps,    accent: "amber"   as const },
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
