import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  getMyReview,
  missingProfileFields,
  submitReview,
  uploadIdPhoto,
  type ProfileLike,
  type ReviewRequest,
} from "@/lib/accountReview";
import { ShieldCheck, Camera, Check, Loader2, Lock, IdCard, UserRound, FileCheck2 } from "lucide-react";

const STEPS = [
  { n: 1, label: "Profil complet", icon: UserRound },
  { n: 2, label: "Photo d'identité", icon: Camera },
  { n: 3, label: "Informations", icon: IdCard },
  { n: 4, label: "Confirmation", icon: FileCheck2 },
  { n: 5, label: "Validation", icon: ShieldCheck },
];

/** Assistant de vérification de compte en cinq étapes. */
export default function AccountReviewWizard({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileLike | null>(null);
  const [review, setReview] = useState<ReviewRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [declaration, setDeclaration] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id,full_name,name,birth_date,gender,phone,country_code,avatar_url,location,status")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile((data as ProfileLike) ?? null);
    setReview(await getMyReview(user.id));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const missing = useMemo(() => missingProfileFields(profile), [profile]);
  const pending = review?.status === "pending";

  const pickPhoto = (f: File | null) => {
    setPhoto(f);
    setPhotoPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    if (!user || !photo) return;
    setSaving(true);
    try {
      const url = await uploadIdPhoto(user.id, photo);
      if (!url) throw new Error("upload");
      const res = await submitReview(user.id, {
        fullName: profile?.full_name || profile?.name || "",
        birthDate: profile?.birth_date || "",
        gender: profile?.gender || "",
        phone: profile?.phone || "",
        country: profile?.country_code || "",
        location: (profile as { location?: string | null })?.location || "",
        idPhotoUrl: url,
        declaration: declaration.trim(),
        confirmedAt: new Date().toISOString(),
      });
      if (!res.ok) throw new Error("insert");
      toast.success("Demande envoyée à l'administrateur");
      await load();
      onDone?.();
    } catch {
      toast.error("Envoi impossible, réessayez");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (pending) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 space-y-2 text-center">
        <Lock className="w-8 h-8 mx-auto text-amber-400" />
        <h3 className="font-bold">Demande en cours d'examen</h3>
        <p className="text-sm text-muted-foreground">
          Vos informations sont verrouillées jusqu'à la décision de l'administrateur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {review?.status === "rejected" && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm">
          <p className="font-bold text-rose-400">Demande refusée</p>
          <p className="text-muted-foreground">Motif : {review.admin_response || "non précisé"}</p>
          <p className="text-muted-foreground mt-1">Corrigez les éléments puis soumettez une nouvelle demande.</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-1">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
                  done
                    ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-400"
                    : active
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "bg-muted/40 border-border text-muted-foreground"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-[9px] text-center leading-tight text-muted-foreground">{s.label}</span>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
        {step === 1 && (
          <>
            <h3 className="font-bold text-sm">1. Complétez toutes les informations du profil</h3>
            {missing.length === 0 ? (
              <p className="text-sm text-emerald-400">Toutes les informations obligatoires sont présentes.</p>
            ) : (
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
                {missing.map((m) => (
                  <li key={m}>{m} manquant</li>
                ))}
              </ul>
            )}
            <button
              onClick={() => void load()}
              className="text-xs underline text-muted-foreground"
            >
              Actualiser après modification du profil
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="font-bold text-sm">2. Photo d'identité nette et lisible</h3>
            <label className="flex flex-col items-center justify-center gap-2 h-40 rounded-xl border border-dashed border-border cursor-pointer overflow-hidden">
              {photoPreview ? (
                <img src={photoPreview} alt="Aperçu de la pièce d'identité" className="w-full h-full object-contain" />
              ) : (
                <>
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Sélectionner une photo</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickPhoto(e.target.files?.[0] || null)}
              />
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="font-bold text-sm">3. Informations personnelles</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Info label="Nom complet" value={profile?.full_name || profile?.name} />
              <Info label="Naissance" value={profile?.birth_date} />
              <Info label="Sexe" value={profile?.gender} />
              <Info label="Téléphone" value={profile?.phone} />
              <Info label="Pays" value={profile?.country_code} />
            </div>
            <textarea
              value={declaration}
              onChange={(e) => setDeclaration(e.target.value)}
              rows={3}
              placeholder="Précisions à l'attention de l'administrateur (facultatif)"
              className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2 text-sm"
            />
          </>
        )}

        {step === 4 && (
          <>
            <h3 className="font-bold text-sm">4. Confirmation</h3>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1"
              />
              Je certifie que les informations et la photo fournies sont exactes et m'appartiennent.
            </label>
          </>
        )}

        {step === 5 && (
          <>
            <h3 className="font-bold text-sm">5. Validation définitive</h3>
            <p className="text-sm text-muted-foreground">
              Après envoi, vos informations seront verrouillées jusqu'à la décision de l'administrateur.
            </p>
            <button
              onClick={() => void submit()}
              disabled={saving}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Envoyer la demande d'examen
            </button>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold disabled:opacity-40"
        >
          Précédent
        </button>
        <button
          onClick={() => setStep((s) => Math.min(5, s + 1))}
          disabled={
            step === 5 ||
            (step === 1 && missing.length > 0) ||
            (step === 2 && !photo) ||
            (step === 4 && !accepted)
          }
          className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold truncate">{value || "—"}</p>
    </div>
  );
}
