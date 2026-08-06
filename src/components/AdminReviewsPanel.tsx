import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertTriangle, Check, Clock, Loader2, RefreshCw, ShieldCheck, UserRound, XCircle,
} from "lucide-react";
import { openUserProfile } from "@/lib/profileViewer";
import { AccountReview, REVIEW_STEPS, decideReview, signIdPhoto } from "@/lib/accountVerification";

type Row = AccountReview & {
  profile?: {
    user_id: string; full_name: string | null; name: string | null; email: string | null;
    birth_date: string | null; gender: string | null; phone: string | null;
    country_code: string | null; region: string | null; status: string | null; avatar_url: string | null;
  } | null;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "En examen", cls: "bg-amber-500/15 border-amber-500/30 text-amber-400" },
  approved: { label: "Approuvé", cls: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
  rejected: { label: "Refusé", cls: "bg-destructive/15 border-destructive/30 text-destructive" },
  draft: { label: "Brouillon", cls: "bg-secondary/40 border-border/40 text-muted-foreground" },
};

/** Administration des demandes d'examen des comptes restreints. */
export default function AdminReviewsPanel() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [open, setOpen] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Record<string, string | null>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [restricted, setRestricted] = useState<
    { user_id: string; full_name: string | null; name: string | null; email: string | null; avatar_url: string | null }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("account_reviews")
      .select("*")
      .order("submitted_at", { ascending: false, nullsFirst: false });
    const list = (data || []) as unknown as Row[];
    const ids = list.map((r) => r.user_id);
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,full_name,name,email,birth_date,gender,phone,country_code,region,status,avatar_url")
        .in("user_id", ids);
      const map = new Map((profs || []).map((p) => [p.user_id, p]));
      for (const r of list) r.profile = (map.get(r.user_id) as Row["profile"]) ?? null;
    }
    setRows(list);

    // Comptes restreints qui n'ont encore transmis aucun dossier d'examen.
    const { data: blocked } = await supabase
      .from("profiles")
      .select("user_id,full_name,name,email,avatar_url")
      .eq("status", "restricted");
    const withFile = new Set(list.filter((r) => r.status === "pending" || r.status === "approved").map((r) => r.user_id));
    setRestricted((blocked || []).filter((p) => !withFile.has(p.user_id)));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("admin-account-reviews")
      .on("postgres_changes", { event: "*", schema: "public", table: "account_reviews" }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const toggle = async (r: Row) => {
    const next = open === r.id ? null : r.id;
    setOpen(next);
    setReason("");
    if (next && !photo[r.id]) setPhoto((prev) => ({ ...prev, [r.id]: null }));
    if (next && r.id_photo_path) {
      const url = await signIdPhoto(r.id_photo_path);
      setPhoto((prev) => ({ ...prev, [r.id]: url }));
    }
  };

  const decide = async (r: Row, approve: boolean) => {
    if (!user?.id) return;
    if (!approve && !reason.trim()) { toast.error("Le motif du refus est obligatoire"); return; }
    setBusy(r.id);
    await decideReview({
      userId: r.user_id,
      adminId: user.id,
      approve,
      reason: reason.trim(),
      displayName: r.profile?.full_name || r.profile?.name || "Utilisateur",
    });
    setBusy(null);
    setOpen(null);
    setReason("");
    toast.success(approve ? "Demande approuvée" : "Demande refusée");
    void load();
  };

  const visible = rows.filter((r) => (filter === "pending" ? r.status === "pending" : true));

  return (
    <div className="space-y-4">
      <div className="admin-card rounded-2xl p-4 flex items-center gap-3">
        <div className="admin-icon-badge"><ShieldCheck className="w-5 h-5" /></div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold">Examens des comptes restreints</h2>
          <p className="text-[11px] text-muted-foreground">
            {rows.filter((r) => r.status === "pending").length} demande(s) en attente · {rows.length} au total
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setFilter(filter === "pending" ? "all" : "pending")}>
          {filter === "pending" ? "Tout voir" : "En attente"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void load()} aria-label="Rafraîchir">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {!loading && restricted.length > 0 && (
        <div className="admin-card rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Comptes restreints en attente de dossier ({restricted.length})
          </p>
          <div className="space-y-1.5">
            {restricted.map((p) => (
              <div key={p.user_id} className="flex items-center gap-3 rounded-xl bg-secondary/25 border border-border/30 p-2">
                <button
                  type="button"
                  onClick={() => openUserProfile(p.user_id)}
                  title="Voir le profil"
                  className="w-8 h-8 rounded-lg overflow-hidden bg-secondary/50 flex items-center justify-center shrink-0"
                >
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <UserRound className="w-4 h-4 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate">{p.full_name || p.name || "Utilisateur"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.email || "—"}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => openUserProfile(p.user_id)}>
                  Profil
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="admin-card rounded-2xl p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      ) : visible.length === 0 ? (
        <div className="admin-card rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Aucune demande {filter === "pending" ? "en attente" : "enregistrée"}.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.draft;
            const info = (r.personal_info ?? {}) as Record<string, string>;
            const name = r.profile?.full_name || r.profile?.name || "Utilisateur";
            return (
              <div key={r.id} className="admin-card rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => void toggle(r)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/25 transition-colors"
                >
                  <span
                    role="button"
                    tabIndex={0}
                    title="Voir le profil"
                    onClick={(e) => { e.stopPropagation(); openUserProfile(r.user_id); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); openUserProfile(r.user_id); } }}
                    className="w-9 h-9 rounded-xl overflow-hidden bg-secondary/50 flex items-center justify-center shrink-0"
                  >
                    {r.profile?.avatar_url
                      ? <img src={r.profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                      : <UserRound className="w-4 h-4 text-muted-foreground" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.profile?.email || "—"}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${meta.cls}`}>{meta.label}</span>
                </button>

                {open === r.id && (
                  <div className="border-t border-border/30 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {[
                        ["Nom complet", r.profile?.full_name],
                        ["E-mail", r.profile?.email],
                        ["Naissance", r.profile?.birth_date],
                        ["Sexe", r.profile?.gender],
                        ["Téléphone / compte", r.profile?.phone],
                        ["Pays", r.profile?.country_code],
                        ["Région", r.profile?.region],
                        ["Statut du compte", r.profile?.status],
                        ["N° pièce d'identité", info.idNumber],
                        ["Adresse", info.address],
                        ["Précisions", info.notes],
                        ["Envoyée le", r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="admin-stat">
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
                          <p className="font-medium break-words">{value || "—"}</p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Étapes de vérification</p>
                      <ol className="space-y-1">
                        {REVIEW_STEPS.map((s) => {
                          const done = r.status === "approved" || r.status === "pending" || r.step > s.n;
                          return (
                            <li key={s.n} className="flex items-center gap-2 text-[11px]">
                              <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold ${
                                done ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary/50 text-muted-foreground"
                              }`}>
                                {done ? <Check className="w-3 h-3" /> : s.n}
                              </span>
                              <span>{s.title}</span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Photo d'identité</p>
                      {r.id_photo_path ? (
                        photo[r.id] ? (
                          <img src={photo[r.id] as string} alt="Pièce d'identité" className="w-full max-h-72 object-contain rounded-xl border border-border/40 bg-black/20" />
                        ) : (
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…</div>
                        )
                      ) : (
                        <p className="text-[11px] text-destructive flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Aucun document transmis</p>
                      )}
                    </div>

                    {r.status === "rejected" && r.reject_reason && (
                      <p className="text-[11px] text-destructive">Motif précédent : {r.reject_reason}</p>
                    )}

                    <div className="space-y-2">
                      <Input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Motif du refus (obligatoire pour refuser)"
                        maxLength={300}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={busy === r.id || r.status === "approved"}
                          onClick={() => void decide(r, true)}
                        >
                          {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          disabled={busy === r.id}
                          onClick={() => void decide(r, false)}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Refuser
                        </Button>
                      </div>
                      {r.status === "pending" && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Les informations de l'utilisateur sont verrouillées pendant l'examen.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
