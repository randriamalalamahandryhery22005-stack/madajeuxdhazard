import { supabase } from "@/integrations/supabase/client";

/**
 * Système de vérification des comptes (v0.0.2).
 *
 * Un compte dont le profil est incomplet passe en statut « restreint » et ne
 * peut plus utiliser les fonctionnalités principales tant que l'examen n'est
 * pas validé par l'administrateur.
 *
 * Les demandes sont stockées dans `reward_requests` (table générique de
 * demandes déjà présente) : `requested_game` porte le marqueur + la charge
 * utile JSON de l'examen, `status` porte le cycle de vie.
 */

export const REVIEW_MARK = "account_review::";

export type ReviewPayload = {
  fullName: string;
  birthDate: string;
  gender: string;
  phone: string;
  country: string;
  location: string;
  idPhotoUrl: string;
  declaration: string;
  confirmedAt: string;
};

export type ReviewRequest = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  admin_response: string | null;
  created_at: string;
  resolved_at: string | null;
  payload: ReviewPayload | null;
};

export type ProfileLike = {
  user_id: string;
  full_name?: string | null;
  name?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  phone?: string | null;
  country_code?: string | null;
  avatar_url?: string | null;
  status?: string | null;
};

/** Champs obligatoires d'un profil conforme. */
export const REQUIRED_PROFILE_FIELDS: { key: keyof ProfileLike; label: string }[] = [
  { key: "full_name", label: "Nom complet" },
  { key: "birth_date", label: "Date de naissance" },
  { key: "gender", label: "Sexe" },
  { key: "phone", label: "Téléphone" },
  { key: "country_code", label: "Pays" },
  { key: "avatar_url", label: "Photo de profil" },
];

/** Liste des informations manquantes dans un profil. */
export function missingProfileFields(profile: ProfileLike | null | undefined): string[] {
  if (!profile) return REQUIRED_PROFILE_FIELDS.map((f) => f.label);
  return REQUIRED_PROFILE_FIELDS.filter((f) => {
    const v = profile[f.key];
    return v === null || v === undefined || String(v).trim() === "";
  }).map((f) => f.label);
}

const encodePayload = (p: ReviewPayload) => {
  try {
    return REVIEW_MARK + btoa(unescape(encodeURIComponent(JSON.stringify(p))));
  } catch {
    return REVIEW_MARK + encodeURIComponent(JSON.stringify(p));
  }
};

const decodePayload = (raw: string): ReviewPayload | null => {
  if (!raw?.startsWith(REVIEW_MARK)) return null;
  const body = raw.slice(REVIEW_MARK.length);
  try {
    return JSON.parse(decodeURIComponent(escape(atob(body))));
  } catch {
    try {
      return JSON.parse(decodeURIComponent(body));
    } catch {
      return null;
    }
  }
};

type Row = {
  id: string;
  user_id: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  resolved_at: string | null;
  requested_game: string;
};

const toRequest = (r: Row): ReviewRequest => ({
  id: r.id,
  user_id: r.user_id,
  status: (r.status as ReviewRequest["status"]) || "pending",
  admin_response: r.admin_response,
  created_at: r.created_at,
  resolved_at: r.resolved_at,
  payload: decodePayload(r.requested_game),
});

/** Dernière demande d'examen d'un utilisateur. */
export async function getMyReview(userId: string): Promise<ReviewRequest | null> {
  const { data } = await supabase
    .from("reward_requests")
    .select("id,user_id,status,admin_response,created_at,resolved_at,requested_game")
    .eq("user_id", userId)
    .like("requested_game", `${REVIEW_MARK}%`)
    .order("created_at", { ascending: false })
    .limit(1);
  const row = (data || [])[0] as Row | undefined;
  return row ? toRequest(row) : null;
}

/** Toutes les demandes d'examen (console d'administration). */
export async function listReviews(): Promise<ReviewRequest[]> {
  const { data } = await supabase
    .from("reward_requests")
    .select("id,user_id,status,admin_response,created_at,resolved_at,requested_game")
    .like("requested_game", `${REVIEW_MARK}%`)
    .order("created_at", { ascending: false })
    .limit(200);
  return ((data || []) as Row[]).map(toRequest);
}

/** Téléverse la photo d'identité de l'examen et renvoie son URL publique. */
export async function uploadIdPhoto(userId: string, file: File): Promise<string | null> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `reviews/${userId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

/** Soumet la demande d'examen (étape 5) et verrouille les informations. */
export async function submitReview(userId: string, payload: ReviewPayload) {
  const { error } = await supabase.from("reward_requests").insert({
    user_id: userId,
    requested_game: encodePayload(payload),
    requested_days: 0,
    status: "pending",
  });
  if (error) return { ok: false, error };
  await supabase.from("profiles").update({ status: "restricted", is_validated: false }).eq("user_id", userId);
  await supabase.from("notifications").insert({
    title: "Nouvelle demande d'examen",
    message: `${payload.fullName} a soumis une demande de vérification de compte.`,
    is_global: false,
    target_user_id: userId,
    created_by: userId,
  });
  return { ok: true };
}

/** Passe un compte en statut restreint et notifie l'utilisateur. */
export async function restrictAccount(userId: string, missing: string[]) {
  await supabase.from("profiles").update({ status: "restricted" }).eq("user_id", userId);
  await supabase.from("notifications").insert({
    title: "Compte restreint — vérification requise",
    message: `Informations manquantes : ${missing.join(", ")}. Complétez votre profil puis envoyez une demande d'examen.`,
    is_global: false,
    target_user_id: userId,
    created_by: userId,
  });
}

/** Approuve une demande d'examen. */
export async function approveReview(req: ReviewRequest, adminId: string) {
  await supabase
    .from("reward_requests")
    .update({ status: "approved", admin_response: "Demande approuvée", resolved_at: new Date().toISOString(), resolved_by: adminId })
    .eq("id", req.id);
  await supabase.from("profiles").update({ status: "active", is_validated: true }).eq("user_id", req.user_id);
  await supabase.from("notifications").insert({
    title: "Compte vérifié ✅",
    message: "Votre demande d'examen a été approuvée. Votre compte est de nouveau pleinement actif.",
    is_global: false,
    target_user_id: req.user_id,
    created_by: adminId,
  });
}

/** Refuse une demande d'examen avec un motif obligatoire. */
export async function rejectReview(req: ReviewRequest, adminId: string, reason: string) {
  await supabase
    .from("reward_requests")
    .update({ status: "rejected", admin_response: reason, resolved_at: new Date().toISOString(), resolved_by: adminId })
    .eq("id", req.id);
  await supabase.from("profiles").update({ status: "restricted", is_validated: false }).eq("user_id", req.user_id);
  await supabase.from("notifications").insert({
    title: "Demande d'examen refusée",
    message: `Motif : ${reason}. Corrigez les éléments demandés puis soumettez une nouvelle demande.`,
    is_global: false,
    target_user_id: req.user_id,
    created_by: adminId,
  });
}
