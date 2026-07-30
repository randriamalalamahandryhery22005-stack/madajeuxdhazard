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


interface Props {
  game: "cosmox" | "jetx";
}

const configs = {
  cosmox:  { title: "CosmoX",          subtitle: "Prédictions cosmiques",       steps: cosmoxSteps,  accent: "blue"    as const },
  jetx:    { title: "JetX",            subtitle: "Prédictions de vol",          steps: jetxSteps,    accent: "amber"   as const },
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
