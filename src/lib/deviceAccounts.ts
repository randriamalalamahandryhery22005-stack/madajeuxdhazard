import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/usePresence";

/**
 * Limitation du nombre de comptes créés depuis un même appareil.
 * Deux comptes maximum : au-delà, la création est refusée.
 */
export const MAX_ACCOUNTS_PER_DEVICE = 2;

const LOCAL_KEY = "jh_device_accounts";

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: string[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.from(new Set(list))));
  } catch {
    /* noop */
  }
}

/** Nombre de comptes déjà créés depuis cet appareil (local + serveur). */
export async function countDeviceAccounts(): Promise<number> {
  const ids = new Set(readLocal());
  try {
    const deviceId = getDeviceId();
    const { data } = await supabase
      .from("login_history")
      .select("user_id")
      .eq("session_id", deviceId)
      .eq("event_type", "signup")
      .limit(50);
    for (const row of (data || []) as { user_id: string }[]) ids.add(row.user_id);
  } catch {
    /* hors-ligne : on se base sur le stockage local */
  }
  return ids.size;
}

/** Vrai si un nouveau compte peut encore être créé depuis cet appareil. */
export async function canCreateAccountOnDevice(): Promise<boolean> {
  return (await countDeviceAccounts()) < MAX_ACCOUNTS_PER_DEVICE;
}

/** Enregistre un compte fraîchement créé sur cet appareil. */
export async function registerDeviceAccount(userId: string) {
  writeLocal([...readLocal(), userId]);
  try {
    const deviceId = getDeviceId();
    await supabase.from("login_history").insert({
      user_id: userId,
      event_type: "signup",
      session_id: deviceId,
      device_info: `${navigator.platform || ""} · ${navigator.userAgent.slice(0, 90)}`,
    });
  } catch {
    /* noop */
  }
}
