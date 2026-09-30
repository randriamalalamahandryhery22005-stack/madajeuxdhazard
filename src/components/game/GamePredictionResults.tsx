import { Clock3, RefreshCw, TrendingUp } from "lucide-react";
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

const LEVEL_TEXT = (value: string) => {
  switch (value) {
    case "Haute":
    case "Faible":
      return "pos";
    case "Moyenne":
    case "Modéré":
      return "mid";
    default:
      return "neg";
  }
};

/** Shared HUD-style result renderer for Aviator, CosmoX and JetX.
 *  Every datum lives in its own labelled cell; values stay small and scannable. */
const GamePredictionResults = ({ title, rows, tone, onRestart, eyebrow = "Projection calculée" }: Props) => {
  const coefficientOnlyLast = rows.length >= 3;
  const previousTimes = rows.slice(0, 2).map((row) => ensureResultTime(row.time));

  return (
    <section className={`game-results game-tone-${tone}`} aria-labelledby="game-results-title">
      <div className="game-results__notice" role="note">
        <strong>Indices calculés, pas garantis</strong>
        <p>
          Ces indices sont des projections calculées, pas des résultats réels. Ils servent uniquement
          de repères pour observer les éventuels coefficients du jeu aujourd’hui, sans aucune obligation de les suivre.
        </p>
      </div>

      <div className="game-results__head">
        <div className="min-w-0">
          <p className="game-results__eyebrow">{eyebrow}</p>
          <h2 id="game-results-title" className="game-results__title">{title}</h2>
          <p className="game-results__count">{rows.length} indice{rows.length > 1 ? "s" : ""} calculé{rows.length > 1 ? "s" : ""}</p>
        </div>
        <span className="game-results__state" aria-hidden="true">
          <i />
          Projection calculée
        </span>
      </div>

      <div className="game-results__list">
        {rows.map((row, index) => {
          const coefficientOnly = coefficientOnlyLast && index === rows.length - 1;
          return (
            <article
              key={`${row.time}-${row.coefficient}-${index}`}
              className={`game-result-card${coefficientOnly ? " game-result-card--coefficient" : ""}`}
              style={{ animationDelay: `${index * 110}ms` }}
            >
              <div className="game-result-card__topline">
                <span>Indice {index + 1}</span>
                <span>{coefficientOnly ? "Coefficient associé" : row.label ?? "Fenêtre estimée"}</span>
              </div>

              {!coefficientOnly && (
                <div className="game-result-card__primary">
                  <div className="game-result-cell game-result-cell--time">
                    <span className="game-result-cell__label"><Clock3 /> Heure estimée</span>
                    <strong className="game-result-cell__value">{ensureResultTime(row.time)}</strong>
                    <small className="game-result-cell__hint">HH:MM:SS</small>
                  </div>
                  <div className="game-result-cell game-result-cell--coefficient">
                    <span className="game-result-cell__label"><TrendingUp /> Coefficient</span>
                    <strong className="game-result-cell__value">{row.coefficient}</strong>
                    <small className="game-result-cell__hint">Indicatif</small>
                  </div>
                </div>
              )}

              {coefficientOnly && (
                <div className="game-result-card__primary game-result-card__primary--solo">
                  <div className="game-result-cell game-result-cell--coefficient">
                    <span className="game-result-cell__label"><TrendingUp /> Coefficient</span>
                    <strong className="game-result-cell__value">{row.coefficient}</strong>
                    <small className="game-result-cell__hint">Indicatif</small>
                  </div>
                  <p className="game-result-card__note">
                    Ce coefficient est susceptible d’apparaître à l’une des heures indiquées précédemment
                    {previousTimes.length === 2 ? ` : ${previousTimes[0]} ou ${previousTimes[1]}.` : "."}
                  </p>
                </div>
              )}

              <div className="game-result-card__meta">
                <div className="game-result-mini">
                  <span>Confiance</span>
                  <strong>{row.confidence}%</strong>
                </div>
                <div className="game-result-mini">
                  <span>Fiabilité</span>
                  <strong>{row.reliability}%</strong>
                </div>
                <div className="game-result-mini">
                  <span>Stabilité</span>
                  <strong className={`tone-${LEVEL_TEXT(row.stability)}`}>{row.stability}</strong>
                </div>
                <div className="game-result-mini">
                  <span>Risque</span>
                  <strong className={`tone-${LEVEL_TEXT(row.risk)}`}>{row.risk}</strong>
                </div>
              </div>

              <div className="game-result-card__bar" aria-hidden="true">
                <span style={{ width: `${Math.max(0, Math.min(100, row.confidence))}%` }} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="game-results__foot">
        <span>Résultat réel</span>
        <p>À vérifier uniquement dans l’historique officiel du jeu après le tour.</p>
      </div>

      <Button className="game-results__restart" onClick={onRestart}>
        <RefreshCw /> Nouvelle analyse
      </Button>
      <span className="sr-only"><ArrowLeft /> Retour</span>
    </section>
  );
};

export default GamePredictionResults;
