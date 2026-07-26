import { Trophy, Target, TrendingUp, Shield, ArrowLeft, RotateCcw, CheckCircle2, AlertTriangle, Info, BarChart3, Percent, Goal, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type VirtuelMatchResult } from "@/lib/virtualPredictions";

interface VirtuelResultsProps {
  results: VirtuelMatchResult[];
  leagueColor?: string;
  onBack: () => void;
  onNewMatch: () => void;
}

const confLevel = (c: number) => {
  if (c >= 75) return { label: "Élevé", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/25", icon: <CheckCircle2 className="w-4 h-4 text-green-400" /> };
  if (c >= 55) return { label: "Moyen", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> };
  return { label: "Faible", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", icon: <AlertTriangle className="w-4 h-4 text-red-400" /> };
};

const probColor = (p: number) => p >= 70 ? "text-green-400" : p >= 50 ? "text-amber-400" : "text-red-400";
const probBg = (p: number) => p >= 70 ? "bg-green-500" : p >= 50 ? "bg-amber-500" : "bg-red-500";
const probDot = (p: number) => p >= 70 ? "🟢" : p >= 50 ? "🟡" : "🔴";

const PredictionRow = ({ label, value, prob }: { label: string; value: string; prob?: number }) => (
  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 border border-border/20">
    <span className="text-xs text-muted-foreground font-medium">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-foreground">{value}</span>
      {prob !== undefined && (
        <span className={`text-[10px] font-bold ${probColor(prob)}`}>{probDot(prob)} {prob}%</span>
      )}
    </div>
  </div>
);

const VirtuelResults = ({ results, onBack, onNewMatch }: VirtuelResultsProps) => {
  return (
    <div className="space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
      {results.map((r, idx) => {
        const conf = confLevel(r.confidence);
        const isHome = r.winner === "home";
        const isDraw = r.winner === "draw";
        const d = r.detailed;
        const ft1x2 = isHome ? "1" : isDraw ? "X" : "2";

        return (
          <div key={idx} className="space-y-3">
            {/* Score Card */}
            <div className="rounded-2xl overflow-hidden border border-green-500/25 bg-card/90 backdrop-blur-sm">
              <div className="bg-gradient-to-r from-green-500/15 via-card to-emerald-500/10 px-4 py-3 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Prédiction IA</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${conf.bg}`}>
                    {conf.icon}
                    <span className={`text-[10px] font-bold ${conf.color}`}>{r.confidence}%</span>
                  </div>
                </div>
              </div>
              <div className="px-4 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-center space-y-1">
                    <p className={`font-bold text-sm ${isHome ? "text-green-400" : "text-foreground"}`}>{r.homeTeam}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Domicile</p>
                  </div>
                  <div className="flex items-center gap-3 px-4">
                    <span className={`text-4xl font-black font-mono ${isHome ? "text-green-400" : isDraw ? "text-amber-400" : "text-foreground"}`}>{r.homeScore}</span>
                    <span className="text-lg text-muted-foreground font-light">-</span>
                    <span className={`text-4xl font-black font-mono ${!isHome && !isDraw ? "text-green-400" : isDraw ? "text-amber-400" : "text-foreground"}`}>{r.awayScore}</span>
                  </div>
                  <div className="flex-1 text-center space-y-1">
                    <p className={`font-bold text-sm ${!isHome && !isDraw ? "text-green-400" : "text-foreground"}`}>{r.awayTeam}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Extérieur</p>
                  </div>
                </div>
                {/* HT Score */}
                <div className="text-center mt-2">
                  <span className="text-[10px] text-muted-foreground">Mi-temps: </span>
                  <span className="text-xs font-bold text-foreground">{r.htHomeScore} - {r.htAwayScore}</span>
                </div>
              </div>
              <div className={`px-4 py-2.5 border-t border-border/30 ${isDraw ? "bg-amber-500/8" : "bg-green-500/8"}`}>
                <div className="flex items-center justify-center gap-2">
                  <Target className={`w-4 h-4 ${isDraw ? "text-amber-400" : "text-green-400"}`} />
                  <span className={`text-sm font-bold ${isDraw ? "text-amber-400" : "text-green-400"}`}>
                    {isDraw ? "Match Nul" : `Victoire ${r.winnerName}`}
                  </span>
                </div>
              </div>
            </div>

            {/* TOP 3 SCORES PROBABLES — côte à côte */}
            <div className="rounded-2xl border border-primary/25 bg-card/90 overflow-hidden glow-gold">
              <div className="bg-gradient-to-r from-primary/15 via-card to-primary/5 px-4 py-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold gold-text uppercase tracking-wider">Top 3 scores probables</span>
                </div>
              </div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {d.topScores.map((ts, j) => {
                  const isMain = j === 0;
                  const tone = ts.outcome === "home" ? "text-green-400 border-green-500/30 bg-green-500/5"
                    : ts.outcome === "draw" ? "text-amber-400 border-amber-500/30 bg-amber-500/5"
                    : "text-red-400 border-red-500/30 bg-red-500/5";
                  return (
                    <div key={j} className={`relative rounded-xl border-2 ${tone} p-3 text-center ${isMain ? "ring-2 ring-primary/40" : ""}`}>
                      {isMain && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] px-2 py-0.5 rounded-full gold-gradient text-primary-foreground font-bold uppercase tracking-wider">Principal</span>
                      )}
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                        {ts.outcome === "home" ? "Dom." : ts.outcome === "draw" ? "Nul" : "Ext."}
                      </p>
                      <p className="text-2xl font-black font-mono">{ts.score}</p>
                      <div className="mt-1.5 flex items-center justify-center gap-1">
                        <div className="w-10 h-1 rounded-full bg-secondary/80 overflow-hidden">
                          <div className={`h-full rounded-full ${ts.outcome === "home" ? "bg-green-500" : ts.outcome === "draw" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, ts.prob * 2)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold">{ts.prob}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cartes détaillées en 2 colonnes côte à côte */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Main Predictions Card */}
              <div className="rounded-2xl border border-violet-500/25 bg-card/90 overflow-hidden min-w-0">
                <div className="bg-gradient-to-r from-violet-500/15 via-card to-violet-500/5 px-4 py-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wider truncate">Résultats détaillés</span>
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  <PredictionRow label="1X2" value={ft1x2} prob={Math.round(r[r.winner === "home" ? "homeProb" : r.winner === "away" ? "awayProb" : "drawProb"])} />
                  <PredictionRow label="Mi-temps 1X2" value={d.halfTime1X2} prob={Math.floor(60 + r.confidence * 0.2)} />
                  <PredictionRow label="Double Chance" value={d.doubleChance} prob={Math.min(92, Math.floor(70 + r.confidence * 0.15))} />
                  <PredictionRow label="MT Double Chance" value={d.halfTimeDoubleChance} prob={Math.min(88, Math.floor(65 + r.confidence * 0.15))} />
                  <PredictionRow label="Score exact" value={d.exactScore} prob={Math.min(45, Math.floor(15 + r.confidence * 0.2))} />
                  <PredictionRow label="MT Clean Sheet" value={d.halfTimeCleanSheet} prob={Math.min(80, Math.floor(50 + r.confidence * 0.2))} />
                  <PredictionRow label="HT/FT" value={d.htft} prob={Math.min(70, Math.floor(35 + r.confidence * 0.25))} />
                  <PredictionRow label="Total buts" value={String(d.totalGoals)} prob={Math.min(85, Math.floor(55 + r.confidence * 0.2))} />
                  <PredictionRow label="G/NG" value={d.goalNoGoal} prob={Math.min(82, Math.floor(55 + r.confidence * 0.2))} />
                  <PredictionRow label="BTTS" value={d.btts} prob={Math.min(80, Math.floor(50 + r.confidence * 0.2))} />
                  <PredictionRow label="BTTS 1ère MT" value={d.bttsFirstHalf} prob={Math.min(65, Math.floor(30 + r.confidence * 0.2))} />
                </div>
              </div>

              {/* Over/Under Card */}
              <div className="rounded-2xl border border-sky-500/25 bg-card/90 overflow-hidden min-w-0">
                <div className="bg-gradient-to-r from-sky-500/15 via-card to-sky-500/5 px-4 py-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider truncate">Plus / Moins</span>
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  {d.overUnder.map((ou, j) => (
                    <div key={j} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-secondary/30 border border-border/20 min-w-0">
                      <span className="text-xs text-muted-foreground font-medium truncate">{ou.label}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold">{ou.value}</span>
                        <span className={`text-[10px] font-bold ${probColor(ou.prob)}`}>{ou.prob}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Combinations Card */}
              <div className="rounded-2xl border border-amber-500/25 bg-card/90 overflow-hidden min-w-0">
                <div className="bg-gradient-to-r from-amber-500/15 via-card to-amber-500/5 px-4 py-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider truncate">Combinaisons</span>
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  {d.combinations.map((c, j) => (
                    <div key={j} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-secondary/30 border border-border/20 min-w-0">
                      <span className="text-xs text-muted-foreground font-medium truncate">{c.label}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold">{c.value}</span>
                        <span className={`text-[10px] font-bold ${probColor(c.prob)}`}>{c.prob}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Home Total Card */}
              <div className="rounded-2xl border border-emerald-500/25 bg-card/90 overflow-hidden min-w-0">
                <div className="bg-gradient-to-r from-emerald-500/15 via-card to-emerald-500/5 px-4 py-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Goal className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider truncate">Total domicile</span>
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  {d.homeTotal.map((h, j) => (
                    <div key={j} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-secondary/30 border border-border/20 min-w-0">
                      <span className="text-xs text-muted-foreground font-medium truncate">{h.label}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold">{h.value}</span>
                        <span className={`text-[10px] font-bold ${probColor(h.prob)}`}>{h.prob}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Probability Analysis */}
              <div className="rounded-2xl border border-cyan-500/25 bg-card/90 overflow-hidden min-w-0">
                <div className="bg-gradient-to-r from-cyan-500/15 via-card to-cyan-500/5 px-4 py-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider truncate">Probabilités</span>
                  </div>
                </div>
                <div className="px-4 py-4 space-y-3">
                  {[
                    { label: r.homeTeam, prob: r.homeProb, color: "bg-green-500", textColor: "text-green-400" },
                    { label: "Match Nul", prob: r.drawProb, color: "bg-amber-500", textColor: "text-amber-400" },
                    { label: r.awayTeam, prob: r.awayProb, color: "bg-red-500", textColor: "text-red-400" },
                  ].map((item, j) => (
                    <div key={j} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-muted-foreground font-medium truncate">{item.label}</span>
                        <span className={`font-bold flex-shrink-0 ${item.textColor}`}>{item.prob}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-secondary/80 overflow-hidden">
                        <div className={`h-full rounded-full ${item.color} transition-all duration-1000`} style={{ width: `${item.prob}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="text-center pt-1">
                    <span className="text-[10px] text-muted-foreground">Marge : <span className="font-bold text-cyan-300">{r.bookmakerMargin}%</span></span>
                  </div>
                </div>
              </div>

              {/* Analysis Notes */}
              <div className="rounded-2xl border border-violet-500/25 bg-card/90 overflow-hidden min-w-0">
                <div className="bg-gradient-to-r from-violet-500/15 via-card to-violet-500/5 px-4 py-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wider truncate">Analyse</span>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  {r.analysisNotes.map((note, j) => (
                    <div key={j} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-violet-400/70" />
                      <span className="break-words">{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Disclaimer */}
            <div className="flex items-start gap-2 px-2 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500/60 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                Prédiction basée sur l'analyse statistique des cotes. Résultat non garanti à 100%.
              </p>
            </div>
          </div>
        );
      })}

      <div className="space-y-2 pt-2">
        <Button className="w-full h-12 text-sm bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Nouvelle analyse
        </Button>
        <Button variant="premium-outline" className="w-full h-11 text-sm" onClick={onNewMatch}>
          <RotateCcw className="w-4 h-4 mr-2" /> Changer de ligue
        </Button>
      </div>
    </div>
  );
};

export default VirtuelResults;
