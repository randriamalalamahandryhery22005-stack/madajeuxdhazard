import { useState } from "react";
import { Play, BookOpen, ChevronDown, Clock, Target, Lightbulb, CheckCircle2, Video } from "lucide-react";

interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: string[];
  videoUrl: string | null;
  duration: string;
  difficulty: "Facile" | "Intermédiaire" | "Avancé";
  difficultyColor: string;
}

const tutorials: Tutorial[] = [
  {
    id: "aviator-basic",
    title: "Aviator — Mode Basique",
    description: "Apprenez à utiliser le mode Basique pour générer des prédictions Aviator avec l'heure et le coefficient.",
    steps: [
      "Accédez au jeu Aviator depuis l'écran principal",
      "Sélectionnez le mode Basique",
      "Entrez l'heure actuelle (HH:MM) affichée sur le site de paris",
      "Entrez le coefficient observé en cours",
      "Cliquez sur Prédire pour obtenir les résultats",
      "Utilisez les prédictions affichées pour placer vos mises"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WcXgQ",
    duration: "3 min",
    difficulty: "Facile",
    difficultyColor: "text-green-400 bg-green-500/10 border-green-500/20",
  },
  {
    id: "aviator-pro",
    title: "Aviator — Mode Professionnel",
    description: "Le mode Pro offre des prédictions plus précises avec des algorithmes avancés et l'analyse de tendances.",
    steps: [
      "Sélectionnez le mode Professionnel (abonnement requis)",
      "Entrez l'heure exacte affichée sur la plateforme",
      "Entrez le coefficient actuel",
      "Le système analyse les données avec un algorithme avancé",
      "Les résultats incluent le niveau de confiance et la fiabilité",
      "Suivez les recommandations de mise indiquées"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WcXgQ",
    duration: "5 min",
    difficulty: "Intermédiaire",
    difficultyColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "aviator-premium",
    title: "Aviator Premium — Temps Réel & Équilibré",
    description: "Modes avancés avec synchronisation en temps réel et algorithme d'équilibrage pour une précision maximale.",
    steps: [
      "Accédez à Aviator Premium depuis l'écran principal",
      "Choisissez entre Temps Réel ou Mode Équilibré",
      "En Temps Réel : les prédictions se mettent à jour automatiquement",
      "En Mode Équilibré : entrez vos données pour un calcul optimisé",
      "Observez les indicateurs de stabilité et de risque",
      "Les prédictions Premium ont le taux de précision le plus élevé"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WcXgQ",
    duration: "6 min",
    difficulty: "Avancé",
    difficultyColor: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  {
    id: "cosmox",
    title: "CosmoX — Prédictions Cosmiques",
    description: "Comment utiliser CosmoX pour générer des prédictions avec l'analyse multi-facteurs.",
    steps: [
      "Ouvrez CosmoX depuis la page des jeux",
      "Entrez l'heure et le coefficient observés",
      "Le système utilise une analyse multi-facteurs",
      "Consultez les résultats avec le niveau de fiabilité",
      "Appliquez les prédictions sur la plateforme de paris"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WcXgQ",
    duration: "3 min",
    difficulty: "Facile",
    difficultyColor: "text-green-400 bg-green-500/10 border-green-500/20",
  },
  {
    id: "jetx",
    title: "JetX — Prédictions de Vol",
    description: "Apprenez à prédire les trajectoires JetX avec les outils d'analyse intégrés.",
    steps: [
      "Accédez à JetX depuis l'écran principal",
      "Entrez les données de vol actuelles",
      "Le système calcule la trajectoire probable",
      "Consultez le coefficient prédit et le niveau de risque",
      "Suivez les indications pour optimiser vos mises"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WcXgQ",
    duration: "3 min",
    difficulty: "Facile",
    difficultyColor: "text-green-400 bg-green-500/10 border-green-500/20",
  },
  {
    id: "penalty",
    title: "Penalty ShootOut — Tirs au But",
    description: "Comment utiliser les prédictions probabilistes pour les séances de tirs au but.",
    steps: [
      "Accédez à Penalty ShootOut depuis les jeux",
      "Entrez les paramètres de la séance en cours",
      "Le système analyse les probabilités de chaque tir",
      "Consultez le score prédit et la probabilité de victoire",
      "Utilisez les indicateurs pour placer vos mises"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WcXgQ",
    duration: "3 min",
    difficulty: "Facile",
    difficultyColor: "text-green-400 bg-green-500/10 border-green-500/20",
  },
  {
    id: "studio-spribe",
    title: "Aviator Studio & Spribe (1XBET)",
    description: "Guide d'utilisation des modes Studio et Spribe dédiés à la plateforme 1XBET.",
    steps: [
      "Accédez à Aviator Studio ou Spribe depuis la section 1XBET",
      "Studio : choisissez entre Temps Réel et Équilibré",
      "Spribe : entrez HH:MM:SS et le coefficient",
      "Les algorithmes sont optimisés spécifiquement pour 1XBET",
      "Consultez les résultats avec indicateurs de confiance",
      "Appliquez les prédictions directement sur 1XBET"
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WcXgQ",
    duration: "6 min",
    difficulty: "Avancé",
    difficultyColor: "text-red-400 bg-red-500/10 border-red-500/20",
  },
];

const TutorialSection = () => {
  const [openTutorial, setOpenTutorial] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <BookOpen className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold">Tutoriels & Guides</h2>
      </div>

      <p className="text-xs text-muted-foreground px-1">
        Apprenez à utiliser chaque système de prédiction grâce à nos guides détaillés et vidéos explicatives.
      </p>

      <div className="space-y-2">
        {tutorials.map((tut) => {
          const isOpen = openTutorial === tut.id;

          return (
            <div
              key={tut.id}
              className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                isOpen
                  ? "border-primary/20 bg-card shadow-lg"
                  : "border-border/30 bg-card/60 hover:bg-card"
              }`}
            >
              {/* Header */}
              <button
                onClick={() => setOpenTutorial(isOpen ? null : tut.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{tut.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" /> {tut.duration}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${tut.difficultyColor}`}>
                      {tut.difficulty}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Expanded Content */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-4" style={{ animation: "fade-up 0.3s ease forwards" }}>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tut.description}</p>

                  {/* Video Player */}
                  {tut.videoUrl && (
                    <div className="rounded-xl overflow-hidden border border-border/30 bg-secondary/30">
                      {playingVideo === tut.id ? (
                        <div className="aspect-video">
                          <iframe
                            src={tut.videoUrl}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={`Tutoriel ${tut.title}`}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setPlayingVideo(tut.id)}
                          className="w-full aspect-video flex flex-col items-center justify-center gap-3 hover:bg-secondary/50 transition-colors group"
                        >
                          <div className="w-14 h-14 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/25 transition-all">
                            <Play className="w-6 h-6 text-primary ml-0.5" />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold text-foreground">Regarder le tutoriel</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-center mt-0.5">
                              <Video className="w-3 h-3" /> Durée : {tut.duration}
                            </p>
                          </div>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Steps */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Lightbulb className="w-3 h-3 text-primary" />
                      Étapes à suivre
                    </div>
                    <div className="space-y-1.5">
                      {tut.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                          <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                          </div>
                          <p className="leading-relaxed pt-0.5">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tip */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Target className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-primary">Conseil :</span> Pour de meilleurs résultats, assurez-vous d'entrer les données exactes affichées sur la plateforme de paris.
                    </p>
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

export default TutorialSection;
