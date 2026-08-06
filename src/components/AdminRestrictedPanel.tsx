import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { openUserProfile } from "@/lib/profileViewer";
import { activateAccount, restrictAccount, missingFields, type ProfileLike } from "@/lib/accountVerification";
import { ShieldCheck, ShieldOff, Search, UserRound, Lock, Unlock } from "lucide-react";

type Row = ProfileLike & {
  user_id: string;
  name: string | null;
  email: string | null;
  status: string;
  created_at?: string;
};

type Filter = "restricted" | "active" | "all";

/** Gestion complète des comptes restreints (consultation, activation, désactivation). */
export default function AdminRestrictedPanel() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("restricted");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id,name,full_name,email,status,is_validated,birth_date,gender,phone,country_code,region,avatar_url,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data || []) as unknown as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`admin-restricted-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void load())
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch { /* noop */ } };
  }, [load]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "restricted" && r.status !== "restricted") return false;
      if (filter === "active" && r.status !== "active") return false;
      if (!term) return true;
      return [r.full_name, r.name, r.email, r.phone].some((v) => (v || "").toLowerCase().includes(term));
    });
  }, [rows, filter, q]);

  const doActivate = async (r: Row) => {
    if (!user) return;
    setBusy(r.user_id);
    await activateAccount(r.user_id, user.id, r.full_name || r.name || "Compte");
    setBusy(null);
    toast.success("Compte activé");
    void load();
  };

  const doRestrict = async (r: Row) => {
    if (!user) return;
    const reason = window.prompt("Motif de la restriction (optionnel) :") || undefined;
    setBusy(r.user_id);
    await restrictAccount(r.user_id, user.id, reason);
    setBusy(null);
    toast.info("Compte restreint");
    void load();
  };

  const counts = useMemo(() => ({
    restricted: rows.filter((r) => r.status === "restricted").length,
    active: rows.filter((r) => r.status === "active").length,
  }), [rows]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldOff className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-bold">Comptes restreints</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {counts.restricted} restreint(s) · {counts.active} actif(s)
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { id: "restricted", label: "Restreints" },
          { id: "active", label: "Actifs" },
          { id: "all", label: "Tous" },
        ] as { id: Filter; label: string }[]).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              filter === f.id
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-card/60 border-border/40 text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un compte (nom, e-mail, téléphone)…"
          className="w-full h-10 pl-9 pr-3 rounded-xl bg-card/60 border border-border/40 text-sm outline-none focus:border-primary/40"
        />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!loading && list.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun compte pour ce filtre.</p>
      )}

      <div className="space-y-2">
        {list.map((r) => {
          const missing = missingFields(r);
          return (
            <div key={r.user_id} className="rounded-xl border border-border/40 bg-card/60 p-3 space-y-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openUserProfile(r.user_id)}
                  title="Voir le profil"
                  className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs font-bold shrink-0"
                >
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (r.full_name || r.name || "?").slice(0, 2).toUpperCase()
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.full_name || r.name || "Sans nom"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                    r.status === "restricted"
                      ? "bg-amber-500/15 border-amber-400/30 text-amber-300"
                      : r.status === "blocked"
                        ? "bg-rose-500/15 border-rose-400/30 text-rose-300"
                        : "bg-emerald-500/15 border-emerald-400/30 text-emerald-300"
                  }`}
                >
                  {r.status}
                </span>
              </div>

              {missing.length > 0 && (
                <p className="text-[11px] text-amber-300/90 flex items-start gap-1">
                  <Lock className="w-3 h-3 mt-0.5 shrink-0" /> Manquant : {missing.join(", ")}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busy === r.user_id}
                  onClick={() => doActivate(r)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold disabled:opacity-50"
                >
                  <Unlock className="w-3.5 h-3.5" /> Activer
                </button>
                <button
                  disabled={busy === r.user_id}
                  onClick={() => doRestrict(r)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold disabled:opacity-50"
                >
                  <ShieldOff className="w-3.5 h-3.5" /> Restreindre
                </button>
                <button
                  onClick={() => openUserProfile(r.user_id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold"
                >
                  <UserRound className="w-3.5 h-3.5" /> Profil
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> L'activation lève immédiatement la restriction et notifie l'utilisateur.
      </p>
    </div>
  );
}
