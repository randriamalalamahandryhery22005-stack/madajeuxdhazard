import InteractiveTutorialPlayer, { TutorialStep } from "./InteractiveTutorialPlayer";

const basicSteps: TutorialStep[] = [
  { narration: "Bienvenue dans le tutoriel Aviator Basique. Je vais vous montrer comment générer une prédiction en quelques secondes." },
  { narration: "Première étape : entrez l'heure exacte affichée sur votre plateforme de paris, par exemple quatorze heures trente.", time: "14:30" },
  { narration: "Deuxième étape : entrez le coefficient observé en cours de partie, ici un point quatre vingts.", coeff: "1.80" },
  { narration: "Et voilà ! Le système calcule instantanément la prédiction la plus probable. Vous pouvez l'utiliser pour placer votre prochaine mise.", reveal: true, predicted: "2.15x" },
  { narration: "Le mode Basique est idéal pour démarrer. Bonne chance et jouez de manière responsable !" },
];

const proSteps: TutorialStep[] = [
  { narration: "Voici le tutoriel Aviator Professionnel. Ce mode utilise un algorithme avancé pour des prédictions plus précises." },
  { narration: "Saisissez d'abord l'heure exacte, par exemple seize heures quarante cinq.", time: "16:45" },
  { narration: "Ensuite entrez un coefficient plus élevé, comme deux point cinquante.", coeff: "2.50" },
  { narration: "Le moteur Pro analyse les tendances et génère une prédiction enrichie avec le niveau de confiance.", reveal: true, predicted: "3.85x" },
  { narration: "Le mode Professionnel nécessite un abonnement actif. Profitez de la précision avancée pour optimiser vos mises." },
];

const premiumSteps: TutorialStep[] = [
  { narration: "Découvrez Aviator Premium, l'expérience la plus complète avec Temps Réel et Temps Équilibré." },
  { narration: "Choisissez votre mode puis entrez l'heure courante, par exemple dix neuf heures zéro cinq.", time: "19:05" },
  { narration: "Indiquez maintenant un coefficient élevé, comme cinq point zéro zéro.", coeff: "5.00" },
  { narration: "Le système Premium fusionne les signaux temps réel et l'analyse équilibrée pour proposer la prédiction la plus fiable.", reveal: true, predicted: "12.40x" },
  { narration: "Avec Aviator Premium, vous accédez automatiquement aux trois modes : Professionnel, Temps Réel et Temps Équilibré." },
];

const AviatorTutorials = () => {
  return (
    <div className="space-y-4">
      <InteractiveTutorialPlayer
        title="Aviator Basique"
        subtitle="Tutoriel interactif narré"
        steps={basicSteps}
        accent="emerald"
      />
      <InteractiveTutorialPlayer
        title="Aviator Professionnel"
        subtitle="Algorithme avancé"
        steps={proSteps}
        accent="gold"
      />
      <InteractiveTutorialPlayer
        title="Aviator Premium"
        subtitle="Temps Réel + Temps Équilibré"
        steps={premiumSteps}
        accent="amber"
      />
    </div>
  );
};

export default AviatorTutorials;
