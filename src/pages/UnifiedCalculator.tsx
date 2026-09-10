import { useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Brain, CheckCircle2, Clock3, History, RotateCcw, ShieldAlert, Sparkles, Target, TrendingDown, TrendingUp, Zap } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { analyseRound, parseHistory, type SupportedGame } from "@/lib/premiumAnalysisEngine";

const META: Record<SupportedGame, { name: string; subtitle: string; icon: typeof Zap; tone: string }> = {
  aviator: { name: "Aviator", subtitle: "Analyse avancée", icon: Zap, tone: "from-amber-400/25 via-amber-500/10 to-transparent" },
  cosmox: { name: "CosmoX", subtitle: "Analyse avancée", icon: Sparkles, tone: "from-violet-400/25 via-fuchsia-500/10 to-transparent" },
  jetx: { name: "JetX", subtitle: "Analyse avancée", icon: Target, tone: "from-orange-400/25 via-red-500/10 to-transparent" },
};

export default function UnifiedCalculator({ defaultGame = "aviator" as SupportedGame }: { defaultGame?: SupportedGame }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState<SupportedGame>(defaultGame);
  const [time, setTime] = useState("");
  const [coefficient, setCoefficient] = useState("");
  const [history, setHistory] = useState("");
  const [result, setResult] = useState<ReturnType<typeof analyseRound> | null>(null);
  const [error, setError] = useState("");
  const meta = META[game];
  const Icon = meta.icon;
  const parsed = useMemo(() => parseHistory(history), [history]);

  if (!user) { navigate("/login"); return null; }

  const calculate = () => {
    setError("");
    const c = Number(coefficient.replace(",", "."));
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) return setError("Heure invalide. Utilisez HH:MM ou HH:MM:SS.");
    if (!Number.isFinite(c) || c < 1 || c > 10000) return setError("Coefficient invalide. Entrez une valeur comprise entre 1,00x et 10 000x.");
    if (parsed.length < 2) return setError("Ajoutez au moins 2 coefficients historiques pour obtenir une analyse utile.");
    setResult(analyseRound({ game, time, coefficient: c, history: parsed }));
  };

  const reset = () => { setResult(null); setTime(""); setCoefficient(""); setHistory(""); setError(""); };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className={`sticky top-0 z-20 border-b border-border/50 bg-gradient-to-br ${meta.tone} backdrop-blur-xl`}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/games")} className="h-10 w-10 rounded-xl border border-border/50 bg-card/70 flex items-center justify-center" aria-label="Retour"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0"><p className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold">Moteur Premium</p><h1 className="text-base font-semibold truncate">Calculateur unifié</h1></div>
          <div className="h-10 px-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2 text-primary text-xs font-semibold"><Brain className="w-4 h-4" /> Analyse</div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5 space-y-4 pb-28">
        <section className="rounded-3xl border border-border/50 bg-card/80 shadow-xl overflow-hidden">
          <div className={`p-5 bg-gradient-to-br ${meta.tone}`}>
            <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary"><Icon className="w-6 h-6" /></div><div><h2 className="text-lg font-semibold">{meta.name}</h2><p className="text-xs text-muted-foreground">{meta.subtitle} · une seule interface pour les trois jeux</p></div></div>
            <div className="grid grid-cols-3 gap-2 mt-5">
              {(["aviator", "cosmox", "jetx"] as SupportedGame[]).map((key) => <button key={key} onClick={() => { setGame(key); setResult(null); }} className={`rounded-xl px-2 py-3 text-xs font-medium border transition-all ${game === key ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-background/50 border-border/50 text-muted-foreground"}`}>{META[key].name}</button>)}
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Heure du dernier tour</span><Input type="time" step="1" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 rounded-xl text-center font-mono" /></label>
              <label className="space-y-1.5"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Coefficient actuel</span><Input inputMode="decimal" type="text" placeholder="2,50x" value={coefficient} onChange={(e) => setCoefficient(e.target.value)} className="h-12 rounded-xl text-center font-mono" /></label>
            </div>
            <label className="space-y-1.5 block"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Historique des coefficients</span><textarea value={history} onChange={(e) => setHistory(e.target.value)} placeholder="1,24 2,10 1,58 3,40 5,21 ..." className="w-full min-h-28 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30 resize-y" /><span className="text-[10px] text-muted-foreground">{parsed.length}/60 valeurs reconnues · séparées par espace, virgule ou retour à la ligne</span></label>
            {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
            <div className="flex gap-2"><Button onClick={calculate} className="h-12 flex-1 rounded-xl font-semibold"><BarChart3 className="w-4 h-4 mr-2" />Analyser les données</Button><Button onClick={reset} variant="outline" className="h-12 w-12 rounded-xl px-0" aria-label="Réinitialiser"><RotateCcw className="w-4 h-4" /></Button></div>
          </div>
        </section>

        {!result ? <section className="rounded-3xl border border-border/50 bg-card/50 p-5"><div className="flex gap-3"><ShieldAlert className="w-5 h-5 text-primary shrink-0" /><div><p className="text-sm font-semibold">Moteur d'analyse transparent</p><p className="text-xs text-muted-foreground mt-1 leading-relaxed">Le moteur calcule les statistiques réellement présentes dans vos données. Il ne fabrique pas de prochain coefficient et ne présente pas une estimation comme une garantie.</p></div></div></section> : (
          <section className="space-y-4">
            <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-xl">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.2em] text-primary">Résultat de l'analyse</p><h2 className="text-xl font-semibold mt-1">{meta.name}</h2></div><div className="text-right"><p className="text-3xl font-semibold text-primary">{result.score}%</p><p className="text-[10px] text-muted-foreground">score statistique</p></div></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
                {[['Moyenne', result.mean.toFixed(2)+'x'],['Médiane', result.median.toFixed(2)+'x'],['Volatilité', result.volatility.toFixed(2)],['Échantillon', String(result.sampleSize)]].map(([l,v]) => <div key={l} className="rounded-2xl bg-background/50 border border-border/40 p-3"><p className="text-[10px] text-muted-foreground">{l}</p><p className="text-sm font-semibold mt-1">{v}</p></div>)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/50 bg-card p-4"><div className="flex items-center gap-2"><Target className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Zone actuelle</span></div><p className="text-base font-semibold mt-2">{result.zone}</p><p className="text-[10px] text-muted-foreground">Risque : {result.risk}</p></div>
              <div className="rounded-2xl border border-border/50 bg-card p-4"><div className="flex items-center gap-2">{result.trend === 'Haussière' ? <TrendingUp className="w-4 h-4" /> : result.trend === 'Baissière' ? <TrendingDown className="w-4 h-4" /> : <History className="w-4 h-4" />}<span className="text-xs text-muted-foreground">Tendance</span></div><p className="text-base font-semibold mt-2">{result.trend}</p><p className="text-[10px] text-muted-foreground">Qualité : {result.quality}</p></div>
            </div>

            <div className="rounded-3xl border border-border/50 bg-card p-5"><div className="flex items-center gap-2 mb-4"><CheckCircle2 className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold">Répartition observée</h3></div>{[['< 2x',result.lowRate],['2x — 5x',result.midRate],['≥ 5x',result.highRate]].map(([label, value]) => <div key={String(label)} className="mb-3 last:mb-0"><div className="flex justify-between text-[11px] mb-1"><span>{label}</span><span>{(Number(value)*100).toFixed(0)}%</span></div><div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${Number(value)*100}%` }} /></div></div>)}</div>

            <div className="rounded-3xl border border-border/50 bg-card p-5 space-y-3"><div className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold">Repère temporel</h3></div><p className="text-xs text-muted-foreground">Fenêtre d'observation suivante : <span className="text-foreground font-semibold">{result.nextWindow}</span>. Ce repère sert à organiser l'analyse et ne prédit pas le résultat réel.</p><div className="text-[10px] text-muted-foreground border-t border-border/40 pt-3">{result.note}</div></div>
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
