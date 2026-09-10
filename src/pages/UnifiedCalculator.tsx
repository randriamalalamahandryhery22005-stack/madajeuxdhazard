import { useState } from "react";
import { ArrowLeft, Clock3, Gauge, RotateCcw, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { SupportedGame } from "@/lib/premiumAnalysisEngine";
import { analyseSingleRound } from "@/lib/premiumAnalysisEngine";

const META: Record<SupportedGame, { name: string; label: string; icon: typeof Zap; accent: string }> = {
  aviator: { name: "Aviator", label: "Flight Analysis", icon: Zap, accent: "from-orange-500 via-amber-400 to-yellow-300" },
  cosmox: { name: "CosmoX", label: "Cosmic Analysis", icon: Sparkles, accent: "from-violet-500 via-fuchsia-500 to-pink-400" },
  jetx: { name: "JetX", label: "Jet Analysis", icon: Target, accent: "from-cyan-500 via-blue-500 to-indigo-500" },
};

export default function UnifiedCalculator({ defaultGame = "aviator" as SupportedGame }: { defaultGame?: SupportedGame }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [time, setTime] = useState("");
  const [coefficient, setCoefficient] = useState("");
  const [result, setResult] = useState<ReturnType<typeof analyseSingleRound> | null>(null);
  const [error, setError] = useState("");
  const meta = META[defaultGame];
  const Icon = meta.icon;

  if (!user) { navigate("/login"); return null; }

  const calculate = () => {
    setError("");
    const c = Number(coefficient.replace(",", ".").replace(/x$/i, ""));
    if (!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time)) {
      setError("Saisissez l'heure précise au format HH:MM:SS.");
      return;
    }
    if (!Number.isFinite(c) || c < 1 || c > 10000) {
      setError("Coefficient invalide : utilisez une valeur comprise entre 1,00x et 10 000x.");
      return;
    }
    setResult(analyseSingleRound({ game: defaultGame, time, coefficient: c }));
  };

  const reset = () => { setResult(null); setTime(""); setCoefficient(""); setError(""); };

  return (
    <div className="min-h-screen bg-[#08090d] text-white flex flex-col overflow-x-hidden">
      <div className={`absolute inset-x-0 top-0 h-72 bg-gradient-to-br ${meta.accent} opacity-15 blur-3xl pointer-events-none`} />
      <header className="relative z-10 border-b border-white/10 bg-black/30 backdrop-blur-2xl">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate("/games")} className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center" aria-label="Retour"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1"><div className="text-[10px] tracking-[0.3em] uppercase text-white/45">Premium Engine</div><h1 className="text-lg font-medium mt-0.5">{meta.name}</h1></div>
          <div className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-[10px] tracking-wider uppercase text-white/55">{meta.label}</div>
        </div>
      </header>

      <main className="relative z-10 w-full max-w-2xl mx-auto px-4 py-7 pb-12 space-y-5">
        <section className="rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-7">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${meta.accent} p-[1px] shadow-lg`}><div className="h-full w-full rounded-2xl bg-[#0d0f15] flex items-center justify-center"><Icon className="w-6 h-6" /></div></div>
              <div><h2 className="text-2xl font-medium">Analyse {meta.name}</h2><p className="text-xs text-white/45 mt-1">Interface dédiée — aucun autre jeu sur cette page</p></div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-8">
              <label className="block rounded-2xl border border-white/10 bg-black/20 p-4">
                <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/45"><Clock3 className="w-3.5 h-3.5" /> Heure précise</span>
                <Input type="time" step="1" value={time} onChange={(e) => setTime(e.target.value)} className="mt-3 h-14 border-0 bg-transparent px-0 text-2xl font-mono text-white focus-visible:ring-0" />
              </label>
              <label className="block rounded-2xl border border-white/10 bg-black/20 p-4">
                <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/45"><Gauge className="w-3.5 h-3.5" /> Coefficient</span>
                <div className="flex items-center gap-2 mt-2"><Input inputMode="decimal" type="text" placeholder="2,50" value={coefficient} onChange={(e) => setCoefficient(e.target.value)} className="h-14 border-0 bg-transparent px-0 text-3xl font-mono text-white focus-visible:ring-0" /><span className="text-xl text-white/35">×</span></div>
              </label>
            </div>

            {error && <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">{error}</div>}
            <div className="grid grid-cols-[1fr_auto] gap-3 mt-5">
              <Button onClick={calculate} className={`h-14 rounded-2xl bg-gradient-to-r ${meta.accent} text-black font-semibold hover:opacity-90`}><Sparkles className="w-4 h-4 mr-2" />Lancer l'analyse</Button>
              <Button onClick={reset} variant="outline" className="h-14 w-14 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10" aria-label="Réinitialiser"><RotateCcw className="w-4 h-4" /></Button>
            </div>
          </div>
        </section>

        {!result ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 flex gap-3"><ShieldCheck className="w-5 h-5 shrink-0 text-white/60" /><div><p className="text-sm font-medium">Analyse transparente</p><p className="text-xs text-white/40 mt-1 leading-relaxed">L'heure et le coefficient sont traités séparément. Le moteur fournit un repère analytique et ne prétend pas connaître un résultat RNG futur.</p></div></section>
        ) : (
          <section className="space-y-4">
            <div className={`rounded-[30px] border border-white/10 bg-gradient-to-br ${meta.accent} p-[1px] shadow-2xl`}>
              <div className="rounded-[29px] bg-[#0b0d12] p-6">
                <div className="flex items-start justify-between gap-4"><div><div className="text-[10px] uppercase tracking-[0.25em] text-white/40">Résultat {meta.name}</div><div className="text-4xl font-medium mt-3">{result.coefficient.toFixed(2)}<span className="text-xl text-white/35">×</span></div></div><div className="text-right"><div className="text-[10px] uppercase tracking-wider text-white/35">Indice</div><div className="text-2xl font-medium mt-1">{result.score}/100</div></div></div>
                <div className="grid grid-cols-2 gap-3 mt-6"><div className="rounded-2xl bg-white/[0.045] border border-white/10 p-4"><div className="text-[10px] uppercase tracking-wider text-white/35">Heure précise</div><div className="text-lg font-mono mt-2">{result.time}</div></div><div className="rounded-2xl bg-white/[0.045] border border-white/10 p-4"><div className="text-[10px] uppercase tracking-wider text-white/35">Zone</div><div className="text-lg mt-2">{result.zone}</div></div></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] uppercase tracking-wider text-white/35">Repère temporel</div><div className="text-2xl font-mono mt-2">{result.referenceTime}</div><p className="text-[10px] text-white/35 mt-2">fenêtre de suivi</p></div><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] uppercase tracking-wider text-white/35">Niveau de risque</div><div className="text-2xl mt-2">{result.risk}</div><p className="text-[10px] text-white/35 mt-2">selon le coefficient saisi</p></div></div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /><span className="text-sm font-medium">Lecture du résultat</span></div><p className="text-xs leading-relaxed text-white/45 mt-3">{result.note}</p></div>
          </section>
        )}
      </main>
    </div>
  );
}
