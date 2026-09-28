import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

type GameTone = "aviator" | "cosmox" | "jetx";

interface GameControlHeaderProps {
  game: string;
  eyebrow: string;
  status: string;
  icon: LucideIcon;
  tone: GameTone;
  onBack: () => void;
  accessStart?: string | null;
  accessExpiry?: string | null;
}

const GameControlHeader = ({
  game,
  eyebrow,
  status,
  icon: Icon,
  tone,
  onBack,
  accessStart,
  accessExpiry,
}: GameControlHeaderProps) => (
  <header className={`game-console-header game-tone-${tone}`}>
    <div className="game-console-header__identity">
      <Button variant="ghost" size="icon" onClick={onBack} className="game-console-back" aria-label="Retour aux jeux">
        <ArrowLeft />
      </Button>
      <div className="game-console-emblem" aria-hidden="true"><Icon /></div>
      <div className="min-w-0">
        <p className="game-console-eyebrow">{eyebrow}</p>
        <h1 className="game-console-title">{game}</h1>
      </div>
    </div>
    <div className="game-console-header__status">
      {(accessStart || accessExpiry) && (
        <p className="game-console-access">
          {accessStart && <span>Actif depuis {new Date(accessStart).toLocaleDateString("fr-FR")}</span>}
          {accessExpiry && <span>Jusqu’au {new Date(accessExpiry).toLocaleDateString("fr-FR")}</span>}
        </p>
      )}
      <span className="game-console-status"><Radio /> {status}</span>
    </div>
  </header>
);

export default GameControlHeader;