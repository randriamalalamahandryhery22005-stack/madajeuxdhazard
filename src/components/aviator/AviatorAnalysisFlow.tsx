import { useCallback, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Radar,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import AviatorLevelSelect from "@/components/aviator/AviatorLevelSelect";
import AviatorLevelRunner from "@/components/aviator/AviatorLevelRunner";
import AviatorRealtimeMode from "@/components/AviatorRealtimeMode";
import {
  analyzeHistory,
  recommendLevel,
  type HistoryStats,
  type LevelId,
  type LevelRecommendation,
} from "@/lib/aviatorLevels";

interface Props {
  showSeconds: boolean;
  accessStart: string | null;
  accessExpiry: string | null;
  onBack: () => void;
}

type Step = "capture" | "levels" | "run";

/** Nombre minimum de tours exigés dans la capture avant le choix du niveau. */
const MIN_ROUNDS = 30;

/** Base statistique neutre utilisée lorsque la capture est ignorée. */
const BASELINE_HISTORY = [
  1.42, 2.31, 1.08, 3.75, 1.96, 1.21, 5.42, 2.08, 1.34, 1.77,
  2.64, 1.12, 4.19, 1.53, 1.89, 2.95, 1.27, 1.66, 7.31, 1.44,
  2.22, 1.05, 3.08, 1.71, 1.38, 2.47, 1.19, 6.02, 1.58, 2.13,
];

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
    reader.readAsDataURL(file);
  });

