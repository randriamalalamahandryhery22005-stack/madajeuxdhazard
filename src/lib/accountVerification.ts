import { supabase } from "@/integrations/supabase/client";

/**
 * Vérification des comptes (v0.0.2).
 *
 * Un compte doit reprendre toutes les informations saisies à la création. S'il
 * manque une information obligatoire, le compte reçoit une notification et
 * passe en statut « restreint » (`restricted`). Il peut alors envoyer une
 * demande d'examen en cinq étapes à l'administration.
 */

export type ReviewStatus = "draft" | "pending" | "approved" | "rejected";

export type AccountReview = {
  id: string;
  user_id: string;
  status: ReviewStatus;
  step: number;
  id_photo_path: string | null;
  personal_info: Record<string, unknown>;
  confirmed: boolean;
  reject_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileLike = {
  user_id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  phone?: string | null;
  country_code?: string | null;
  region?: string | null
  avatar_url?: string | null;
  status?: string | null;
  is_validated?: boolean | null;
};

export const REQUIRED_FIELDS: { key: keyof ProfileLike; label: string }[] = [
  { key: "full_name", label: "Nom complet" },
  { key: "birth_date", label: "Date de naissance" },
  { key: "gender", label: "Sexe" },
  { key: "phone", label: "Numéro de compte / téléphone" },
  { key: "email", label: "Adresse e-mail" },
  { key: "country_code", label: "Pays" },
  { key: "region", label: "Région" },
];

export const REVIEW_STEPS = [
  { n: 1, title: "Informations du profil", desc: "Complétez toutes les informations obligatoires." },
  { n: 2, title: "Photo d'identité", desc: "Envoyez une photo nette et lisible de votre pièce d'identité." },
  { n: 3, title: "Informations personnelles", desc: "Renseignez les informations demandées par l'administration." },
  { n: 4, title: "Confirmation", desc: "Vérifiez et confirmez l'exactitude des informations." },
  { n: 5, title: "Validation définitive", desc: "Envoyez la demande d'examen à l'administrateur." },
] as const;

/** Champs obligatoires manquants sur un profil. */
export function missingFields(profile?: ProfileLike | null): string[] {
  if (!profile) return REQUIRED_FIELDS.map((f) => f.label);
  return REQUIRED_FIELDS.filter((f) => {
    const v = profile[f.key];
    return v === null || v === undefined || String(v).trim() === "";
  }).map((f) => f.label);
}

export const isRestricted = (profile?: ProfileLike | null) => profile?.status === "restricted";

/** Récupère (ou crée) la demande d'examen du compte courant. */
export async function ensureReview(userId: string): Promise<AccountReview | null> {
  const { data } = await supabase
    .from("account_reviews")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data as unknown as AccountReview;
  const { data: created } = await supabase
    .from("account_reviews")
    .insert({ user_id: userId })
    .select("*")
    .maybeSingle();
  return (created as unknown as AccountReview) ?? null;
}

/**
 * Applique la restriction si des informations obligatoires manquent, ou lève la
 * restriction lorsque le dossier est complet et validé.
 */
export async function syncRestriction(profile: ProfileLike): Promise<{ restricted: boolean; missing: string[] }> {
  const missing = missingFields(profile);
  const already = profile.status === "restricted";

  if (missing.length > 0) {
    if (!already) {
      await supabase.from("profiles").update({ status: "restricted" }).eq("user_id", profile.user_id);
      await supabase.from("notifications").insert({
        title: "Vérification du compte requise",
        message:
          `Votre compte est en accès restreint : ${missing.join(", ")} manquant(e)(s). ` +
          "Complétez votre profil puis envoyez une demande d'examen depuis votre profil.",
        is_global: false,
        target_user_id: profile.user_id,
        created_by: profile.user_id,
      });
    }
    return { restricted: true, missing };
  }

  // Profil complet : la restriction est levée automatiquement dès que
  // l'administration a validé le compte (ou qu'il l'était déjà).
  if (already && profile.is_validated) {
    await supabase.from("profiles").update({ status: "active" }).eq("user_id", profile.user_id);
    return { restricted: false, missing: [] };
  }

  return { restricted: already, missing: [] };
}

/** Active un compte (lève la restriction) — réservé à l'administration. */
export async function activateAccount(userId: string, adminId: string, displayName = "Votre compte") {
  await supabase
    .from("profiles")
    .update({ status: "active", is_validated: true })
    .eq("user_id", userId);
  await supabase.from("notifications").insert({
    title: "Compte activé ✅",
    message: `${displayName} : votre compte a été activé par l'administration. Toutes les fonctionnalités sont accessibles.`,
    is_global: false,
    target_user_id: userId,
    created_by: adminId,
  });
}

/** Restreint (désactive) un compte — réservé à l'administration. */
export async function restrictAccount(userId: string, adminId: string, reason?: string) {
  await supabase
    .from("profiles")
    .update({ status: "restricted", is_validated: false })
    .eq("user_id", userId);
  await supabase.from("notifications").insert({
    title: "Compte restreint",
    message: `Votre compte a été placé en accès restreint. ${reason ? `Motif : ${reason}` : "Contactez l'administration depuis le chat privé."}`,
    is_global: false,
    target_user_id: userId,
    created_by: adminId,
  });
}

/** Envoie la demande d'examen (étape 5) : les informations sont verrouillées. */
export async function submitReview(
  userId: string,
  review: { id_photo_path?: string | null; personal_info?: Record<string, unknown> },
) {
  const { error } = await supabase
    .from("account_reviews")
    .update({
      id_photo_path: review.id_photo_path ?? null,
      personal_info: (review.personal_info ?? {}) as never,
      status: "pending",
      step: 5,
      confirmed: true,
      reject_reason: null,
      submitted_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  return error;
}

/** URL signée de la photo d'identité (bucket privé). */
export async function signIdPhoto(path?: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("verification").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Décision de l'administrateur. */
export async function decideReview(opts: {
  userId: string;
  adminId: string;
  approve: boolean;
  reason?: string;
  displayName: string;
}) {
  const { userId, adminId, approve, reason, displayName } = opts;
  await supabase
    .from("account_reviews")
    .update({
      status: approve ? "approved" : "rejected",
      reject_reason: approve ? null : (reason || "Informations incomplètes ou illisibles."),
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      step: approve ? 5 : 1,
      confirmed: approve,
    })
    .eq("user_id", userId);

  await supabase
    .from("profiles")
    .update({ status: approve ? "active" : "restricted", is_validated: approve })
    .eq("user_id", userId);

  await supabase.from("notifications").insert({
    title: approve ? "Compte vérifié ✅" : "Demande d'examen refusée",
    message: approve
      ? `Félicitations ${displayName}, votre compte a été vérifié. Toutes les fonctionnalités sont désormais accessibles.`
      : `Votre demande a été refusée. Motif : ${reason || "informations incomplètes ou illisibles."} ` +
        "Vous pouvez corriger les éléments demandés et soumettre une nouvelle demande.",
    is_global: false,
    target_user_id: userId,
    created_by: adminId,
  });
}
