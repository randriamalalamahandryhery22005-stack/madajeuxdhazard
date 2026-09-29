import { ArrowLeft, Clock3, Gauge, Info, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GameResultTone = "aviator" | "cosmox" | "jetx";

export interface GamePredictionRow {
  time: string;
  coefficient: string;
  confidence: number;
  reliability: number;
  stability: string;
  risk: string;
  label?: string;
}

interface Props {
  title: string;
  rows: GamePredictionRow[];
  tone: GameResultTone;
  onRestart: () => void;
  eyebrow?: string;
}

const ensureResultTime = (value: string) => {
  const parts = value.split(":");
  if (parts.length === 2) return `${value}:00`;
  return parts.slice(0, 3).map((part) => part.padStart(2, "0")).join(":");
};

const GamePredictionResults = ({ title, rows, tone, onRestart, eyebrow = "Projection calculée" }: Props) => {
  const hideLastTime = rows.length >= 3;
  const previousTimes = rows.slice(0, 2).map((row) => ensureResultTime(row.time));

  return (
    <section className={`game-results game-tone-${tone}`} aria-labelledby="game-results-title">
      <header className="game-results__header">
        <div className="game-results__icon"><Sparkles /></div>
        <div className="min-w-0 flex-1">
          <p className="game-console-eyebrow">{eyebrow}</p>
          <h2 id="game-results-title" className="game-results__title">{title}</h2>
          <p className="game-results__count">{rows.length} indice{rows.length > 1 ? "s" : ""} calculé{rows.length > 1 ? "s" : ""}</p>
        </div>
        <span className="game-results__badge">Prédiction</span>
      </header>

      <div className="game-results__notice">
        <Info />
        <div>
          <strong>Prédictions et calculs</strong>
          <p>Ces données sont des indices calculés, pas des résultats réels ni garantis. Le résultat réel reste celui affiché par le jeu.</p>
        </div>
      </div>

      <div className="game-results__grid">
        {rows.map((row, index) => {
          const coefficientOnly = hideLastTime && index === rows.length - 1;
          return (
            <article
              key={`${row.time}-${row.coefficient}-${index}`}
              className={`game-result-card ${coefficientOnly ? "game-result-card--coefficient" : ""}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="game-result-card__topline">
                <span>Indice {index + 1}</span>
                <span>{coefficientOnly ? "Coefficient associé" : row.label ?? "Fenêtre estimée"}</span>
              </div>

              {!coefficientOnly && (
                <div className="game-result-card__time">
                  <Clock3 />
                  <div>
                    <span>Heure estimée</span>
                    <strong>{ensureResultTime(row.time)}</strong>
                  </div>
                  <small>HH:MM:SS</small>
                </div>
              )}

              <div className="game-result-card__coefficient">
                <TrendingUp />
                <div>
                  <span>Coefficient indicatif</span>
                  <strong>{row.coefficient}</strong>
                </div>
              </div>

              {coefficientOnly && (
                <p className="game-result-card__hint">
                  Ce coefficient est susceptible d’apparaître à l’une des heures indiquées précédemment
                  {previousTimes.length === 2 ? ` : ${previousTimes[0]} ou ${previousTimes[1]}.` : "."}
                </p>
              )}

              <div className="game-result-card__stats">
                <ResultStat icon={TrendingUp} label="Confiance" value={`${row.confidence}%`} />
                <ResultStat icon={ShieldCheck} label="Fiabilité" value={`${row.reliability}%`} />
                <ResultStat icon={Gauge} label="Risque" value={row.risk} />
              </div>
              <div className="game-result-card__bar"><span style={{ width: `${row.confidence}%` }} /></div>
            </article>
          );
        })}
      </div>

      <div className="game-results__real">
        <span>Résultat réel</span>
        <p>À vérifier uniquement dans l’historique officiel du jeu après le tour.</p>
      </div>

      <Button className="game-console-launch" onClick={onRestart}>
        <ArrowLeft /> Nouvelle analyse
      </Button>
    </section>
  );
};

const ResultStat = ({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) => (
  <div>
    <Icon />
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default GamePredictionResults;