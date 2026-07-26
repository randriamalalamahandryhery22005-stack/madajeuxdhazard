import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, Save, X, Sparkles, Power, PowerOff, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { CustomPredictionConfig } from "@/lib/customPredictions";

interface Row {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  requires_subscription: boolean;
  subscription_key: string | null;
  config: CustomPredictionConfig;
  created_at: string;
}

const SUB_KEYS = [
  { value: "", label: "Aucun (libre)" },
  { value: "sub_aviator_premium", label: "Aviator Premium" },
  { value: "sub_aviator_pro", label: "Professionnel" },
  { value: "sub_cosmox", label: "CosmoX" },
  { value: "sub_jetx", label: "JetX" },
  { value: "sub_virtuel", label: "Virtuel" },
];

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  icon: "sparkles",
  is_active: true,
  requires_subscription: false,
  subscription_key: "",
  resultCount: 5,
  minCoeff: 1.30,
  maxCoeff: 8.00,
  intervalMinutes: 2,
  reliabilityTarget: 75,
  // distribution as 4 buckets
  d1w: 0.35, d1min: 1.30, d1max: 2.00,
  d2w: 0.40, d2min: 2.00, d2max: 3.50,
  d3w: 0.18, d3min: 3.50, d3max: 6.00,
  d4w: 0.07, d4min: 6.00, d4max: 12.00,
};

type Form = typeof emptyForm;

const buildConfig = (f: Form): CustomPredictionConfig => ({
  resultCount: Number(f.resultCount),
  minCoeff: Number(f.minCoeff),
  maxCoeff: Number(f.maxCoeff),
  intervalMinutes: Number(f.intervalMinutes),
  reliabilityTarget: Number(f.reliabilityTarget),
  distribution: [
    { weight: Number(f.d1w), min: Number(f.d1min), max: Number(f.d1max) },
    { weight: Number(f.d2w), min: Number(f.d2min), max: Number(f.d2max) },
    { weight: Number(f.d3w), min: Number(f.d3min), max: Number(f.d3max) },
    { weight: Number(f.d4w), min: Number(f.d4min), max: Number(f.d4max) },
  ],
});

const fromRow = (r: Row): Form => {
  const d = r.config?.distribution ?? [];
  return {
    ...emptyForm,
    name: r.name,
    slug: r.slug,
    description: r.description ?? "",
    icon: r.icon ?? "sparkles",
    is_active: r.is_active,
    requires_subscription: r.requires_subscription,
    subscription_key: r.subscription_key ?? "",
    resultCount: r.config?.resultCount ?? 5,
    minCoeff: r.config?.minCoeff ?? 1.30,
    maxCoeff: r.config?.maxCoeff ?? 8.00,
    intervalMinutes: r.config?.intervalMinutes ?? 2,
    reliabilityTarget: r.config?.reliabilityTarget ?? 75,
    d1w: d[0]?.weight ?? 0.35, d1min: d[0]?.min ?? 1.30, d1max: d[0]?.max ?? 2.00,
    d2w: d[1]?.weight ?? 0.40, d2min: d[1]?.min ?? 2.00, d2max: d[1]?.max ?? 3.50,
    d3w: d[2]?.weight ?? 0.18, d3min: d[2]?.min ?? 3.50, d3max: d[2]?.max ?? 6.00,
    d4w: d[3]?.weight ?? 0.07, d4min: d[3]?.min ?? 6.00, d4max: d[3]?.max ?? 12.00,
  };
};

const NumField = ({ label, value, onChange, step = "0.01" }: { label: string; value: number | string; onChange: (v: string) => void; step?: string }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} type="number" step={step} className="h-9 text-sm" />
  </div>
);

