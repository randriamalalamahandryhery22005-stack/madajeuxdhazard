import { useState } from "react";
import { Sparkles, Clock, BarChart3, Database, Info, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BasicModeIntroProps {
  onContinue: () => void;
}

/**
 * Short presentation shown before the user accesses the Basic mode.
 * Explains that the data comes from real game times and coefficients
 * — the system analyses real data, it does NOT invent it.
 */
const BasicModeIntro = ({ onContinue }: BasicModeIntroProps) => {
  const [step, setStep] = useState(0);

  const slides = [
    {
      icon: Clock,
      title: "Données temps réel",
      text: "Les prédictions s'appuient sur les heures réelles du jeu Aviator — pas de chiffres inventés.",
    },
    {
      icon: BarChart3,
      title: "Coefficients réels",
      text: "Les coefficients utilisés correspondent aux valeurs réellement observées dans le jeu.",
    },
    {
      icon: Database,
      title: "Analyse intelligente",
      text: "Notre système analyse les données disponibles pour vous fournir des informations utiles.",
    },
  ];

  const isLast = step === slides.length - 1;
  const S = slides[step];

  return (
    <div className="fixed inset-0 z-[90] bg-background/85 backdrop-blur-md flex items-end sm:items-center justify-center px-4 pb-6 pt-10">
      <div
        className="relative w-full max-w-md rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-2xl shadow-primary/20"
        style={{ animation: "fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl gold-gradient flex items-center justify-center shadow-lg shadow-primary/30">
            <Info className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Avant de commencer</p>
            <h2 className="text-base font-black tracking-tight">Mode Basique</h2>
          </div>
        </div>

        <div key={step} className="rounded-2xl border border-border/40 bg-secondary/30 p-5 mb-5 text-center space-y-3"
          style={{ animation: "fade-up 0.4s ease forwards" }}>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <S.icon className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-bold">{S.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{S.text}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 mb-5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="space-y-2">
          {isLast ? (
            <Button variant="premium" className="w-full h-12 font-bold" onClick={onContinue}>
              <Play className="w-4 h-4 mr-2" /> Accéder au Mode Basique
            </Button>
          ) : (
            <Button variant="premium" className="w-full h-12 font-bold" onClick={() => setStep((s) => s + 1)}>
              Suivant <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          )}
          {!isLast && (
            <button
              onClick={onContinue}
              className="block mx-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Passer la présentation
            </button>
          )}
          {isLast && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 pt-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Données réelles · Analyse fiable</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicModeIntro;