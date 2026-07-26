/**
 * Local storage of previously-used accounts on this device.
 * Facebook-style: we display avatar + name + masked identifier
 * so users can pick their account and just re-enter the password.
 * No password is ever stored.
 */

import { supabase } from "@/integrations/supabase/client";

export type SavedAccount = {
  userId: string;
  displayName: string;
  identifier: string; // email or phone
  method: "email" | "phone";
  avatarUrl: string | null;
  lastLoginAt: number;
};

const KEY = "jh.savedAccounts.v1";
const MAX = 6;

const read = (): SavedAccount[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (list: SavedAccount[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore */
  }
};

export const getSavedAccounts = (): SavedAccount[] =>
  read().sort((a, b) => b.lastLoginAt - a.lastLoginAt);

export const upsertSavedAccount = (acc: Omit<SavedAccount, "lastLoginAt">) => {
  const list = read().filter((a) => a.userId !== acc.userId);
  list.unshift({ ...acc, lastLoginAt: Date.now() });
  write(list);
};

export const removeSavedAccount = (userId: string) => {
  write(read().filter((a) => a.userId !== userId));
};

/** Fetch profile after auth and persist the account locally. */
export const rememberCurrentAccount = async (
  userId: string,
  fallback: { identifier: string; method: "email" | "phone"; displayName?: string }
) => {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, name, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();
    upsertSavedAccount({
      userId,
      displayName:
        (data?.full_name as string) ||
        (data?.name as string) ||
        fallback.displayName ||
        fallback.identifier,
      identifier: fallback.identifier,
      method: fallback.method,
      avatarUrl: (data?.avatar_url as string) ?? null,
    });
  } catch {
    upsertSavedAccount({
      userId,
      displayName: fallback.displayName || fallback.identifier,
      identifier: fallback.identifier,
      method: fallback.method,
      avatarUrl: null,
    });
  }
};

export const maskIdentifier = (id: string, method: "email" | "phone") => {
  if (method === "email") {
    const [user, domain] = id.split("@");
    if (!domain) return id;
    const shown = user.slice(0, Math.min(2, user.length));
    return `${shown}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`;
  }
  const digits = id.replace(/\D/g, "");
  if (digits.length < 4) return id;
  const tail = digits.slice(-2);
  return `${id.startsWith("+") ? "+" : ""}${digits.slice(0, 3)} •• •• ${tail}`;
};

export const initialsFrom = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
};