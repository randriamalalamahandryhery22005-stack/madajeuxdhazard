import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Crown,
  Gauge,
  History,
  Radar,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AnalysisSequence from "@/components/AnalysisSequence";
import AviatorLevelSelect from "@/components/aviator/AviatorLevelSelect";
import {
  formatCoeff,
  loadAnalysisHistory,
  pushAnalysisHistory,
  runLevel,
  type HistoryStats,
  type LevelId,
  type LevelOutcome,
  type StoredAnalysis,
} from "@/lib/aviatorLevels";

interface Props {
  showSeconds: boolean;
  accessStart: string | null;
  accessExpiry: string | null;
  onBack: () => void;
}

type Step = "levels" | "prepare" | "analyzing" | "result";

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

const PREP_STEPS = [
  { title: "Niveau confirmé", detail: "Le moteur adapté à votre stratégie est chargé.", Icon: Target },
  { title: "Session sécurisée", detail: "Les paramètres sont calibrés automatiquement.", Icon: ShieldCheck },
  { title: "Analyse prête", detail: "Aucune capture ni saisie manuelle n’est nécessaire.", Icon: Radar },
];

const AviatorAnalysisFlow = ({ accessStart, accessExpiry, onBack }: Props) => {
  const [step, setStep] = useState<Step>("levels");
  const [level, setLevel] = useState<LevelId | null>(null);
  const [prepIndex, setPrepIndex] = useState(0);
  const [outcome, setOutcome] = useState<LevelOutcome | null>(null);
  const [history, setHistory] = useState<StoredAnalysis[]>(() => loadAnalysisHistory());

  const currentIndex = step === "levels" ? 0 : step === "prepare" ? 1 : step === "analyzing" ? 2 : 3;

  const chooseLevel = (selected: LevelId) => {
    setLevel(selected);
    setPrepIndex(0);
    setOutcome(null);
    setStep("prepare");
  };

  const startAnalysis = () => setStep("analyzing");

  const completeAnalysis = useCallback(() => {
    if (!level) return;
    const now = new Date();
    const result = runLevel(level, {
      h: now.getHours(),
      m: now.getMinutes(),
      s: now.getSeconds(),
      coefficient: level === 1 ? 6.25 : level === 2 ? 8.5 : 12.75,
      stats: SESSION_STATS[level],
    });
    setOutcome(result);
    setHistory(pushAnalysisHistory(result));
    setStep("result");
  }, [level]);

  const goBack = () => {
    if (step === "levels") onBack();
    else if (step === "prepare") setStep("levels");
    else if (step === "result") setStep("prepare");
  };

  return (
    <div className="min-h-screen flex flex-col luxe-page text-foreground">
      {step === "analyzing" && level && (
        <AnalysisSequence
          variant={level === 2 ? "balanced" : "premium-realtime"}
          duration={4600}
          title={`Niveau ${level} · ${LEVEL_NAMES[level]}`}
          subtitle="Calcul et vérification des prédictions"
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
            <h1 className="text-lg luxe-title leading-tight">Centre de prédictions</h1>
          </div>
          <span className="luxe-badge-premium"><Crown className="w-3 h-3" /> PRO</span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Progression">
          {["Niveau", "Préparation", "Analyse", "Résultat"].map((label, index) => (
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
              <p className="text-primary text-[10px] uppercase tracking-[0.24em] font-bold">Accès immédiat</p>
              <h2 className="mt-1 text-2xl font-black text-foreground">Choisissez votre niveau</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">Commencez directement. Le moteur prépare automatiquement la session après votre choix.</p>
            </div>
            <AviatorLevelSelect onSelect={chooseLevel} />
          </div>
        )}

        {step === "prepare" && level && (
          <div className="space-y-4 animate-fade-in">
            <div className="luxe-card luxe-card-gold p-5">
              <div className="flex items-center gap-3">
                <div className="luxe-icon-badge luxe-icon-badge-gold"><Zap className="w-5 h-5" /></div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-primary font-bold">Niveau {level}</p>
                  <h2 className="text-xl font-black text-foreground">{LEVEL_NAMES[level]}</h2>
                </div>
                <CircleCheck className="ml-auto w-6 h-6 text-primary" />
              </div>
            </div>

            <div className="space-y-2.5">
              {PREP_STEPS.map((item, index) => {
                const active = index === prepIndex;
                const done = index < prepIndex;
                return (
                  <div key={item.title} className={`luxe-card p-4 transition-all duration-300 ${active ? "luxe-card-emerald" : done ? "opacity-70" : "opacity-45"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center">
                        {done ? <Check className="w-5 h-5 text-primary" /> : <item.Icon className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {prepIndex < PREP_STEPS.length - 1 ? (
              <Button className="luxe-btn w-full h-13" onClick={() => setPrepIndex((value) => value + 1)}>
                Continuer <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button className="luxe-btn w-full h-14 text-base" onClick={startAnalysis}>
                <Sparkles className="w-5 h-5" /> Lancer l’analyse
              </Button>
            )}
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep("levels")}>Changer de niveau</Button>
          </div>
        )}

        {step === "result" && outcome && (
          <ResultView outcome={outcome} history={history} onRestart={() => { setPrepIndex(0); setStep("levels"); }} />
        )}
      </main>
    </div>
  );
};

const ResultView = ({ outcome, history, onRestart }: { outcome: LevelOutcome; history: StoredAnalysis[]; onRestart: () => void }) => {
  const mainRows = outcome.rows.filter((row) => row.kind === "main");
  const otherRows = outcome.rows.filter((row) => row.kind !== "main");
  const created = useMemo(() => outcome.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), [outcome]);
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="luxe-card luxe-card-emerald p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-primary font-bold">Analyse terminée</p>
            <h2 className="text-xl font-black text-foreground">Niveau {outcome.level} · Résultat</h2>
            <p className="text-[10px] text-muted-foreground mt-1">Session calculée à {created}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-primary leading-none">{outcome.precision}%</p>
            <p className="text-[9px] text-muted-foreground mt-1">Précision</p>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${outcome.precision}%` }} /></div>
      </div>

      <div className="space-y-2.5">
        {[...mainRows, ...otherRows].map((row, index) => (
          <div key={`${row.kind}-${index}`} className="luxe-card p-4" style={{ animation: `fade-up .45s ease ${index * 90}ms both` }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{row.label}</p>
                <div className="mt-2 flex items-center gap-2 text-foreground"><Clock3 className="w-4 h-4 text-primary" /><span className="font-mono text-lg font-black">{row.time}</span></div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-primary">{formatCoeff(row.coefficient)}</p>
                <p className="text-[9px] text-muted-foreground">Coefficient</p>
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

      {history.length > 1 && (
        <div className="luxe-card p-4">
          <div className="flex items-center gap-2 mb-3"><History className="w-4 h-4 text-primary" /><p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Analyses récentes</p></div>
          {history.slice(1, 4).map((entry) => <div key={entry.id} className="flex justify-between border-t border-border/40 py-2 text-xs"><span>Niveau {entry.level} · {entry.main.time}</span><strong className="text-primary">{formatCoeff(entry.main.coefficient)}</strong></div>)}
        </div>
      )}

      <Button className="luxe-btn w-full h-13" onClick={onRestart}><RotateCcw className="w-4 h-4" /> Nouvelle analyse</Button>
    </div>
  );
};

const Metric = ({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) => (
  <div className="rounded-lg border border-border/40 bg-background/35 px-2 py-2 text-center">
    <Icon className="w-3 h-3 text-primary mx-auto mb-1" />
    <p className="text-[8px] uppercase text-muted-foreground font-bold">{label}</p>
    <p className="text-[11px] font-black text-foreground truncate">{value}</p>
  </div>
);

export default AviatorAnalysisFlow;