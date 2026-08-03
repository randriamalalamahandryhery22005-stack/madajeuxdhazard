import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getMyReview, restrictAccount, type ReviewRequest } from "@/lib/accountReview";
import { Loader2, Lock, Unlock, ShieldAlert } from "lucide-react";

type Prof = {
  user_id: string;
  full_name: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string | null;
};

const REVIEW_LABEL: Record<string, string> = {
  pending: "Demande en attente",
  approved: "Examen approuvé",
  rejected: "Demande refusée",
};

/** Gestion des comptes restreints (accès bloqué tant que l'examen n'est pas validé). */
export default function AdminRestrictedPanel() {
  const [rows, setRows] = useState<Prof[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewRequest | null>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id,full_name,name,email,phone,avatar_url,status")
      .in("status", ["restricted", "blocked"])
      .limit(200);
    const list = (data || []) as Prof[];
    setRows(list);
    const entries = await Promise.all(list.map(async (p) => [p.user_id, await getMyReview(p.user_id)] as const));
    setReviews(Object.fromEntries(entries));
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

  const restore = async (p: Prof) => {
    setBusy(p.user_id);
    await supabase.from("profiles").update({ status: "active", is_validated: true }).eq("user_id", p.user_id);
    await supabase.from("notifications").insert({
      title: "Compte réactivé ✅",
      message: "Votre compte a été réactivé par l'administrateur. Vous pouvez utiliser l'application.",
      is_global: false,
      target_user_id: p.user_id,
      created_by: p.user_id,
    });
    toast.success("Compte réactivé");
    await load();
    setBusy(null);
  };

  const restrict = async (p: Prof) => {
    setBusy(p.user_id);
    await restrictAccount(p.user_id, ["Vérification demandée par l'administrateur"]);
    toast.success("Compte restreint");
    await load();
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-400" />
        Comptes restreints ({rows.length})
      </h2>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun compte restreint.</p>
      ) : (
        rows.map((p) => {
          const r = reviews[p.user_id];
          return (
            <div key={p.user_id} className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <Lock className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{p.full_name || p.name || "Compte"}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.email || p.phone || "—"}</p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-lg border border-border uppercase tracking-wide">
                  {p.status === "blocked" ? "Bloqué" : "Restreint"}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Examen : {r ? REVIEW_LABEL[r.status] || r.status : "Aucune demande envoyée"}
                {r?.created_at ? ` · ${new Date(r.created_at).toLocaleString()}` : ""}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => void restore(p)}
                  disabled={busy === p.user_id}
                  className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" /> Réactiver
                </button>
                <button
                  onClick={() => void restrict(p)}
                  disabled={busy === p.user_id}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" /> Maintenir restreint
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
