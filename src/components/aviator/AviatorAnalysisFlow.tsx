import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  CircleCheck,
  Clock3,
  Crown,
  Gauge,
  Hand,
  Info,
  Radar,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AnalysisSequence from "@/components/AnalysisSequence";
import AviatorLevelSelect from "@/components/aviator/AviatorLevelSelect";
import {
  formatCoeff,
  parseClock,
  pushAnalysisHistory,
  runLevel,
  type HistoryStats,
  type LevelId,
  type LevelOutcome,
} from "@/lib/aviatorLevels";

interface Props {
  showSeconds: boolean;
  accessStart: string | null;
  accessExpiry: string | null;
  onBack: () => void;
}

type AnalysisMode = "manual" | "automatic";
type Step = "levels" | "mode" | "manual" | "prepare" | "analyzing" | "result";

const SESSION_STATS: Record<LevelId, HistoryStats> = {
  1: { count: 30, mean: 2.38, median: 1.82, max: 14.6, min: 1.01, volatility: 2.7, under2Ratio: 0.57, mid2to5Ratio: 0.3, high5plusRatio: 0.13, extreme20Ratio: 0, longestBlueStreak: 4, longestHotStreak: 2, roundsSinceHigh: 5, trend: "Stable" },
  2: { count: 30, mean: 3.84, median: 2.45, max: 21.7, min: 1.03, volatility: 5.2, under2Ratio: 0.4, mid2to5Ratio: 0.37, high5plusRatio: 0.23, extreme20Ratio: 0.03, longestBlueStreak: 3, longestHotStreak: 3, roundsSinceHigh: 3, trend: "Haussière" },
  3: { count: 30, mean: 5.9, median: 2.18, max: 52.4, min: 1.02, volatility: 10.8, under2Ratio: 0.47, mid2to5Ratio: 0.2, high5plusRatio: 0.33, extreme20Ratio: 0.1, longestBlueStreak: 6, longestHotStreak: 3, roundsSinceHigh: 8, trend: "Haussière" },
};

const LEVEL_NAMES: Record<LevelId, string> = {
  1: "Analyse Standard",
  2: "Double Projection",
  3: "Frappe Haute",
};

const AUTO_STEPS = [
  { title: "Niveau confirmé", detail: "Le moteur adapté à votre stratégie est chargé.", Icon: Target },
  { title: "Session sécurisée", detail: "Les paramètres sont calibrés automatiquement.", Icon: ShieldCheck },
  { title: "Analyse prête", detail: "Aucune capture ni saisie manuelle n’est nécessaire.", Icon: Radar },
];

const MANUAL_STEPS = [
  { title: "Niveau confirmé", detail: "Le moteur correspondant à votre sélection est chargé.", Icon: Target },
  { title: "Données vérifiées", detail: "L’heure et le coefficient saisis sont validés.", Icon: Check },
  { title: "Calcul prêt", detail: "Vos paramètres sont prêts pour l’analyse.", Icon: Radar },
];

