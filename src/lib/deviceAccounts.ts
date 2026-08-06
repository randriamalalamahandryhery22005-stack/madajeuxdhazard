import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/usePresence";

/** Nombre maximum de comptes pouvant être créés depuis un même appareil. */
export const MAX_ACCOUNTS_PER_DEVICE = 2;

const rpc = (name: string, args?: Record<string, unknown>) =>
  (supabase.rpc as unknown as (n: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
    name,
    args,
  );

/** Vérifie que l'appareil courant n'a pas atteint la limite de comptes. */
export async function canCreateAccountOnDevice(): Promise<{ allowed: boolean; count: number }> {
  const deviceId = getDeviceId();
  const { data, error } = await rpc("device_account_count", { _device_id: deviceId });
  if (error) return { allowed: true, count: 0 };
  const count = Number(data ?? 0);
  return { allowed: count < MAX_ACCOUNTS_PER_DEVICE, count };
}

/** Associe le compte connecté à l'appareil courant. */
export async function registerDeviceAccount(): Promise<void> {
  await rpc("register_device_account", { _device_id: getDeviceId() });
}

/**
 * Détecte l'utilisation d'informations déjà utilisées par un autre compte
 * (nom complet ou numéro). Si c'est le cas, le compte est restreint et une
 * notification invite l'utilisateur à envoyer une demande d'examen.
 */
export async function enforceUniqueIdentity(opts: {
  userId: string;
  fullName?: string | null;
  phone?: string | null;
}): Promise<boolean> {
  const { data, error } = await rpc("profile_info_conflict", {
    _name: opts.fullName ?? "",
    _phone: opts.phone ?? "",
  });
  if (error || data !== true) return false;

  await supabase.from("profiles").update({ status: "restricted", is_validated: false }).eq("user_id", opts.userId);
  await supabase.from("notifications").insert({
    title: "Compte restreint · informations déjà utilisées",
    message:
      "Certaines de vos informations (nom ou numéro de compte) sont déjà utilisées par un autre compte. " +
      "Votre compte est en accès restreint : envoyez une demande d'examen depuis votre profil et attendez la validation de l'administrateur.",
    is_global: false,
    target_user_id: opts.userId,
    created_by: opts.userId,
  });
  return true;
}