const AviatorAnalysisFlow = ({ showSeconds, accessStart, accessExpiry, onBack }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("capture");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [multipliers, setMultipliers] = useState<number[] | null>(null);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [reco, setReco] = useState<LevelRecommendation | null>(null);
  const [level, setLevel] = useState<LevelId | null>(null);

  const runCapture = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    setMultipliers(null);
    setStats(null);
    setReco(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      const { data, error: fnError } = await supabase.functions.invoke("extract-multipliers", {
        body: { imageBase64: dataUrl, game: "aviator" },
      });
      if (fnError) throw new Error(fnError.message || "Analyse indisponible pour le moment.");
      const res = data as { valid: boolean; multipliers: number[]; reason?: string };
      if (!res?.valid || !Array.isArray(res.multipliers) || res.multipliers.length === 0) {
        setError(
          res?.reason ||
            "Capture invalide : l'historique des multiplicateurs n'a pas été détecté. Envoyez une capture nette des 30 derniers tours.",
        );
        return;
      }
      // Exigence stricte : au minimum les 30 derniers tours doivent être visibles.
      if (res.multipliers.length < MIN_ROUNDS) {
        setError(
          `Capture incomplète : seulement ${res.multipliers.length} tour${res.multipliers.length > 1 ? "s" : ""} détecté${res.multipliers.length > 1 ? "s" : ""}. ` +
            `Envoyez une capture plus complète affichant au minimum les ${MIN_ROUNDS} derniers tours (${MIN_ROUNDS} ou plus).`,
        );
        return;
      }
      const s = analyzeHistory(res.multipliers);
      setMultipliers(res.multipliers.slice(0, MIN_ROUNDS));
      setStats(s);
      setReco(recommendLevel(s));
      setStep("levels");
    } catch (e) {
      setError((e as Error).message || "Erreur pendant l'analyse de la capture.");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Étape facultative : l'utilisateur peut choisir un niveau sans capture.
   * Le moteur démarre alors sur une base statistique neutre de référence.
   */
  const skipCapture = () => {
    setError(null);
    setPreview(null);
    setMultipliers(null);
    const s = analyzeHistory(BASELINE_HISTORY);
    setStats(s);
    setReco(recommendLevel(s));
    setStep("levels");
  };

  const resetCapture = () => {
    setPreview(null);
    setMultipliers(null);
    setStats(null);
    setReco(null);
    setError(null);
    setLevel(null);
    setStep("capture");
    if (fileRef.current) fileRef.current.value = "";
  };

  // Niveau 1 conserve son interface historique (double zone), avec le moteur amélioré.
  if (step === "run" && level === 1 && stats) {
    return (
      <AviatorRealtimeMode
        showSeconds={showSeconds}
        accessStart={accessStart}
        accessExpiry={accessExpiry}
        stats={stats}
        onBack={() => setStep("levels")}
        onNewCapture={resetCapture}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col luxe-page">
      <div className="px-4 pt-4">
        <div className="luxe-header luxe-ring flex items-center gap-3">
          <button
            onClick={() => (step === "capture" ? onBack() : step === "levels" ? resetCapture() : setStep("levels"))}
            className="luxe-back"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="luxe-icon-badge luxe-float relative">
            <Radar className="w-5 h-5" strokeWidth={2.4} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00D084] ring-2 ring-[#050505] animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg luxe-title leading-tight">Analyse Aviator</h1>
            <p className="text-[10px] text-white/60 flex items-center gap-1.5 truncate mt-0.5">
              <Sparkles className="w-3 h-3 luxe-emerald" /> Capture · Analyse · Niveau · Prédiction
            </p>
          </div>
          <span className="luxe-badge-premium">PREMIUM</span>
        </div>

        {/* Fil d'étapes */}
        <div className="mt-3 flex items-center gap-1.5 px-1">
          {(["Capture", "Niveau", "Prédiction"] as const).map((label, i) => {
            const idx = step === "capture" ? 0 : step === "levels" ? 1 : 2;
            const active = i <= idx;
            return (
              <div key={label} className="flex-1 flex items-center gap-1.5">
                <div className="flex-1">
                  <div
                    className="h-1 rounded-full transition-all duration-500"
                    style={{ background: active ? "linear-gradient(90deg,#00D084,#F4C542)" : "rgba(255,255,255,0.1)" }}
                  />
                  <p
                    className={`mt-1 text-[9px] uppercase tracking-widest font-bold ${
                      active ? "luxe-gold" : "text-white/35"
                    }`}
                  >
                    {label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {(accessStart || accessExpiry) && (
          <div className="mt-2 flex gap-3 px-2 text-[10px] text-white/40">
            {accessStart && <span>Début · {new Date(accessStart).toLocaleDateString("fr-FR")}</span>}
            {accessExpiry && <span>Expire · {new Date(accessExpiry).toLocaleDateString("fr-FR")}</span>}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {step === "capture" && (
          <>
            <div className="luxe-card luxe-card-emerald relative overflow-hidden p-4">
              <span
                className="absolute -top-20 -right-14 w-52 h-52 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(0,208,132,0.28), transparent 68%)" }}
              />
              <div className="relative flex items-center gap-3">
                <div className="luxe-icon-badge shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.22em] luxe-emerald font-bold">Étape facultative</p>
                  <h2 className="text-base font-black text-white leading-tight">Capture des 30 derniers tours</h2>
                </div>
              </div>
              <p className="relative text-[11px] text-white/62 leading-relaxed mt-3">
                Envoyez une capture d'écran affichant clairement au minimum les 30 derniers coefficients (30 tours ou
                plus) : une capture incomplète sera refusée. Le moteur analyse automatiquement les données puis
                détermine le niveau le plus adapté. Vous pouvez aussi passer cette étape et choisir directement un
                niveau.
              </p>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) runCapture(f);
                }}
              />
              <div className="relative mt-4 flex gap-2">
                <Button className="luxe-btn flex-1 h-12 text-sm" onClick={() => fileRef.current?.click()} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyse en cours…
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" /> Capturer l'historique
                    </>
                  )}
                </Button>
                {(preview || error) && !loading && (
                  <Button variant="outline" className="h-12 px-3 luxe-btn-outline" onClick={resetCapture} aria-label="Effacer">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <button
                onClick={skipCapture}
                disabled={loading}
                className="relative mt-3 w-full text-[11px] font-bold luxe-gold hover:underline disabled:opacity-40"
              >
                Continuer sans capture · choisir un niveau directement
              </button>
            </div>

            {loading && (
              <div className="luxe-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-white/70 font-semibold">
                  <Activity className="w-3.5 h-3.5 luxe-emerald animate-pulse" /> Lecture de l'historique et calcul du
                  niveau recommandé…
                </div>
                <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full w-1/2 rounded-full animate-pulse"
                    style={{ background: "linear-gradient(90deg,#00D084,#F4C542)" }}
                  />
                </div>
              </div>
            )}

            {preview && (
              <div className="luxe-card p-3">
                <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-widest text-white/45 font-bold">
                  <ImageIcon className="w-3.5 h-3.5" /> Capture envoyée
                </div>
                <img
                  src={preview}
                  alt="Historique capturé"
                  className="w-full max-h-52 object-contain rounded-xl border border-white/10"
                />
              </div>
            )}

            {error && !loading && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-destructive text-sm">Capture invalide</p>
                  <p className="text-[11px] text-white/60 mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
            )}
          </>
        )}

        {step === "levels" && reco && stats && (
          <>
            {multipliers && multipliers.length > 0 ? (
              <CaptureSummary stats={stats} multipliers={multipliers} onNewCapture={resetCapture} />
            ) : (
              <div className="luxe-card p-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 luxe-gold shrink-0" />
                <p className="text-[11px] text-white/65 leading-relaxed">
                  Aucune capture fournie : le moteur démarre sur une base statistique neutre.
                </p>
                <button onClick={resetCapture} className="ml-auto text-[10px] font-bold luxe-gold hover:underline shrink-0">
                  Ajouter une capture
                </button>
              </div>
            )}
            <AviatorLevelSelect
              recommendation={reco}
              onSelect={(l) => {
                setLevel(l);
                setStep("run");
              }}
            />
          </>
        )}

        {step === "run" && level && level !== 1 && stats && (
          <AviatorLevelRunner
            level={level}
            stats={stats}
            onBack={() => setStep("levels")}
            onNewCapture={resetCapture}
          />
        )}
      </div>
    </div>
  );
};

const CaptureSummary = ({
  stats,
  multipliers,
  onNewCapture,
}: {
  stats: HistoryStats;
  multipliers: number[];
  onNewCapture: () => void;
}) => (
  <div className="luxe-card p-4">
    <div className="flex items-center gap-2 mb-3">
      <CheckCircle2 className="w-4 h-4 luxe-emerald" />
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/55 font-bold">
        Historique analysé · {stats.count} tours
      </p>
      <button
        onClick={onNewCapture}
        className="ml-auto text-[10px] font-bold luxe-gold hover:underline"
        aria-label="Nouvelle capture"
      >
        Nouvelle capture
      </button>
    </div>

    <div className="flex flex-wrap gap-1.5 mb-3">
      {multipliers.map((m, i) => (
        <span
          key={i}
          className={`px-2 py-1 rounded-lg text-[10.5px] font-mono font-bold border ${
            m < 2
              ? "bg-sky-500/10 text-sky-300 border-sky-500/25"
              : m < 5
                ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                : m < 20
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                  : "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/25"
          }`}
        >
          {m.toFixed(2)}
        </span>
      ))}
    </div>

    <div className="grid grid-cols-4 gap-2">
      {[
        { k: "Moyenne", v: stats.mean.toFixed(2) },
        { k: "Volatilité", v: stats.volatility.toFixed(2) },
        { k: "≥ 5.00x", v: `${Math.round(stats.high5plusRatio * 100)}%` },
        { k: "Tendance", v: stats.trend },
      ].map((s) => (
        <div key={s.k} className="rounded-xl border border-white/8 bg-black/30 px-2 py-2 text-center">
          <p className="text-[8px] uppercase tracking-widest text-white/40 font-bold">{s.k}</p>
          <p className="text-[11px] font-black text-white tabular-nums">{s.v}</p>
        </div>
      ))}
    </div>
  </div>
);

export default AviatorAnalysisFlow;