const AviatorAnalysisFlow = ({ accessStart, accessExpiry, onBack }: Props) => {
  const [step, setStep] = useState<Step>("levels");
  const [level, setLevel] = useState<LevelId | null>(null);
  const [mode, setMode] = useState<AnalysisMode | null>(null);
  const [prepIndex, setPrepIndex] = useState(0);
  const [timeInput, setTimeInput] = useState("");
  const [coeffInput, setCoeffInput] = useState("");
  const [error, setError] = useState("");
  const [manualSeed, setManualSeed] = useState<{ h: number; m: number; s: number; coefficient: number } | null>(null);
  const [outcome, setOutcome] = useState<LevelOutcome | null>(null);

  const currentIndex = step === "levels" ? 0 : step === "mode" || step === "manual" ? 1 : step === "prepare" ? 2 : step === "analyzing" ? 3 : 4;
  const preparation = mode === "manual" ? MANUAL_STEPS : AUTO_STEPS;

  useEffect(() => {
    if (step !== "prepare") return;
    const timer = window.setTimeout(() => {
      if (prepIndex < preparation.length - 1) setPrepIndex((value) => value + 1);
      else setStep("analyzing");
    }, prepIndex === preparation.length - 1 ? 1200 : 1050);
    return () => window.clearTimeout(timer);
  }, [prepIndex, preparation.length, step]);

  const chooseLevel = (selected: LevelId) => {
    setLevel(selected);
    setMode(null);
    setOutcome(null);
    setError("");
    setStep("mode");
  };

  const chooseMode = (selected: AnalysisMode) => {
    setMode(selected);
    setPrepIndex(0);
    setError("");
    setStep(selected === "manual" ? "manual" : "prepare");
  };

  const launchManual = () => {
    setError("");
    const clock = parseClock(timeInput);
    const coefficient = Number.parseFloat(coeffInput.replace(",", "."));
    if (!clock) {
      setError("Saisissez une heure valide.");
      return;
    }
    if (!Number.isFinite(coefficient) || coefficient < 5 || coefficient > 500) {
      setError("Saisissez un coefficient entre 5.00 et 500.00.");
      return;
    }
    setManualSeed({ ...clock, coefficient });
    setPrepIndex(0);
    setStep("prepare");
  };

  const completeAnalysis = useCallback(() => {
    if (!level || !mode) return;
    const now = new Date();
    const seed = mode === "manual" && manualSeed
      ? manualSeed
      : {
          h: now.getHours(),
          m: now.getMinutes(),
          s: now.getSeconds(),
          coefficient: level === 1 ? 6.25 : level === 2 ? 8.5 : 12.75,
        };
    const result = runLevel(level, { ...seed, stats: SESSION_STATS[level] });
    pushAnalysisHistory(result);
    setOutcome(result);
    setStep("result");
  }, [level, manualSeed, mode]);

  const restart = () => {
    setLevel(null);
    setMode(null);
    setOutcome(null);
    setManualSeed(null);
    setTimeInput("");
    setCoeffInput("");
    setPrepIndex(0);
    setStep("levels");
  };

  const goBack = () => {
    if (step === "levels") onBack();
    else if (step === "mode") setStep("levels");
    else if (step === "manual") setStep("mode");
    else if (step === "prepare") setStep(mode === "manual" ? "manual" : "mode");
    else if (step === "result") restart();
  };

  return (
    <div className="min-h-screen flex flex-col luxe-page text-foreground">
      {step === "analyzing" && level && (
        <AnalysisSequence
          variant={level === 2 ? "balanced" : "premium-realtime"}
          duration={4600}
          title={`${mode === "manual" ? "Calcul manuel" : "Analyse automatique"} · Niveau ${level}`}
          subtitle="Vérification et construction des indices"
          onComplete={completeAnalysis}
        />
      )}

      <header className="px-4 pt-4">
        <div className="luxe-header luxe-ring flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="luxe-back" aria-label="Retour">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="luxe-icon-badge luxe-float relative">
            <Radar className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-background animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-[0.22em] text-primary font-bold">Aviator Intelligence</p>
            <h1 className="text-lg luxe-title leading-tight">Jeux & Analyse</h1>
          </div>
          <span className="luxe-badge-premium"><Crown className="w-3 h-3" /> PRO</span>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Progression">
          {["Niveau", "Mode", "Préparation", "Analyse", "Indices"].map((label, index) => (
            <div key={label} className="min-w-0">
              <div className={`h-1 rounded-full transition-all duration-500 ${index <= currentIndex ? "bg-primary" : "bg-muted"}`} />
              <p className={`mt-1.5 text-[8px] font-bold uppercase truncate ${index <= currentIndex ? "text-primary" : "text-muted-foreground"}`}>{label}</p>
            </div>
          ))}
        </div>
        {(accessStart || accessExpiry) && (
          <div className="mt-2 flex justify-between px-1 text-[9px] text-muted-foreground">
            {accessStart && <span>Activé le {new Date(accessStart).toLocaleDateString("fr-FR")}</span>}
            {accessExpiry && <span>Valide jusqu’au {new Date(accessExpiry).toLocaleDateString("fr-FR")}</span>}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 pb-28">
        {step === "levels" && (
          <div className="animate-fade-in">
            <div className="mb-5">
              <p className="text-primary text-[10px] uppercase tracking-[0.24em] font-bold">Étape 1</p>
              <h2 className="mt-1 text-2xl font-black text-foreground">Choisissez votre niveau</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">Sélectionnez le moteur adapté, puis choisissez votre méthode d’analyse.</p>
            </div>
            <AviatorLevelSelect onSelect={chooseLevel} />
          </div>
        )}

        {step === "mode" && level && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <p className="text-primary text-[10px] uppercase tracking-[0.24em] font-bold">Niveau {level} confirmé</p>
              <h2 className="mt-1 text-2xl font-black text-foreground">Choisissez votre mode</h2>
              <p className="mt-2 text-sm text-muted-foreground">Deux parcours distincts, un même moteur de calcul.</p>
            </div>
            <ModeCard
              Icon={Hand}
              title="Analyser manuellement"
              description="Saisissez l’heure et le coefficient observés, puis lancez votre calcul."
              detail="Contrôle total des paramètres"
              onClick={() => chooseMode("manual")}
            />
            <ModeCard
              Icon={Bot}
              title="Analyser automatiquement"
              description="Le système calibre les paramètres et lance l’analyse sans aucune saisie."
              detail="Rapide, guidé et entièrement automatique"
              onClick={() => chooseMode("automatic")}
              featured
            />
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep("levels")}>Changer de niveau</Button>
          </div>
        )}

        {step === "manual" && level && (
          <div className="space-y-4 animate-fade-in">
            <div className="luxe-card luxe-card-gold p-5">
              <div className="flex items-center gap-3">
                <div className="luxe-icon-badge luxe-icon-badge-gold"><Hand className="w-5 h-5" /></div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-primary font-bold">Mode manuel · Niveau {level}</p>
                  <h2 className="text-xl font-black text-foreground">Vos paramètres</h2>
                </div>
              </div>
            </div>
            <div className="luxe-card p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="manual-time" className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Heure observée</Label>
                <Input id="manual-time" type="time" step={1} value={timeInput} onChange={(event) => setTimeInput(event.target.value)} className="luxe-input h-12 text-center font-mono text-base" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-coefficient" className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Coefficient observé</Label>
                <Input id="manual-coefficient" type="number" min={5} max={500} step="0.01" placeholder="8.50" value={coeffInput} onChange={(event) => setCoeffInput(event.target.value)} className="luxe-input h-12 text-center font-mono text-base" />
              </div>
              {error && <p role="alert" className="text-destructive text-xs text-center font-semibold">{error}</p>}
              <Button className="luxe-btn w-full h-13" onClick={launchManual}><Sparkles className="w-4 h-4" /> Analyser & calculer</Button>
            </div>
          </div>
        )}

        {step === "prepare" && level && mode && (
          <div className="space-y-5 animate-fade-in">
            <div className="luxe-card luxe-card-gold p-5">
              <div className="flex items-center gap-3">
                <div className="luxe-icon-badge luxe-icon-badge-gold">{mode === "automatic" ? <Bot className="w-5 h-5" /> : <Hand className="w-5 h-5" />}</div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-primary font-bold">{mode === "automatic" ? "Mode automatique" : "Mode manuel"}</p>
                  <h2 className="text-xl font-black text-foreground">Niveau {level} · {LEVEL_NAMES[level]}</h2>
                </div>
                <CircleCheck className="ml-auto w-6 h-6 text-primary" />
              </div>
            </div>

            <div className="luxe-card p-5 min-h-52 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                <span>Préparation sécurisée</span><span>{prepIndex + 1} / {preparation.length}</span>
              </div>
              <div key={preparation[prepIndex].title} className="py-7 text-center animate-scale-in">
                <div className="mx-auto w-16 h-16 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center relative">
                  {(() => { const Icon = preparation[prepIndex].Icon; return <Icon className="w-7 h-7 text-primary" />; })()}
                  <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
                </div>
                <h3 className="mt-4 text-xl font-black text-foreground">{preparation[prepIndex].title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{preparation[prepIndex].detail}</p>
              </div>
              <div className="flex gap-2" aria-label="Étapes de préparation">
                {preparation.map((item, index) => <span key={item.title} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${index <= prepIndex ? "bg-primary" : "bg-muted"}`} />)}
              </div>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">Le lancement se poursuit automatiquement.</p>
          </div>
        )}

        {step === "result" && outcome && <ResultView outcome={outcome} mode={mode ?? "automatic"} onRestart={restart} />}
      </main>
    </div>
  );
};

const ModeCard = ({ Icon, title, description, detail, onClick, featured = false }: { Icon: typeof Hand; title: string; description: string; detail: string; onClick: () => void; featured?: boolean }) => (
  <Button variant="ghost" onClick={onClick} className={`w-full h-auto whitespace-normal text-left justify-start p-0 rounded-lg ${featured ? "luxe-card-emerald" : ""}`}>
    <span className="luxe-card w-full p-5 flex items-start gap-4">
      <span className="w-12 h-12 rounded-lg border border-primary/25 bg-primary/10 flex items-center justify-center shrink-0"><Icon className="w-6 h-6 text-primary" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black text-foreground">{title}</span>
        <span className="block mt-1 text-xs font-normal text-muted-foreground leading-relaxed">{description}</span>
        <span className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase text-primary"><Zap className="w-3 h-3" /> {detail}</span>
      </span>
    </span>
  </Button>
);

const ResultView = ({ outcome, mode, onRestart }: { outcome: LevelOutcome; mode: AnalysisMode; onRestart: () => void }) => {
  const created = useMemo(() => outcome.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), [outcome]);
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="luxe-card luxe-card-emerald p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-primary font-bold">Analyse {mode === "automatic" ? "automatique" : "manuelle"} terminée</p>
            <h2 className="text-xl font-black text-foreground">Indices du jour</h2>
            <p className="text-[10px] text-muted-foreground mt-1">Niveau {outcome.level} · session calculée à {created}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-primary leading-none">{outcome.precision}%</p>
            <p className="text-[9px] text-muted-foreground mt-1">Confiance estimée</p>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${outcome.precision}%` }} /></div>
      </div>

      <div className="luxe-card border-primary/25 p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Info className="w-4 h-4 text-primary" /></div>
        <div>
          <p className="text-xs font-black text-foreground">Indices, sans garantie de résultat</p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">Ces indices sont fournis à titre indicatif. Ils ne sont pas obligatoires à suivre et servent uniquement de repères pour observer les éventuels coefficients du jeu aujourd’hui. Aucun résultat n’est garanti.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {outcome.rows.map((row, index) => (
          <div key={`${row.kind}-${index}`} className="luxe-card relative overflow-hidden p-4" style={{ animation: `fade-up .45s ease ${index * 110}ms both` }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] uppercase tracking-widest text-primary font-black">Indice {index + 1}</span>
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <p className="mt-2 text-xs font-bold text-muted-foreground">{row.label}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/50 bg-background/35 p-3 text-center">
                <Clock3 className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="font-mono text-sm font-black text-foreground">{row.time}</p>
              </div>
              <div className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-center">
                <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-xl font-black text-primary">{formatCoeff(row.coefficient)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Metric icon={TrendingUp} label="Confiance" value={`${row.confidence}%`} />
              <Metric icon={ShieldCheck} label="Fiabilité" value={`${row.reliability}%`} />
              <Metric icon={Gauge} label="Risque" value={row.risk} />
            </div>
          </div>
        ))}
      </div>

      <Button className="luxe-btn w-full h-13" onClick={onRestart}><RotateCcw className="w-4 h-4" /> Nouvelle analyse</Button>
    </div>
  );
};

const Metric = ({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) => (
  <div className="rounded-lg border border-border/40 bg-background/35 px-2 py-2 text-center min-w-0">
    <Icon className="w-3 h-3 text-primary mx-auto mb-1" />
    <p className="text-[8px] uppercase text-muted-foreground font-bold truncate">{label}</p>
    <p className="text-[10px] font-black text-foreground truncate">{value}</p>
  </div>
);

export default AviatorAnalysisFlow;