import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, RotateCcw, History, Loader2 } from "lucide-react";

interface ConfigRow {
  id: string;
  version: number;
  prompt: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

const SUGGESTIONS = [
  "Ajoute une bannière dorée 'Promo weekend -50%' dismissible sur l'accueil",
  "Change la couleur primaire en bleu électrique (220 90% 55%) et le radius à 1rem",
  "Ajoute une section 'Nos avantages' avec 4 cartes : Rapide, Sécurisé, Précis, Premium",
  "Met en avant les jeux Aviator et JetX et change leurs descriptions",
  "Ajoute un hero d'accueil 'Prédictions IA Premium' avec sous-titre et bouton vers /games",
];

export default function AdminAIConfigPanel() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<ConfigRow[]>([]);

  const loadVersions = async () => {
    const { data } = await supabase
      .from("app_config").select("id,version,prompt,notes,is_active,created_at")
      .order("version", { ascending: false }).limit(20);
    setVersions(data || []);
  };

  useEffect(() => {
    loadVersions();
    const ch = supabase.channel("admin-config")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_config" }, () => loadVersions())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const send = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-config-generator", { body: { prompt } });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Erreur");
      toast.success(`v${data.version} déployée`, { description: data.summary });
      setPrompt("");
    } catch (e: any) {
      toast.error("Échec", { description: e.message });
    } finally { setLoading(false); }
  };

  const rollback = async (id: string, version: number) => {
    const { error } = await supabase.from("app_config").update({ is_active: true }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(`Rollback vers v${version}`);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-gradient-to-br from-primary/10 to-accent/5 border-primary/30">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg">IA — Modifier l'app en temps réel</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Décrivez ce que vous voulez changer (thème, accueil, bannières, jeux). L'IA génère la nouvelle config et tous les utilisateurs la voient instantanément.
        </p>
        <Textarea
          rows={4}
          placeholder="Ex: Ajoute une bannière 'Nouveau jeu disponible' et change le thème en violet..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setPrompt(s)}
              className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/70 text-muted-foreground">
              {s.slice(0, 50)}…
            </button>
          ))}
        </div>
        <Button onClick={send} disabled={loading || !prompt.trim()} variant="premium" className="w-full mt-3">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération…</> : <><Sparkles className="h-4 w-4" /> Déployer la mise à jour</>}
        </Button>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4" />
          <h4 className="font-semibold">Historique des versions</h4>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {versions.map((v) => (
            <div key={v.id} className="flex items-start gap-3 p-3 rounded border">
              <Badge variant={v.is_active ? "default" : "secondary"}>v{v.version}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{v.notes || v.prompt || "—"}</p>
                <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("fr-FR")}</p>
              </div>
              {!v.is_active && (
                <Button size="sm" variant="outline" onClick={() => rollback(v.id, v.version)}>
                  <RotateCcw className="h-3 w-3" /> Rollback
                </Button>
              )}
              {v.is_active && <Badge variant="outline" className="border-green-500/50 text-green-500">Actif</Badge>}
            </div>
          ))}
          {versions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune version</p>}
        </div>
      </Card>
    </div>
  );
}
