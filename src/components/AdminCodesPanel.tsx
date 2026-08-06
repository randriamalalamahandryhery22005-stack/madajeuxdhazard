import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Key, Plus, Search, Copy, Check, X, Trash2, RefreshCw, Shield,
  Unlock, Lock, ToggleLeft, ToggleRight, Sparkles, Loader2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ActivationCode {
  id: string;
  code_name: string;
  code_value: string;
}

const FRIENDLY_NAMES: Record<string, string> = {
  app_access: "Accès à l'application",
  basic: "Mode Basique",
};

const isFlag = (value: string) => value === "enabled" || value === "disabled";

const label = (name: string) =>
  FRIENDLY_NAMES[name] ||
  name.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

const randomCode = (len = 8) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
};

const AdminCodesPanel = () => {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ActivationCode | null>(null);

  const fetchCodes = async () => {
    const { data, error } = await supabase
      .from("activation_codes")
      .select("id, code_name, code_value")
      .order("code_name", { ascending: true });
    if (error) {
      toast.error("Impossible de charger les codes");
    } else {
      setCodes((data as ActivationCode[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCodes();
    const channel = supabase
      .channel("admin-codes-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "activation_codes" }, () => fetchCodes())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accessCodes = useMemo(
    () => codes.filter((c) => !isFlag(c.code_value)),
    [codes],
  );
  const flagCodes = useMemo(
    () => codes.filter((c) => isFlag(c.code_value)),
    [codes],
  );

  const match = (c: ActivationCode) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.code_name.toLowerCase().includes(q) || (c.code_value || "").toLowerCase().includes(q) || label(c.code_name).toLowerCase().includes(q);
  };

  const visibleAccess = accessCodes.filter(match);
  const visibleFlags = flagCodes.filter(match);

  const saveValue = async (id: string, value: string) => {
    setBusy(id);
    const { error } = await supabase.from("activation_codes").update({ code_value: value }).eq("id", id);
    setBusy(null);
    if (error) { toast.error("Erreur : " + error.message); return false; }
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, code_value: value } : c)));
    toast.success(value ? "Code mis à jour" : "Accès libéré");
    return true;
  };

  const commitEdit = async (id: string) => {
    const ok = await saveValue(id, editValue.trim());
    if (ok) { setEditingId(null); setEditValue(""); }
  };

  const toggleFlag = async (c: ActivationCode) => {
    const next = c.code_value === "enabled" ? "disabled" : "enabled";
    setBusy(c.id);
    const { error } = await supabase.from("activation_codes").update({ code_value: next }).eq("id", c.id);
    setBusy(null);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, code_value: next } : x)));
    toast.success(`${label(c.code_name)} → ${next === "enabled" ? "Activé" : "Désactivé"}`);
  };

  const createCode = async () => {
    const name = newName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) { toast.error("Nom du code requis"); return; }
    if (codes.some((c) => c.code_name === name)) { toast.error("Ce nom existe déjà"); return; }
    setBusy("create");
    const { error } = await supabase.from("activation_codes").insert({ code_name: name, code_value: newValue.trim() });
    setBusy(null);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Code créé");
    setNewName(""); setNewValue(""); setCreating(false);
    fetchCodes();
  };

  const deleteCode = async (c: ActivationCode) => {
    setBusy(c.id);
    const { error } = await supabase.from("activation_codes").delete().eq("id", c.id);
    setBusy(null);
    setConfirmDelete(null);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setCodes((prev) => prev.filter((x) => x.id !== c.id));
    toast.success("Code supprimé");
  };

  const copy = async (c: ActivationCode) => {
    if (!c.code_value) { toast.error("Aucun code à copier"); return; }
    try {
      await navigator.clipboard.writeText(c.code_value);
      setCopied(c.id);
      setTimeout(() => setCopied((v) => (v === c.id ? null : v)), 1600);
      toast.success("Code copié");
    } catch {
      toast.error("Copie impossible");
    }
  };

  const protectedCount = accessCodes.filter((c) => !!c.code_value).length;

  if (loading) {
    return (
      <div className="admin-card p-8 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Chargement des codes…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3" style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
      {/* Hero */}
      <div className="admin-hero p-4 sm:p-5">
        <div className="relative flex items-start gap-3">
          <div className="admin-icon-badge shrink-0"><Key className="w-5 h-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.22em] text-primary font-bold">Configuration</p>
            <h3 className="text-base sm:text-lg font-black leading-tight">Codes d'activation</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Un code vide signifie un accès libre. Les interrupteurs gèrent les fonctionnalités activées.
            </p>
          </div>
        </div>
        <div className="relative mt-3 grid grid-cols-3 gap-2">
          {[
            { l: "Total", v: codes.length },
            { l: "Protégés", v: protectedCount },
            { l: "Options", v: flagCodes.length },
          ].map((s) => (
            <div key={s.l} className="admin-stat">
              <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">{s.l}</p>
              <p className="text-lg font-black leading-none tabular-nums">{s.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un code…"
            className="h-11 pl-9 bg-secondary/60 border-border/40 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="premium" className="h-11 flex-1 sm:flex-none text-xs font-bold" onClick={() => setCreating((v) => !v)}>
            <Plus className="w-4 h-4 mr-1" /> Nouveau code
          </Button>
          <Button variant="ghost" className="h-11 px-3 border border-border/40" onClick={() => { setLoading(true); fetchCodes(); }} aria-label="Rafraîchir">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="admin-card p-4 space-y-2" style={{ animation: "fade-up 0.3s ease both" }}>
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Créer un code</p>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Identifiant (ex : promo_juin)"
            className="h-11 bg-secondary/60 border-border/40 text-sm"
          />
          <div className="flex gap-2">
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Valeur (vide = accès libre)"
              className="h-11 bg-secondary/60 border-border/40 text-sm font-mono"
            />
            <Button variant="ghost" className="h-11 px-3 border border-border/40" onClick={() => setNewValue(randomCode())} aria-label="Générer">
              <Sparkles className="w-4 h-4 text-primary" />
            </Button>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="premium" className="h-11 flex-1 text-xs font-bold" disabled={busy === "create"} onClick={createCode}>
              {busy === "create" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Créer</>}
            </Button>
            <Button variant="ghost" className="h-11 px-4 text-xs" onClick={() => { setCreating(false); setNewName(""); setNewValue(""); }}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Access codes */}
      <div className="flex items-center gap-2 px-1 pt-1">
        <Shield className="w-3.5 h-3.5 text-primary" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Codes d'accès</p>
      </div>

      {visibleAccess.length === 0 && (
        <div className="admin-card p-6 text-center text-[11px] text-muted-foreground">Aucun code d'accès trouvé.</div>
      )}

      {visibleAccess.map((c, i) => {
        const editing = editingId === c.id;
        const locked = !!c.code_value;
        return (
          <div
            key={c.id}
            className="admin-card p-4 space-y-3"
            style={{ animation: "fade-up 0.35s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="admin-icon-badge admin-icon-badge-sm shrink-0">
                  {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{label(c.code_name)}</p>
                  <p className="text-[9px] text-muted-foreground font-mono truncate">{c.code_name}</p>
                </div>
              </div>
              <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 ${locked ? "bg-primary/15 text-primary border border-primary/30" : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"}`}>
                {locked ? "Protégé" : "Libre"}
              </span>
            </div>

            {editing ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitEdit(c.id); if (e.key === "Escape") setEditingId(null); }}
                    className="h-11 bg-secondary/60 border-border/40 text-sm font-mono"
                    placeholder="Vide = accès libre"
                    autoFocus
                  />
                  <Button variant="ghost" className="h-11 px-3 border border-border/40" onClick={() => setEditValue(randomCode())} aria-label="Générer">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="premium" className="h-11 flex-1 text-xs font-bold" disabled={busy === c.id} onClick={() => commitEdit(c.id)}>
                    {busy === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Enregistrer</>}
                  </Button>
                  <Button variant="ghost" className="h-11 px-4 text-xs" onClick={() => { setEditingId(null); setEditValue(""); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-secondary/40 border border-border/25">
                  <code className="text-sm font-mono font-bold text-primary tracking-wider truncate">
                    {c.code_value || <span className="text-emerald-300 italic text-xs font-sans">Accès libre</span>}
                  </code>
                  <button
                    onClick={() => copy(c)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0"
                    aria-label="Copier le code"
                  >
                    {copied === c.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="h-10 flex-1 text-xs font-semibold border border-border/40"
                    onClick={() => { setEditingId(c.id); setEditValue(c.code_value || ""); }}
                  >
                    Modifier
                  </Button>
                  {locked && (
                    <Button
                      variant="ghost"
                      className="h-10 px-3 text-xs font-semibold border border-emerald-500/30 text-emerald-300"
                      disabled={busy === c.id}
                      onClick={() => saveValue(c.id, "")}
                    >
                      <Unlock className="w-3.5 h-3.5 mr-1" /> Libérer
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="h-10 px-3 border border-destructive/30 text-destructive"
                    disabled={busy === c.id}
                    onClick={() => setConfirmDelete(c)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Feature flags */}
      {visibleFlags.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-1 pt-2">
            <ToggleRight className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Interrupteurs</p>
          </div>
          <div className="admin-card divide-y divide-border/30">
            {visibleFlags.map((c) => {
              const on = c.code_value === "enabled";
              return (
                <button
                  key={c.id}
                  onClick={() => toggleFlag(c)}
                  disabled={busy === c.id}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors disabled:opacity-60"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{label(c.code_name)}</p>
                    <p className="text-[9px] text-muted-foreground font-mono truncate">{c.code_name}</p>
                  </div>
                  {busy === c.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                  ) : on ? (
                    <ToggleRight className="w-7 h-7 text-emerald-400 shrink-0" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-muted-foreground shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce code ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete ? `« ${label(confirmDelete.code_name)} » sera définitivement supprimé.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && deleteCode(confirmDelete)}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCodesPanel;
