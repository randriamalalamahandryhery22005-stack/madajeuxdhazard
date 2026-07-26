import { useState } from "react";
import { ArrowLeft, Plane, AlertTriangle, Sparkles, Clock, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { detectBadStreak, generateRafalPrediction, type RafalPrediction } from "@/lib/rafalPredictions";
import { formatCoefficient } from "@/lib/predictions";
import rafalLogo from "@/assets/logo-aviator-rafal.png";

interface Props {
  accessStart: string | null;
  accessExpiry: string | null;
  onBack: () => void;
}

const AviatorRafalMode = ({ accessStart, accessExpiry, onBack }: Props) => {
  const [time, setTime] = useState("");
  const [coeff, setCoeff] = useState("");
  const [historyInput, setHistoryInput] = useState("");
  const [history, setHistory] = useState<number[]>([]);
  const [prediction, setPrediction] = useState<RafalPrediction | null>(null);
  const [error, setError] = useState("");

  const addToHistory = () => {
    const v = parseFloat(historyInput);
    if (isNaN(v) || v < 1 || v > 1000) { setError("Coefficient invalide (1 - 1000)"); return; }
    setError("");
    setHistory(h => [...h, parseFloat(v.toFixed(2))].slice(-10));
    setHistoryInput("");
  };

  const removeFromHistory = (i: number) => setHistory(h => h.filter((_, idx) => idx !== i));

  const handlePredict = () => {
    setError("");
    if (!time || !coeff) { setError("Veuillez remplir l'heure et le coefficient"); return; }
    const [h, m] = time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) { setError("Format d'heure invalide"); return; }
    const c = parseFloat(coeff);
    if (isNaN(c) || c < 5 || c > 50) { setError("Coefficient entre 5.00 et 50.00"); return; }

    const signal = detectBadStreak(history);
    if (signal.type === "neutral" && history.length >= 3) {
      setError("⚠️ Aucun tour défavorable détecté — Aviator Rafal ne s'applique pas maintenant");
      return;
    }
    setPrediction(generateRafalPrediction(h, m, c, signal));
  };

  const reset = () => { setPrediction(null); setError(""); };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-950 via-background to-green-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-900/40 via-card/60 to-green-900/30 backdrop-blur-xl">
        <button onClick={() => prediction ? reset() : onBack()} className="p-2 rounded-lg hover:bg-emerald-500/10 transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5 text-emerald-200" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Plane className="w-5 h-5 text-emerald-400" />
            <span className="bg-gradient-to-r from-emerald-300 via-green-200 to-emerald-400 bg-clip-text text-transparent">Aviator Rafal</span>
          </h1>
          <p className="text-[10px] text-emerald-300/70 uppercase tracking-wider">Méthode anti-mauvais tours</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {!prediction ? (
          <>
            {/* Logo & explainer */}
            <div className="flex flex-col items-center gap-3 py-3" style={{ animation: "fade-up 0.4s ease forwards" }}>
              <img src={rafalLogo} alt="Aviator Rafal" width={1024} height={1024} loading="lazy" className="w-28 h-28 object-contain drop-shadow-2xl" />
              <p className="text-xs text-center text-muted-foreground max-w-xs leading-relaxed">
                Applique la méthode Rafal uniquement quand les tours sont défavorables :
                <br /><span className="text-red-400 font-semibold">🔴 plusieurs &gt;5.00x</span> ou <span className="text-blue-400 font-semibold">🔵 série bleue &lt;2.00x</span>.
              </p>
            </div>

            {/* Historique des coefficients */}
            <div className="p-4 rounded-2xl bg-card/80 border border-primary/15 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">Historique récent</h3>
                <span className="text-[10px] text-muted-foreground ml-auto">{history.length}/10</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Coeff. ex: 1.45"
                  value={historyInput}
                  onChange={(e) => setHistoryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addToHistory()}
                  className="h-10 bg-secondary/80 border-border/40 font-mono text-sm flex-1"
                />
                <Button onClick={addToHistory} variant="secondary" className="h-10 px-4">+</Button>
              </div>
              {history.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {history.map((h, i) => {
                    const tone = h >= 5
                      ? "bg-red-500/15 text-red-400 border-red-500/30"
                      : h < 2
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      : "bg-secondary text-foreground border-border/40";
                    return (
                    <span key={i} className={`group inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-mono font-semibold ${tone}`}>
                        {formatCoefficient(h)}
                        <button onClick={() => removeFromHistory(i)} className="opacity-50 hover:opacity-100"><X className="w-3 h-3" /></button>
                      </span>
                    );
                  })}
                </div>
              )}
              {history.length >= 3 && (() => {
                const sig = detectBadStreak(history);
                const tone = sig.type === "high_streak" ? "border-red-500/40 bg-red-500/10 text-red-300"
                  : sig.type === "blue_streak" ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
                return (
                  <div className={`flex items-center gap-2 p-2.5 rounded-xl border ${tone}`}>
                    <span className="text-base">{sig.emoji}</span>
                    <span className="text-xs font-semibold">{sig.label}</span>
                  </div>
                );
              })()}
            </div>

            {/* Inputs prédiction */}
            <div className="p-4 rounded-2xl bg-card/80 border border-primary/20 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold gold-text">Case de prédiction</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Heure (HH:MM)</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 bg-secondary/80 border-border/40 text-center font-mono text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Coeff. (5 - 50)</Label>
                  <Input type="number" step="0.01" min="5" max="50" placeholder="7.34" value={coeff} onChange={(e) => setCoeff(e.target.value)} className="h-12 bg-secondary/80 border-border/40 text-center font-mono text-base" />
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive font-medium">{error}</p>
                </div>
              )}
              <Button variant="premium" className="w-full h-12 text-sm" onClick={handlePredict}>
                Appliquer Aviator Rafal
              </Button>
            </div>

            {(accessStart || accessExpiry) && (
              <div className="text-center text-[10px] text-muted-foreground">
                {accessStart && <>Début: {new Date(accessStart).toLocaleDateString("fr-FR")} </>}
                {accessExpiry && <> · Expire: {new Date(accessExpiry).toLocaleDateString("fr-FR")}</>}
              </div>
            )}
          </>
        ) : (
          /* Result screen */
          <div className="space-y-4" style={{ animation: "fade-up 0.4s ease forwards" }}>
            {/* Signal banner */}
            <div className={`p-3 rounded-2xl border-2 flex items-center gap-3 ${
              prediction.signal.type === "high_streak" ? "border-red-500/40 bg-red-500/10" :
              prediction.signal.type === "blue_streak" ? "border-blue-500/40 bg-blue-500/10" :
              "border-primary/30 bg-primary/10"
            }`}>
              <span className="text-2xl">{prediction.signal.emoji}</span>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">Signal détecté</p>
                <p className="text-sm font-bold">{prediction.signal.label}</p>
              </div>
            </div>

            {/* Hero card — vert dégradé */}
            <div className="relative p-5 rounded-3xl bg-gradient-to-br from-emerald-500/25 via-green-600/15 to-emerald-900/20 border-2 border-emerald-400/40 shadow-2xl shadow-emerald-500/20 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-400/20 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-green-500/15 blur-3xl" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-2">
                  <img src={rafalLogo} alt="" width={1024} height={1024} loading="lazy" className="w-10 h-10 object-contain" />
                  <div>
                    <h2 className="text-base font-black bg-gradient-to-r from-emerald-200 via-white to-green-200 bg-clip-text text-transparent">Méthode Aviator Rafal</h2>
                    <p className="text-[10px] text-emerald-200/80 uppercase tracking-wider">Prédiction sécurisée</p>
                  </div>
                </div>

                {/* Case de prédiction */}
                <div className="p-4 rounded-2xl bg-emerald-950/40 backdrop-blur border border-emerald-400/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-200/80 font-semibold">
                    <Clock className="w-3 h-3" /> Case de prédiction
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-white">{prediction.inputTime}</span>
                    <span className="text-xl font-black font-mono text-emerald-300">{formatCoefficient(prediction.inputCoeff)}</span>
                  </div>
                </div>

                {/* Résultat */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 text-white space-y-2 shadow-lg shadow-emerald-500/40 border border-emerald-300/40">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold opacity-95">
                    <Sparkles className="w-3 h-3" /> Résultat prédit
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono drop-shadow-md">{prediction.resultTime}</span>
                    <span className="text-2xl font-black font-mono drop-shadow-md">{formatCoefficient(prediction.resultCoeff)}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
              ⚠️ Le coefficient résultat n'est pas forcément proportionnel.<br />
              Aviator Rafal s'applique uniquement aux situations défavorables.
            </p>

            <Button onClick={reset} variant="secondary" className="w-full h-11">
              Nouvelle prédiction
            </Button>
          </div>
        )}
      </div>
      <div className="h-20" />
    </div>
  );
};

export default AviatorRafalMode;
