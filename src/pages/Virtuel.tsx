import { useState, useEffect, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Swords, TrendingUp, Sparkles, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LEAGUES, type League, generateVirtuelPrediction, type VirtuelMatchResult } from "@/lib/virtualPredictions";
import VirtuelResults from "@/components/VirtuelResults";
import PremiumPaywall from "@/components/PremiumPaywall";
import { PREMIUM_GAME_MODES, computeTrial } from "@/lib/premiumAccess";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";




type ViewState = "leagues" | "predict" | "results";

const LEAGUE_STYLES: Record<string, { gradient: string; border: string; shadow: string; textColor: string; iconBg: string }> = {
  english: { gradient: "from-amber-600/20 via-amber-500/10 to-amber-900/5", border: "border-amber-500/30 hover:border-amber-500/50", shadow: "shadow-amber-500/10", textColor: "text-amber-400", iconBg: "bg-gradient-to-br from-amber-500 to-amber-700" },
  africa: { gradient: "from-amber-500/20 via-amber-400/10 to-amber-900/5", border: "border-amber-500/30 hover:border-amber-500/50", shadow: "shadow-amber-500/10", textColor: "text-amber-400", iconBg: "bg-gradient-to-br from-amber-500 to-amber-600" },
  champions: { gradient: "from-emerald-500/20 via-emerald-400/10 to-emerald-900/5", border: "border-emerald-500/30 hover:border-emerald-500/50", shadow: "shadow-emerald-500/10", textColor: "text-emerald-400", iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600" },
  italian: { gradient: "from-green-500/20 via-green-400/10 to-green-900/5", border: "border-green-500/30 hover:border-green-500/50", shadow: "shadow-green-500/10", textColor: "text-green-400", iconBg: "bg-gradient-to-br from-green-500 to-emerald-600" },
  spanish: { gradient: "from-amber-500/20 via-amber-400/10 to-amber-900/5", border: "border-amber-500/30 hover:border-amber-500/50", shadow: "shadow-amber-500/10", textColor: "text-amber-400", iconBg: "bg-gradient-to-br from-amber-500 to-amber-600" },
  french: { gradient: "from-emerald-500/20 via-emerald-400/10 to-emerald-900/5", border: "border-emerald-500/30 hover:border-emerald-500/50", shadow: "shadow-emerald-500/10", textColor: "text-emerald-400", iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600" },
  german: { gradient: "from-amber-500/20 via-amber-400/10 to-amber-900/5", border: "border-amber-500/30 hover:border-amber-500/50", shadow: "shadow-amber-500/10", textColor: "text-amber-400", iconBg: "bg-gradient-to-br from-amber-500 to-amber-600" },
  portuguese: { gradient: "from-emerald-500/20 via-emerald-400/10 to-emerald-900/5", border: "border-emerald-500/30 hover:border-emerald-500/50", shadow: "shadow-emerald-500/10", textColor: "text-emerald-400", iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600" },
};

const Virtuel = () => {
  const navigate = useNavigate();
  const { user, isAdmin, profile } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [subEnabled, setSubEnabled] = useState(true);
  const [view, setView] = useState<ViewState>("leagues");
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");

  const [error, setError] = useState("");
  const [enabledLeagues, setEnabledLeagues] = useState<Record<string, boolean>>({});
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<VirtuelMatchResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkAccess = async () => {
    if (!user) return;
    const trial = computeTrial(profile?.trial_started_at ?? null);
    if (isAdmin || trial.active) { setHasAccess(true); return; }
    const { data } = await supabase
      .from("game_access").select("*")
      .eq("user_id", user.id)
      .in("game_mode", PREMIUM_GAME_MODES as unknown as string[])
      .eq("is_active", true);
    const active = data?.find(d => !!d.granted_by && (!d.expires_at || new Date(d.expires_at) > new Date()));
    setHasAccess(!!active);
  };

  useEffect(() => {
    if (!user) return;
    checkAccess();
    supabase.from("activation_codes").select("code_value").eq("code_name", "sub_virtuel").maybeSingle()
      .then(({ data }) => setSubEnabled(data?.code_value === "enabled"));
    const fetchLeagueSettings = async () => {
      const { data } = await supabase.from("activation_codes").select("code_name, code_value");
      if (data) {
        const map: Record<string, boolean> = {};
        data.forEach(d => {
          if (d.code_name.startsWith("league_")) {
            map[d.code_name.replace("league_", "")] = d.code_value === "enabled";
          }
        });
        setEnabledLeagues(map);
      }
    };
    fetchLeagueSettings();
  }, [user, isAdmin]);

  const filteredLeagues = LEAGUES.filter(l => enabledLeagues[l.id] !== false);

  const handleLeagueSelect = (league: League) => {
    setSelectedLeague(league);
    setHomeTeam("");
    setAwayTeam("");
    setError("");
    setScreenshot(null);
    setView("predict");
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Fichier invalide", description: "Sélectionnez une image.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleStartAnalysis = async () => {
    setError("");
    if (!screenshot) { setError("Uploadez une capture d'écran des cotes"); return; }
    setAnalyzing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("virtuel-ai-analyze", {
        body: { mode: "extract_odds", imageDataUrl: screenshot },
      });
      if (fnError) throw fnError;
      const matches = (data as { matches?: Array<{ homeTeam: string; awayTeam: string; homeOdd: number; drawOdd: number; awayOdd: number }> })?.matches;
      if (!matches || matches.length === 0) throw new Error("Aucun match détecté dans l'image");
      const predictions = matches
        .filter(m => m.homeOdd && m.drawOdd && m.awayOdd && m.homeTeam && m.awayTeam)
        .map(m => generateVirtuelPrediction(m.homeTeam, m.awayTeam, m.homeOdd, m.awayOdd, m.drawOdd));
      if (predictions.length === 0) throw new Error("Cotes introuvables dans l'image");
      setResults(predictions);
      setView("results");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur d'analyse";
      toast({ title: "Analyse impossible", description: msg, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBack = () => {
    if (view === "results") { setView("predict"); setResults([]); }
    else if (view === "predict") { setView("leagues"); setSelectedLeague(null); setScreenshot(null); }
    else navigate("/games");
  };


  if (!user) { navigate("/login"); return null; }

  if (subEnabled && hasAccess === null) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" /></div>;
  }

  if (subEnabled && !hasAccess) {
    return <PremiumPaywall gameName="Virtuel" icon={<Trophy className="w-5 h-5 text-green-400" />} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-center gap-2 px-5 py-4 border-b border-border/50 bg-card/50 relative">
        <button onClick={handleBack} className="absolute left-4 p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <span className="text-sm font-black text-primary-foreground">V</span>
        </div>
        <h1 className="text-lg font-bold tracking-tight">VIRTUEL</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        <div className="px-5 space-y-4">




        {/* Leagues Grid - Horizontal Cards */}
        {view === "leagues" && (
          <div className="space-y-5" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div className="space-y-2">
              <h2 className="text-xl font-black flex items-center gap-2">⚽ INSTANT LEAGUE</h2>
              <p className="text-sm text-muted-foreground">Choisissez une ligue et prédisez le résultat d'un match.</p>
            </div>

            {/* Horizontal scroll league cards */}
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {filteredLeagues.map((league, i) => {
                const style = LEAGUE_STYLES[league.id] || LEAGUE_STYLES.english;
                return (
                  <button key={league.id} onClick={() => handleLeagueSelect(league)}
                    className={`snap-start flex-shrink-0 w-[140px] rounded-2xl p-4 text-center transition-all duration-300 active:scale-[0.97] border-2 bg-gradient-to-b ${style.gradient} ${style.border} shadow-lg ${style.shadow} backdrop-blur-sm`}
                    style={{ animation: `fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 50}ms forwards`, opacity: 0 }}>
                    <div className={`w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center shadow-lg mx-auto mb-3`}>
                      <span className="text-xl">{league.icon}</span>
                    </div>
                    <h3 className={`font-bold text-xs ${style.textColor} leading-tight`}>{league.name}</h3>
                    <p className="text-[9px] text-muted-foreground mt-1">{league.teams.length} équipes</p>
                  </button>
                );
              })}
            </div>

            {/* Full list below */}
            <div className="grid grid-cols-2 gap-3">
              {filteredLeagues.map((league, i) => {
                const style = LEAGUE_STYLES[league.id] || LEAGUE_STYLES.english;
                return (
                  <button key={league.id} onClick={() => handleLeagueSelect(league)}
                    className={`rounded-2xl p-3.5 text-left transition-all duration-300 active:scale-[0.98] border-2 bg-gradient-to-br ${style.gradient} ${style.border} shadow-lg ${style.shadow} backdrop-blur-sm`}
                    style={{ animation: `fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 40}ms forwards`, opacity: 0 }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <span className="text-lg">{league.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className={`font-bold text-xs ${style.textColor} truncate`}>{league.name}</h3>
                        <p className="text-[9px] text-muted-foreground">{league.teams.length} équipes</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button onClick={() => { setSelectedLeague(null); setHomeTeam(""); setAwayTeam(""); setView("predict"); }}
              className="w-full p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <Swords className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Match personnalisé</span>
            </button>
          </div>
        )}

        {/* Prediction Input */}
        {view === "predict" && (
          <div className="space-y-4" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            {selectedLeague && (() => {
              const style = LEAGUE_STYLES[selectedLeague.id] || LEAGUE_STYLES.english;
              return (
                <div className={`p-3 rounded-xl bg-gradient-to-r ${style.gradient} border-2 ${style.border.split(' ')[0]} flex items-center gap-3`}>
                  <div className={`w-10 h-10 rounded-lg ${style.iconBg} flex items-center justify-center`}>
                    <span className="text-lg">{selectedLeague.icon}</span>
                  </div>
                  <div>
                    <span className={`font-bold text-sm ${style.textColor}`}>{selectedLeague.name}</span>
                    <p className="text-[10px] text-muted-foreground">{selectedLeague.teams.length} équipes disponibles</p>
                  </div>
                </div>
              );
            })()}

            <div className="p-5 rounded-2xl bg-card/80 border border-green-500/25 backdrop-blur-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <h2 className="font-bold text-sm text-green-400">Analyse par capture</h2>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Envoyez une capture d'écran contenant un ou plusieurs matchs. L'IA détecte automatiquement chaque match et génère une analyse séparée.
              </p>


              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Capture d'écran des cotes</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                {screenshot ? (
                  <div className="relative rounded-xl border border-green-500/30 overflow-hidden bg-secondary/40">
                    <img src={screenshot} alt="Capture des cotes" className="w-full max-h-64 object-contain" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-black/70 text-white text-[10px] font-semibold backdrop-blur-sm"
                    >
                      Remplacer
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 rounded-xl border-2 border-dashed border-green-500/40 bg-green-500/5 hover:bg-green-500/10 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <Upload className="w-6 h-6 text-green-400" />
                    <span className="text-xs font-semibold text-green-400">Uploader la capture des cotes</span>
                    <span className="text-[10px] text-muted-foreground">PNG, JPG, WEBP</span>
                  </button>
                )}
              </div>

              {error && <p className="text-destructive text-xs text-center font-medium">{error}</p>}

              <Button disabled={analyzing} className="w-full h-12 text-sm bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-green-500/20" onClick={handleStartAnalysis}>
                {analyzing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyse en cours...</>) : (<><Sparkles className="w-4 h-4 mr-2" /> Lancer l'analyse IA</>)}
              </Button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground px-4">
              🤖 L'IA lit automatiquement les cotes 1X2 depuis votre capture d'écran.
            </p>
          </div>
        )}

        {/* Results */}
        {view === "results" && results.length > 0 && (
          <VirtuelResults
            results={results}
            onBack={() => { setView("predict"); setResults([]); }}
            onNewMatch={() => { setView("leagues"); setSelectedLeague(null); setScreenshot(null); setResults([]); }}
          />
        )}
        </div>
      </div>
      <div className="h-20" />
      <BottomNav />
    </div>
  );
};

export default Virtuel;
