import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertTriangle, Check, ChevronRight, Clock, Loader2, Lock, ShieldCheck, Upload, XCircle,
} from "lucide-react";
import {
  AccountReview, REVIEW_STEPS, ensureReview, missingFields, signIdPhoto, submitReview, syncRestriction,
} from "@/lib/accountVerification";

/**
 * Parcours de vérification en cinq étapes pour un compte restreint.
 * Une fois la demande envoyée, toutes les informations sont verrouillées.
 */
export default function AccountVerificationFlow() {
  const { user, profile, refreshProfile } = useAuth();
  const [review, setReview] = useState<AccountReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const p = profile as unknown as Parameters<typeof missingFields>[0];
  const missing = useMemo(() => missingFields(p), [p]);
  const locked = review?.status === "pending";

  const load = useCallback(async () => {
    if (!user?.id) return;
    const r = await ensureReview(user.id);
    setReview(r);
    setStep(r?.status === "pending" ? 5 : Math.max(1, r?.step ?? 1));
    const info = (r?.personal_info ?? {}) as Record<string, string>;
    setIdNumber(info.idNumber ?? "");
    setAddress(info.address ?? "");
    setNotes(info.notes ?? "");
    setPhotoUrl(await signIdPhoto(r?.id_photo_path));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!profile) return;
    void syncRestriction(p!).then(({ restricted }) => { if (restricted !== (profile.status === "restricted")) void refreshProfile?.(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.status, profile?.full_name, profile?.birth_date, profile?.region]);

  const uploadPhoto = async (file: File) => {
    if (!user?.id || locked) return;
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/id-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("verification").upload(path, file, { upsert: true });
    if (error) { toast.error("Envoi impossible : " + error.message); setBusy(false); return; }
    await supabase.from("account_reviews").update({ id_photo_path: path, step: 2 }).eq("user_id", user.id);
    setPhotoUrl(await signIdPhoto(path));
    setReview((r) => (r ? { ...r, id_photo_path: path } : r));
    toast.success("Photo d'identité envoyée");
    setBusy(false);
  };

  const saveInfo = async () => {
    if (!user?.id || locked) return;
    setBusy(true);
    await supabase
      .from("account_reviews")
      .update({ personal_info: { idNumber, address, notes } as never, step: 3 })
      .eq("user_id", user.id);
    setBusy(false);
    toast.success("Informations enregistrées");
    setStep(4);
  };

  const finalize = async () => {
    if (!user?.id) return;
    setBusy(true);
    const err = await submitReview(user.id, {
      id_photo_path: review?.id_photo_path ?? null,
      personal_info: { idNumber, address, notes },
    });
    setBusy(false);
    if (err) { toast.error("Envoi impossible : " + err.message); return; }
    toast.success("Demande envoyée à l'administrateur");
    void load();
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-border/40 bg-card/80 p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement de la vérification…
      </section>
    );
  }

  const canGo = (n: number) => {
    if (locked) return false;
    if (n === 2) return missing.length === 0;
    if (n === 3) return !!review?.id_photo_path;
    if (n === 4) return !!idNumber.trim();
    if (n === 5) return !!idNumber.trim();
    return true;
  };

  return (
    <section className="rounded-3xl border border-primary/25 bg-card/80 backdrop-blur-sm p-5 space-y-4">
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold">Vérification du compte</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {review?.status === "pending"
              ? "Demande en cours d'examen — informations verrouillées."
              : review?.status === "approved"
                ? "Compte vérifié. Toutes les fonctionnalités sont accessibles."
                : "Cinq étapes pour lever la restriction de votre compte."}
          </p>
        </div>
        {review?.status === "pending" && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" /> En examen
          </span>
        )}
        {review?.status === "approved" && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-bold flex items-center gap-1">
            <Check className="w-3 h-3" /> Vérifié
          </span>
        )}
      </header>

      {review?.status === "rejected" && review.reject_reason && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs">
          <p className="font-bold text-destructive flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Demande refusée
          </p>
          <p className="text-muted-foreground mt-1">{review.reject_reason}</p>
          <p className="text-muted-foreground mt-1">Corrigez les éléments demandés puis soumettez une nouvelle demande.</p>
        </div>
      )}

      {/* Stepper */}
      <ol className="space-y-1.5">
        {REVIEW_STEPS.map((s) => {
          const done = review?.status === "approved" || (locked && true) || step > s.n;
          const active = step === s.n && !locked;
          return (
            <li key={s.n}>
              <button
                type="button"
                disabled={locked || !canGo(s.n)}
                onClick={() => setStep(s.n)}
                className={`w-full text-left flex items-center gap-3 rounded-2xl border px-3 py-2 transition-colors disabled:opacity-50 ${
                  active ? "border-primary/40 bg-primary/10" : "border-border/40 bg-secondary/25 hover:bg-secondary/40"
                }`}
              >
                <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  done ? "bg-emerald-500/20 text-emerald-500" : "bg-primary/10 text-primary"
                }`}>
                  {done ? <Check className="w-3.5 h-3.5" /> : s.n}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold">{s.title}</span>
                  <span className="block text-[10px] text-muted-foreground leading-snug">{s.desc}</span>
                </span>
                {locked ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            </li>
          );
        })}
      </ol>

      {!locked && review?.status !== "approved" && (
        <div className="rounded-2xl border border-border/40 bg-secondary/20 p-4 space-y-3">
          {step === 1 && (
            missing.length === 0 ? (
              <div className="text-xs text-emerald-500 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Toutes les informations obligatoires sont renseignées.
              </div>
            ) : (
              <div className="text-xs space-y-2">
                <p className="text-destructive font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Informations manquantes
                </p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                  {missing.map((m) => <li key={m}>{m}</li>)}
                </ul>
                <p className="text-muted-foreground">Complétez-les dans la section « Mes informations » ci-dessus.</p>
              </div>
            )
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label className="text-xs">Photo d'identité (nette et lisible)</Label>
              {photoUrl && (
                <img src={photoUrl} alt="Pièce d'identité envoyée" className="w-full max-h-56 object-contain rounded-xl border border-border/40 bg-black/20" />
              )}
              <label className="flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-primary/40 text-xs font-bold text-primary cursor-pointer hover:bg-primary/10">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {photoUrl ? "Remplacer la photo" : "Choisir une photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); }}
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Numéro de la pièce d'identité *</Label>
                <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} maxLength={40} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Adresse complète</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={160} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Précisions (optionnel)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} className="mt-1" />
              </div>
              <Button onClick={saveInfo} disabled={busy || !idNumber.trim()} className="w-full">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Enregistrer
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2 text-xs">
              <p className="font-bold">Confirmez les informations</p>
              <dl className="space-y-1 text-muted-foreground">
                <div className="flex justify-between gap-3"><dt>Nom complet</dt><dd className="text-foreground font-medium">{profile?.full_name || "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Naissance</dt><dd className="text-foreground font-medium">{profile?.birth_date || "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Pays / Région</dt><dd className="text-foreground font-medium">{profile?.country_code || "—"} / {profile?.region || "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Pièce d'identité</dt><dd className="text-foreground font-medium">{idNumber || "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Adresse</dt><dd className="text-foreground font-medium">{address || "—"}</dd></div>
              </dl>
              <Button onClick={() => setStep(5)} className="w-full mt-2">Je confirme, passer à la validation</Button>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                En validant, votre demande est envoyée à l'administrateur et toutes vos informations sont
                verrouillées jusqu'à la fin de l'examen.
              </p>
              <Button
                onClick={finalize}
                disabled={busy || missing.length > 0 || !review?.id_photo_path || !idNumber.trim()}
                className="w-full"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
                Envoyer la demande d'examen
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
