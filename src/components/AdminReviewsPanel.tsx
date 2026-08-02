import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { approveReview, listReviews, rejectReview, type ReviewRequest } from "@/lib/accountReview";
import { Check, Loader2, ShieldCheck, X, ExternalLink } from "lucide-react";

type Prof = { user_id: string; full_name: string | null; name: string | null; email: string | null; avatar_url: string | null };

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée",
};

/** Console d'administration des demandes d'examen des comptes restreints. */
export default function AdminReviewsPanel() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ReviewRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Prof>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const load = useCallback(async () => {
    const list = await listReviews();
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id,full_name,name,email,avatar_url")
        .in("user_id", ids);
      const map: Record<string, Prof> = {};
      ((data || []) as Prof[]).forEach((p) => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`admin-reviews-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reward_requests" }, () => void load())
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch { /* noop */ } };
  }, [load]);

  const doApprove = async (r: ReviewRequest) => {
    if (!user) return;
    setBusy(r.id);
    await approveReview(r, user.id);
    toast.success("Demande approuvée");
    await load();
    setBusy(null);
  };

  const doReject = async (r: ReviewRequest) => {
    if (!user) return;
    const motif = (reason[r.id] || "").trim();
    if (!motif) { toast.error("Le motif de refus est obligatoire"); return; }
    setBusy(r.id);
    await rejectReview(r, user.id, motif);
    toast.success("Demande refusée");
    await load();
    setBusy(null);
  };

  const visible = rows.filter((r) => (filter === "pending" ? r.status === "pending" : true));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Examens de comptes ({rows.filter((r) => r.status === "pending").length} en attente)
        </h2>
        <button
          onClick={() => setFilter((f) => (f === "pending" ? "all" : "pending"))}
          className="text-xs px-3 py-1.5 rounded-lg border border-border"
        >
          {filter === "pending" ? "Voir tout" : "En attente"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucune demande.</p>
      ) : (
        visible.map((r) => {
          const p = profiles[r.user_id];
          const d = r.payload;
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{p?.full_name || p?.name || d?.fullName || "Compte"}</p>
                  <p className="text-xs text-muted-foreground truncate">{p?.email}</p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-lg border border-border uppercase tracking-wide">
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Field label="Naissance" value={d?.birthDate} />
                <Field label="Sexe" value={d?.gender} />
                <Field label="Téléphone" value={d?.phone} />
                <Field label="Pays" value={d?.country} />
                <Field label="Localisation" value={d?.location} />
                <Field label="Envoyée le" value={new Date(r.created_at).toLocaleString()} />
              </div>

              {d?.declaration && (
                <p className="text-xs text-muted-foreground italic">« {d.declaration} »</p>
              )}

              {d?.idPhotoUrl && (
                <a href={d.idPhotoUrl} target="_blank" rel="noreferrer" className="block">
                  <img src={d.idPhotoUrl} alt="Pièce d'identité fournie" className="w-full max-h-56 object-contain rounded-xl border border-border" />
                  <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-1">
                    <ExternalLink className="w-3 h-3" /> Ouvrir en grand
                  </span>
                </a>
              )}

              <ol className="text-[11px] text-muted-foreground space-y-0.5 list-decimal pl-4">
                <li>Profil complet {d?.fullName ? "✅" : "—"}</li>
                <li>Photo d'identité {d?.idPhotoUrl ? "✅" : "—"}</li>
                <li>Informations personnelles {d?.phone ? "✅" : "—"}</li>
                <li>Confirmation utilisateur {d?.confirmedAt ? "✅" : "—"}</li>
                <li>Validation définitive ✅</li>
              </ol>

              {r.status === "pending" ? (
                <div className="space-y-2">
                  <input
                    value={reason[r.id] || ""}
                    onChange={(e) => setReason((s) => ({ ...s, [r.id]: e.target.value }))}
                    placeholder="Motif obligatoire en cas de refus"
                    className="w-full h-10 rounded-xl bg-muted/40 border border-border px-3 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => void doApprove(r)}
                      disabled={busy === r.id}
                      className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Approuver
                    </button>
                    <button
                      onClick={() => void doReject(r)}
                      disabled={busy === r.id}
                      className="flex-1 h-10 rounded-xl bg-rose-600 text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Refuser
                    </button>
                  </div>
                </div>
              ) : (
                r.admin_response && <p className="text-xs text-muted-foreground">Réponse : {r.admin_response}</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold truncate">{value || "—"}</p>
    </div>
  );
}
