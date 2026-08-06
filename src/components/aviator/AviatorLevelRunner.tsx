import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Clock,
  Gauge,
  History,
  Layers,
  Play,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AnalysisSequence from "@/components/AnalysisSequence";
import {
  formatCoeff,
  loadAnalysisHistory,
  parseClock,
  pushAnalysisHistory,
  runLevel,
  type HistoryStats,
  type LevelId,
  type LevelOutcome,
  type LevelResultRow,
  type StoredAnalysis,
} from "@/lib/aviatorLevels";

interface Props {
  level: Exclude<LevelId, 1>;
  stats: HistoryStats;
  onBack: () => void;
  onNewCapture: () => void;
}

const META: Record<2 | 3, { name: string; tagline: string; accent: string; Icon: typeof Layers; note: string }> = {
  2: {
    name: "Niveau 2",
    tagline: "Double Projection",
    accent: "#F4C542",
    Icon: Layers,
    note: "Saisissez l'heure et le coefficient du tour supérieur à 5.00x qui vient de sortir.",
  },
  3: {
    name: "Niveau 3",
    tagline: "Frappe Haute",
    accent: "#FF5C7A",
    Icon: Rocket,
    note: "Saisissez l'heure et le coefficient du tour supérieur à 5.00x détecté.",
  },
};

