import { useState, useRef } from "react";
import { Upload, Loader2, CheckCircle2, ChevronRight, Sparkles, Trophy, Target, Clock, Goal, Percent, ArrowLeft, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MarketId =
  | "exact_score"
  | "ht_score"
  | "htft"
  | "total_goals"
  | "first_goal_minute"
  | "multi_goals"
  | "ht2_score"
  | "one_x_two";

interface MarketDef {
  id: MarketId;
  label: string;
  icon: React.ReactNode;
  hint: string;
}

const MARKETS: MarketDef[] = [
  { id: "exact_score", label: "Score Exact", icon: <Target className="w-4 h-4" />, hint: "Uploadez la capture du marché Score Exact." },
  { id: "ht_score", label: "Mi-temps CS", icon: <Clock className="w-4 h-4" />, hint: "Uploadez la capture Mi-temps Score Exact." },
  { id: "htft", label: "HT/FT", icon: <ChevronRight className="w-4 h-4" />, hint: "Uploadez la capture HT/FT." },
  { id: "total_goals", label: "Total de buts", icon: <Goal className="w-4 h-4" />, hint: "Uploadez la capture Total de buts." },
  { id: "first_goal_minute", label: "Minute du 1er but", icon: <Clock className="w-4 h-4" />, hint: "Uploadez la capture Minute du 1er but." },
  { id: "multi_goals", label: "Multi-buts", icon: <Goal className="w-4 h-4" />, hint: "Uploadez la capture Multi-buts (0-1 / 2-3 / 4-5 / 6+)." },
  { id: "ht2_score", label: "2ème MT CS", icon: <Clock className="w-4 h-4" />, hint: "Uploadez la capture 2ème Mi-temps Score Exact." },
  { id: "one_x_two", label: "1X2", icon: <Trophy className="w-4 h-4" />, hint: "Uploadez la capture du marché 1X2." },
];

interface Props {
  homeTeam: string;
  awayTeam: string;
  leagueName?: string;
  onBack: () => void;
  onNewMatch: () => void;
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });

