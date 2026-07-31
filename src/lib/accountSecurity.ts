import { supabase } from "@/integrations/supabase/client";

export const PREMIUM_DEVICE_LIMIT = 3;
export const SECURITY_TITLE_PREFIX = "Sécurité Premium ·";

export type DeviceEntry = { deviceId: string; info: string | null; lastAt: string };

/** Appareils distincts utilisés par un compte (via l'historique de connexion). */
export async function listAccountDevices(userId: string): Promise<DeviceEntry[]> {
  const { data } = await supabase
    .from("login_history")
    .select("session_id,device_info,created_at,event_type")
    .eq("user_id", userId)
    .eq("event_type", "login")
    .order("created_at", { ascending: false })
    .limit(400);
  const map = new Map<string, DeviceEntry>();
  for (const row of (data || []) as { session_id: string | null; device_info: string | null; created_at: string }[]) {
    const key = row.session_id || row.device_info || "";
    if (!key) continue;
    if (!map.has(key)) map.set(key, { deviceId: key, info: row.device_info, lastAt: row.created_at });
  }
  return Array.from(map.values());
}

/** Trouve (ou crée) la conversation privée de sécurité entre l'admin et l'utilisateur. */
export async function ensureSecurityConversation(userId: string, displayName: string): Promise<string | null> {
  const title = `${SECURITY_TITLE_PREFIX} ${displayName}`;
  const { data: existing } = await supabase
    .from("conversations")
    .select("id,title")
    .eq("title", title)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ title, is_group: true, created_by: userId })
    .select("id")
    .maybeSingle();
  if (error || !created?.id) return null;
  const conversationId = created.id as string;

  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  const members = [
    { conversation_id: conversationId, user_id: userId, role: "member" },
    ...((admins || []) as { user_id: string }[])
      .filter((a) => a.user_id !== userId)
      .map((a) => ({ conversation_id: conversationId, user_id: a.user_id, role: "admin" })),
  ];
  await supabase.from("conversation_members").insert(members);
  return conversationId;
}

/** Bloque un compte Premium et alerte l'administration. */
export async function blockPremiumAccount(userId: string, displayName: string, deviceCount: number) {
  await supabase.from("profiles").update({ status: "blocked" }).eq("user_id", userId);
  await supabase.from("notifications").insert({
    title: "Compte Premium bloqué (sécurité)",
    message: `${displayName} a été bloqué : ${deviceCount} appareils détectés (limite ${PREMIUM_DEVICE_LIMIT}). Un chat privé de sécurité a été ouvert.`,
    is_global: false,
    target_user_id: userId,
    created_by: userId,
  });
  await ensureSecurityConversation(userId, displayName);
}

/** Réactive un compte bloqué et remet le compteur d'appareils à zéro. */
export async function unblockAccount(userId: string) {
  await supabase.from("profiles").update({ status: "active" }).eq("user_id", userId);
  await supabase.from("login_history").delete().eq("user_id", userId).eq("event_type", "login");
}