const AviatorLevelRunner = ({ level, stats, onBack, onNewCapture }: Props) => {
  const meta = META[level];
  const [timeInput, setTimeInput] = useState("");
  const [coeffInput, setCoeffInput] = useState("");
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<LevelOutcome | null>(null);
  const [pending, setPending] = useState<{ h: number; m: number; s: number; coeff: number } | null>(null);
  const [history, setHistory] = useState<StoredAnalysis[]>(() => loadAnalysisHistory());
  const [progress, setProgress] = useState(0);

  const launch = () => {
    setError("");
    if (!timeInput || !coeffInput) {
      setError("Renseignez l'heure et le coefficient détecté.");
      return;
    }
    const clock = parseClock(timeInput);
    if (!clock) {
      setError("Format d'heure invalide.");
      return;
    }
    const coeff = parseFloat(coeffInput.replace(",", "."));
    if (Number.isNaN(coeff) || coeff <= 5) {
      setError("Le coefficient doit être supérieur à 5.00x.");
      return;
    }
    setOutcome(null);
    setProgress(0);
    setPending({ ...clock, coeff });
  };

  const complete = useCallback(() => {
    if (!pending) return;
    const result = runLevel(level, {
      h: pending.h,
      m: pending.m,
      s: pending.s,
      coefficient: pending.coeff,
      stats,
    });
    setOutcome(result);
    setHistory(pushAnalysisHistory(result));
    setProgress(100);
    setPending(null);
  }, [pending, level, stats]);

  const reset = () => {
    setTimeInput("");
    setCoeffInput("");
    setOutcome(null);
    setError("");
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      {pending && (
        <AnalysisSequence
          variant={level === 2 ? "balanced" : "premium-realtime"}
          duration={4200}
          onComplete={complete}
        />
      )}

      {/* En-tête du niveau */}
      <div className="luxe-card relative overflow-hidden p-4" style={{ borderColor: `${meta.accent}44` }}>
        <span
          className="absolute -top-20 -right-16 w-52 h-52 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${meta.accent}30, transparent 68%)` }}
        />
        <div className="relative flex items-center gap-3">
          <button onClick={onBack} className="luxe-back shrink-0" aria-label="Retour aux niveaux">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(140deg, ${meta.accent}33, rgba(0,0,0,0.5))`,
              border: `1px solid ${meta.accent}55`,
              boxShadow: `0 0 24px -6px ${meta.accent}`,
            }}
          >
            <meta.Icon className="w-5 h-5" style={{ color: meta.accent }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.22em] font-bold" style={{ color: meta.accent }}>
              {meta.tagline}
            </p>
            <h3 className="text-base font-black text-white leading-tight">{meta.name}</h3>
          </div>
          <span className="luxe-badge-live scale-90 origin-right">ZONE UNIQUE</span>
        </div>
        <p className="relative text-[11px] text-white/60 mt-2.5 leading-relaxed">{meta.note}</p>
      </div>

      {/* Saisie */}
      <div className="luxe-card p-4 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/55 uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <Clock className="w-3 h-3 luxe-gold" /> Heure du tour détecté (HH:MM)
          </Label>
          <Input
            type="time"
            step={60}
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value.slice(0, 5))}
            className="luxe-input h-12 text-center font-mono text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/55 uppercase tracking-widest font-semibold">
            Coefficient détecté (&gt; 5.00x)
          </Label>
          <Input
            type="number"
            step="0.01"
            min={5.01}
            placeholder="7.85"
            value={coeffInput}
            onChange={(e) => setCoeffInput(e.target.value)}
            className="luxe-input h-12 text-center font-mono text-base"
          />
        </div>

        {error && <p className="text-destructive text-[11px] text-center font-medium">{error}</p>}

        {/* Barre de progression de l'analyse */}
        <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pending ? 65 : progress}%`,
              background: `linear-gradient(90deg, ${meta.accent}, #00D084)`,
            }}
          />
        </div>

        <div className="flex gap-2">
          <Button className="luxe-btn flex-1 h-12 text-sm" onClick={launch} disabled={!!pending}>
            <Play className="w-4 h-4 mr-2" /> Lancer l'analyse
          </Button>
          {(outcome || timeInput || coeffInput) && (
            <Button variant="outline" className="h-12 px-3 luxe-btn-outline" onClick={reset} aria-label="Réinitialiser">
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Résultats */}
      {outcome && <LevelResults outcome={outcome} accent={meta.accent} onNewCapture={onNewCapture} />}

      {/* Historique */}
      {history.length > 0 && (
        <div className="luxe-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-3.5 h-3.5 luxe-gold" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/55 font-bold">Historique des analyses</p>
          </div>
          <div className="space-y-1.5">
            {history.slice(0, 6).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-black/30 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white">
                    Niveau {h.level} · {h.main.time}
                  </p>
                  <p className="text-[9px] text-white/45">
                    Entrée {h.inputTime} · {formatCoeff(h.inputCoefficient)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-black luxe-gold-text tabular-nums">{formatCoeff(h.main.coefficient)}</p>
                  <p className="text-[9px] text-white/45 tabular-nums">{h.precision} %</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const KIND_META: Record<LevelResultRow["kind"], { label: string; color: string; Icon: typeof Sparkles }> = {
  main: { label: "Principal", color: "#00D084", Icon: TrendingUp },
  index: { label: "Indice", color: "#F4C542", Icon: Sparkles },
  protection: { label: "Protection", color: "#7DD3FC", Icon: ShieldCheck },
};

const LevelResults = ({
  outcome,
  accent,
  onNewCapture,
}: {
  outcome: LevelOutcome;
  accent: string;
  onNewCapture: () => void;
}) => {
  const nextCapture = useMemo(
    () => outcome.nextCaptureAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    [outcome],
  );

  const mains = outcome.rows.filter((r) => r.kind === "main");
  const extras = outcome.rows.filter((r) => r.kind !== "main");

  return (
    <div className="space-y-3" style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>
      {/* Bandeau synthèse */}
      <div className="luxe-card luxe-card-emerald relative overflow-hidden p-4">
        <span
          className="absolute -bottom-16 -left-12 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent}30, transparent 68%)` }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.22em] luxe-emerald font-bold">Analyse terminée</p>
            <h4 className="text-base font-black text-white leading-tight">Niveau {outcome.level} · Résultats</h4>
            <p className="text-[10px] text-white/45 mt-0.5">
              Entrée {outcome.inputTime} · {formatCoeff(outcome.inputCoefficient)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[8px] uppercase tracking-widest text-white/45 font-bold">Précision</p>
            <p className="text-2xl font-black luxe-gold-text tabular-nums leading-none">{outcome.precision}%</p>
            <p className="text-[9px] luxe-emerald font-bold mt-0.5">{outcome.confidence}</p>
          </div>
        </div>
        <div className="relative mt-3 h-1.5 rounded-full bg-white/8 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${outcome.precision}%`, background: "linear-gradient(90deg,#00D084,#F4C542)" }}
          />
        </div>
      </div>

      {/* Horaires de prédiction */}
      <SectionTitle icon={<Timer className="w-3.5 h-3.5 luxe-emerald" />} label="Horaires de prédiction" />
      {mains.map((row, i) => (
        <ResultCard key={`main-${i}`} row={row} delay={120 + i * 110} />
      ))}

      {/* Indice — carte unique, totalement indépendante et commune aux résultats principaux (sans horaire) */}
      {extras.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-1">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <span className="text-[8px] uppercase tracking-[0.24em] text-white/40 font-black">Zone indépendante</span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>
          <IndexCard rows={extras} delay={160} />
        </>
      )}


      {/* Nouvelle capture */}
      <div className="luxe-card luxe-card-gold p-4">
        <div className="flex items-start gap-3">
          <div className="luxe-icon-badge luxe-icon-badge-gold shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.22em] luxe-gold font-bold">Prochaine capture</p>
            <p className="text-sm font-black text-white leading-tight">Recapturez vers {nextCapture}</p>
            <p className="text-[11px] text-white/60 leading-relaxed mt-1">{outcome.nextCaptureHint}</p>
            <Button className="luxe-btn w-full h-11 mt-3 text-sm" onClick={onNewCapture}>
              <Camera className="w-4 h-4 mr-2" /> Effectuer une nouvelle capture
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Carte d'indice unique, indépendante et commune aux résultats principaux.
 * Aucun horaire (HH:MM:SS) n'est affiché ici.
 */
const IndexCard = ({ rows, delay }: { rows: LevelResultRow[]; delay: number }) => {
  const color = KIND_META[rows[0].kind].color;
  return (
    <div
      className="luxe-card relative overflow-hidden p-4"
      style={{
        borderColor: `${color}66`,
        boxShadow: `0 20px 55px -30px ${color}`,
        animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        animationDelay: `${delay}ms`,
      }}
    >
      <span
        className="absolute -top-16 -right-12 w-44 h-44 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}2e, transparent 68%)` }}
      />
      <div className="relative flex items-center gap-2 mb-3">
        <span
          className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1"
          style={{ background: `${color}1f`, color, border: `1px solid ${color}55` }}
        >
          <Sparkles className="w-2.5 h-2.5" /> Indice
        </span>
        <span className="text-[10px] text-white/50">Commun aux résultats · sans horaire</span>
      </div>

      <div className="relative space-y-3">
        {rows.map((row, i) => {
          const km = KIND_META[row.kind];
          return (
            <div key={`idx-${i}`} className="rounded-2xl border border-white/8 bg-black/35 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-white/85">{row.label}</span>
                <span className="text-2xl font-black tabular-nums leading-none" style={{ color: km.color }}>
                  {formatCoeff(row.coefficient)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Stat label="Confiance" value={`${row.confidence}%`} />
                <Stat label="Fiabilité" value={`${row.reliability}%`} />
                <Stat label="Stabilité" value={row.stability} />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Gauge className="w-3 h-3 text-white/40" />
                <span className="text-[10px] text-white/55">
                  Risque : <span className="font-bold text-white/85">{row.risk}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SectionTitle = ({ icon, label }: { icon: React.ReactNode; label: string }) => (


  <div className="flex items-center gap-2 px-1 pt-1">
    {icon}
    <p className="text-[10px] uppercase tracking-[0.2em] text-white/55 font-bold">{label}</p>
  </div>
);

const ResultCard = ({
  row,
  delay,
  standalone,
}: {
  row: LevelResultRow;
  delay: number;
  standalone?: boolean;
}) => {
  const km = KIND_META[row.kind];
  return (
    <div
      className="luxe-card relative overflow-hidden p-4"
      style={{
        borderColor: `${km.color}${standalone ? "66" : "44"}`,
        boxShadow: standalone ? `0 20px 55px -30px ${km.color}` : undefined,
        animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        animationDelay: `${delay}ms`,
      }}
    >
      <span
        className="absolute -top-16 -right-12 w-44 h-44 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${km.color}2e, transparent 68%)` }}
      />
      <div className="relative flex items-center gap-2 mb-3">
        <span
          className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1"
          style={{ background: `${km.color}1f`, color: km.color, border: `1px solid ${km.color}55` }}
        >
          <km.Icon className="w-2.5 h-2.5" /> {km.label}
        </span>
        <span className="text-[11px] font-bold text-white/85">{row.label}</span>
        {row.offsetLabel && <span className="ml-auto text-[9px] text-white/40 font-mono">{row.offsetLabel}</span>}
      </div>

      <div className="relative grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/8 bg-black/35 px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1 text-white/45 mb-1">
            <Timer className="w-3 h-3" />
            <span className="text-[8px] uppercase tracking-widest font-bold">Heure</span>
          </div>
          <p className="text-xl font-black text-white font-mono tabular-nums leading-none">{row.time}</p>
        </div>
        <div
          className="rounded-2xl border px-3 py-3 text-center"
          style={{ borderColor: `${km.color}44`, background: `${km.color}14` }}
        >
          <div className="flex items-center justify-center gap-1 mb-1" style={{ color: km.color }}>
            <TrendingUp className="w-3 h-3" />
            <span className="text-[8px] uppercase tracking-widest font-bold">Coefficient</span>
          </div>
          <p className="text-xl font-black tabular-nums leading-none" style={{ color: km.color }}>
            {formatCoeff(row.coefficient)}
          </p>
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-2">
        <Stat label="Confiance" value={`${row.confidence}%`} />
        <Stat label="Fiabilité" value={`${row.reliability}%`} />
        <Stat label="Stabilité" value={row.stability} />
      </div>
      <div className="relative mt-2 flex items-center gap-1.5">
        <Gauge className="w-3 h-3 text-white/40" />
        <span className="text-[10px] text-white/55">
          Risque : <span className="font-bold text-white/85">{row.risk}</span>
        </span>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-white/8 bg-black/30 px-2 py-2 text-center">
    <p className="text-[8px] uppercase tracking-widest text-white/40 font-bold">{label}</p>
    <p className="text-[12px] font-black text-white tabular-nums">{value}</p>
  </div>
);

export default AviatorLevelRunner;