const VirtuelAIWizard = ({ homeTeam, awayTeam, leagueName, onBack, onNewMatch }: Props) => {
  const [step, setStep] = useState(0); // 0..7 markets, 8 = summary
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const current = MARKETS[step];
  const totalSteps = MARKETS.length;

  const handleFile = async (f: File) => {
    if (!f.type.startsWith("image/")) { toast.error("Fichier image requis"); return; }
    if (f.size > 8 * 1024 * 1024) { toast.error("Image trop grande (max 8 Mo)"); return; }
    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(f);
      const { data, error } = await supabase.functions.invoke("virtuel-ai-analyze", {
        body: {
          mode: "market",
          market: current.id,
          imageDataUrl: dataUrl,
          homeTeam, awayTeam, leagueName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults(prev => ({ ...prev, [current.id]: data.result }));
      if (step < totalSteps - 1) {
        setStep(step + 1);
      } else {
        await runSummary({ ...results, [current.id]: data.result });
      }
    } catch (e: any) {
      toast.error("Analyse échouée : " + (e?.message || "erreur"));
    } finally {
      setLoading(false);
    }
  };

  const runSummary = async (allResults: Record<string, any>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("virtuel-ai-analyze", {
        body: { mode: "summary", homeTeam, awayTeam, leagueName, marketResults: allResults },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSummary(data.summary);
      setStep(totalSteps); // move to summary view
    } catch (e: any) {
      toast.error("Synthèse échouée : " + (e?.message || "erreur"));
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStep(0); setResults({}); setSummary(null);
  };

  const renderMarketResult = (mId: MarketId, r: any) => {
    if (!r) return null;
    if (mId === "total_goals") {
      return (
        <div className="text-[11px] space-y-0.5">
          <div>Plus probable : <b>{r.mostLikely}</b></div>
          <div>+1.5 : <b>{r.over15}</b> · +2.5 : <b>{r.over25}</b> · -3.5 : <b>{r.under35}</b></div>
        </div>
      );
    }
    if (mId === "multi_goals") {
      return (
        <div className="text-[11px] space-y-0.5">
          <div>Le plus probable : <b>{r.mostLikely}</b></div>
          {r.ranges && (
            <div className="text-muted-foreground">
              0-1: {r.ranges["0-1"]}% · 2-3: {r.ranges["2-3"]}% · 4-5: {r.ranges["4-5"]}% · 6+: {r.ranges["6+"]}%
            </div>
          )}
        </div>
      );
    }
    if (mId === "one_x_two") {
      return (
        <div className="text-[11px] space-y-0.5">
          <div>Principal : <b>{r.principal}</b> · Alt : <b>{r.alternative}</b></div>
          <div>Probabilité : <b>{r.probability}%</b></div>
        </div>
      );
    }
    return (
      <div className="text-[11px] space-y-0.5">
        <div>1. <b>{r.principal}</b></div>
        <div>2. {r.alternative1}</div>
        <div>3. {r.alternative2}</div>
      </div>
    );
  };

  // Final summary view
  if (step >= totalSteps && summary) {
    return (
      <div className="space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
        <div className="rounded-2xl overflow-hidden border-2 border-green-500/40 bg-gradient-to-br from-green-500/10 via-card to-emerald-500/5 shadow-xl shadow-green-500/10">
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between bg-green-500/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider">🤖 Analyse IA terminée</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 font-bold">
              Confiance {summary.confidence}%
            </span>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div className="text-center pb-2 border-b border-border/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Match</p>
              <p className="text-base font-black">{homeTeam} <span className="text-muted-foreground">vs</span> {awayTeam}</p>
            </div>
            {[
              { k: "Pronostic principal", v: summary.pronosticPrincipal, hi: true },
              { k: "Alternative", v: summary.alternative },
              { k: "Score exact conseillé", v: summary.scoreExact, hi: true },
              { k: "Mi-temps", v: summary.miTemps },
              { k: "HT/FT", v: summary.htft },
              { k: "Total de buts", v: summary.totalButs },
              { k: "Premier but", v: summary.premierBut },
              { k: "Multi-buts", v: summary.multiButs },
            ].map(row => (
              <div key={row.k} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/40 border border-border/20">
                <span className="text-xs text-muted-foreground">✔ {row.k}</span>
                <span className={`text-sm font-bold ${row.hi ? "text-green-400" : "text-foreground"}`}>{row.v}</span>
              </div>
            ))}
            {summary.resume && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-[11px] text-primary-foreground/90 italic">{summary.resume}</p>
              </div>
            )}
            <div className="text-center pt-1">
              <span className="text-[10px] text-green-400 font-bold">🟢 Analyse terminée</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 px-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500/60 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            Prédiction générée par IA à partir de vos captures. Résultat non garanti à 100%.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Button className="w-full h-12 text-sm bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold" onClick={restart}>
            <RotateCcw className="w-4 h-4 mr-2" /> Nouvelle analyse
          </Button>
          <Button variant="outline" className="w-full h-11 text-sm" onClick={onNewMatch}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Changer de ligue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards" }}>
      {/* Header */}
      <div className="p-4 rounded-2xl bg-card/80 border border-green-500/25 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">📊 Analyse Football IA</p>
            <p className="text-sm font-bold">{homeTeam} <span className="text-muted-foreground">vs</span> {awayTeam}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Étape</p>
            <p className="text-sm font-black text-green-400">{step + 1}/{totalSteps}</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500" style={{ width: `${((step) / totalSteps) * 100}%` }} />
        </div>
      </div>

      {/* Steps chip list */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {MARKETS.map((m, i) => (
          <span key={m.id} className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
            i < step ? "bg-green-500/15 border-green-500/40 text-green-300" :
            i === step ? "bg-primary/15 border-primary/50 text-primary" :
            "bg-secondary/40 border-border/40 text-muted-foreground"
          }`}>
            {i < step ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 text-center font-bold">▶</span>}
            {m.label}
          </span>
        ))}
      </div>

      {/* Current market card */}
      <div className="p-5 rounded-2xl bg-card/80 border-2 border-primary/30 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
            {current.icon}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Marché</p>
            <h3 className="text-base font-bold">{current.label}</h3>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{current.hint}</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }}
        />
        <Button
          disabled={loading}
          onClick={() => fileRef.current?.click()}
          className="w-full h-14 text-sm bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyse IA en cours…</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Uploader la capture</>
          )}
        </Button>

        {step > 0 && !loading && (
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            className="w-full text-[11px] text-muted-foreground hover:text-foreground"
          >
            ← Étape précédente
          </button>
        )}
      </div>

      {/* Previous results */}
      {Object.keys(results).length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Analyses effectuées</p>
          {MARKETS.slice(0, step).map(m => (
            <div key={m.id} className="p-3 rounded-xl bg-secondary/30 border border-border/30">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[11px] font-bold">{m.label}</span>
                {results[m.id]?.confidence !== undefined && (
                  <span className="ml-auto text-[10px] text-green-400 font-mono">{results[m.id].confidence}%</span>
                )}
              </div>
              {renderMarketResult(m.id, results[m.id])}
            </div>
          ))}
        </div>
      )}

      <button onClick={onBack} className="w-full text-xs text-muted-foreground hover:text-foreground py-2">
        ← Retour
      </button>
    </div>
  );
};

export default VirtuelAIWizard;