const AdminCustomPredictions = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("custom_predictions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []).map((d) => ({ ...d, config: (d.config as CustomPredictionConfig) ?? {} })));
  };

  useEffect(() => { void load(); }, []);

  const startNew = () => { setForm(emptyForm); setEditingId("new"); };
  const startEdit = (r: Row) => { setForm(fromRow(r)); setEditingId(r.id); };
  const cancel = () => { setEditingId(null); setForm(emptyForm); };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    const slug = (form.slug.trim() || slugify(form.name)).toLowerCase();
    if (!slug) { toast.error("Slug invalide"); return; }
    if (Number(form.minCoeff) >= Number(form.maxCoeff)) {
      toast.error("Coeff min doit être < max"); return;
    }
    const totalW = Number(form.d1w) + Number(form.d2w) + Number(form.d3w) + Number(form.d4w);
    if (totalW <= 0) { toast.error("La somme des poids doit être > 0"); return; }

    setLoading(true);
    const payload = {
      name: form.name.trim(),
      slug,
      description: form.description.trim() || null,
      icon: form.icon || "sparkles",
      is_active: form.is_active,
      requires_subscription: form.requires_subscription,
      subscription_key: form.requires_subscription && form.subscription_key ? form.subscription_key : null,
      config: buildConfig(form) as never,
    };

    const { error } = editingId === "new"
      ? await supabase.from("custom_predictions").insert([payload])
      : await supabase.from("custom_predictions").update(payload).eq("id", editingId!);

    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId === "new" ? "Prédiction créée" : "Prédiction mise à jour");
    cancel();
    void load();
  };

  const duplicate = async (r: Row) => {
    const base = fromRow(r);
    const newName = `${r.name} (copie)`;
    const payload = {
      name: newName,
      slug: slugify(newName) + "-" + Math.random().toString(36).slice(2, 6),
      description: r.description,
      icon: r.icon ?? "sparkles",
      is_active: false,
      requires_subscription: r.requires_subscription,
      subscription_key: r.subscription_key,
      config: buildConfig(base) as never,
    };
    const { error } = await supabase.from("custom_predictions").insert([payload]);
    if (error) { toast.error(error.message); return; }
    toast.success("Dupliquée");
    void load();
  };

  const resetDistribution = () => setForm({
    ...form,
    d1w: 0.35, d1min: 1.30, d1max: 2.00,
    d2w: 0.40, d2min: 2.00, d2max: 3.50,
    d3w: 0.18, d3min: 3.50, d3max: 6.00,
    d4w: 0.07, d4min: 6.00, d4max: 12.00,
  });

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette prédiction ?")) return;
    const { error } = await supabase.from("custom_predictions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimée");
    void load();
  };

  const toggleActive = async (r: Row) => {
    const { error } = await supabase.from("custom_predictions").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
          <h2 className="text-lg font-bold truncate">Prédictions personnalisées</h2>
        </div>
        {!editingId && (
          <Button size="sm" variant="premium" onClick={startNew}>
            <Plus className="w-4 h-4 mr-1" /> Nouvelle
          </Button>
        )}
      </div>

      {editingId && (
        <div className="rounded-2xl border border-primary/30 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">
              {editingId === "new" ? "Créer une nouvelle prédiction" : "Modifier la prédiction"}
            </h3>
            <button onClick={cancel} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Nom</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} className="h-9" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Slug (URL)</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} className="h-9 font-mono text-xs" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
            <NumField label="Nb résultats" value={form.resultCount} step="1" onChange={(v) => setForm({ ...form, resultCount: Number(v) })} />
            <NumField label="Intervalle (min)" value={form.intervalMinutes} step="1" onChange={(v) => setForm({ ...form, intervalMinutes: Number(v) })} />
            <NumField label="Coeff min" value={form.minCoeff} onChange={(v) => setForm({ ...form, minCoeff: Number(v) })} />
            <NumField label="Coeff max" value={form.maxCoeff} onChange={(v) => setForm({ ...form, maxCoeff: Number(v) })} />
            <NumField label="Fiabilité cible (%)" value={form.reliabilityTarget} step="1" onChange={(v) => setForm({ ...form, reliabilityTarget: Number(v) })} />
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Distribution (poids / min / max)</p>
              <button onClick={resetDistribution} className="text-[10px] text-primary flex items-center gap-1 hover:underline">
                <RotateCcw className="w-3 h-3" /> Réinit.
              </button>
            </div>
            {[
              ["d1w", "d1min", "d1max", "Bas"],
              ["d2w", "d2min", "d2max", "Normal"],
              ["d3w", "d3min", "d3max", "Haut"],
              ["d4w", "d4min", "d4max", "Très haut"],
            ].map(([wKey, minKey, maxKey, label]) => (
              <div key={label} className="grid grid-cols-4 gap-2 items-center">
                <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
                <Input type="number" step="0.01" value={(form as any)[wKey]} onChange={(e) => setForm({ ...form, [wKey]: Number(e.target.value) } as Form)} className="h-8 text-xs" placeholder="poids" />
                <Input type="number" step="0.01" value={(form as any)[minKey]} onChange={(e) => setForm({ ...form, [minKey]: Number(e.target.value) } as Form)} className="h-8 text-xs" placeholder="min" />
                <Input type="number" step="0.01" value={(form as any)[maxKey]} onChange={(e) => setForm({ ...form, [maxKey]: Number(e.target.value) } as Form)} className="h-8 text-xs" placeholder="max" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Actif
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.requires_subscription} onChange={(e) => setForm({ ...form, requires_subscription: e.target.checked })} />
              Abonnement requis
            </label>
            {form.requires_subscription && (
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Type d'abonnement</label>
                <select
                  value={form.subscription_key}
                  onChange={(e) => setForm({ ...form, subscription_key: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {SUB_KEYS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={loading} variant="premium" className="flex-1">
              <Save className="w-4 h-4 mr-1" /> Enregistrer
            </Button>
            <Button onClick={cancel} variant="outline" className="flex-1">Annuler</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rows.length === 0 && !editingId && (
          <p className="text-xs text-muted-foreground text-center py-8">Aucune prédiction personnalisée.</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border/50 bg-card p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${r.is_active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm truncate">{r.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                /{r.slug} · {r.config?.resultCount ?? 5} rés. · {r.requires_subscription ? "🔒 abonn." : "🆓 libre"}
              </p>
            </div>
            <button onClick={() => toggleActive(r)} className="p-2 rounded hover:bg-secondary" title={r.is_active ? "Désactiver" : "Activer"}>
              {r.is_active ? <Power className="w-4 h-4 text-green-400" /> : <PowerOff className="w-4 h-4 text-muted-foreground" />}
            </button>
            <button onClick={() => startEdit(r)} className="p-2 rounded hover:bg-secondary" title="Modifier"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => duplicate(r)} className="p-2 rounded hover:bg-secondary" title="Dupliquer"><Copy className="w-4 h-4" /></button>
            <button onClick={() => remove(r.id)} className="p-2 rounded hover:bg-secondary text-destructive" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCustomPredictions;
