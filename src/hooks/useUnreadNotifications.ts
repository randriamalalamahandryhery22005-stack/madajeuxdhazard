import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const HIDDEN_KEY = "jh.notifs.hidden.v1";
const READ_KEY = "jh.notifs.read.v1";
const load = (k: string): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(window.localStorage.getItem(k) || "[]")); }
  catch { return new Set(); }
};

/** Unread app notifications for the given user (global + targeted). */
export function useUnreadNotifications(userId: string | null | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) { setCount(0); return; }
    let cancelled = false;

    const refresh = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,is_read,target_user_id,is_global")
        .or(`is_global.eq.true,target_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      const hidden = load(HIDDEN_KEY);
      const readLocal = load(READ_KEY);
      const c = (data || []).filter((n: any) =>
        !hidden.has(n.id) &&
        !readLocal.has(n.id) &&
        !(n.target_user_id === userId && n.is_read)
      ).length;
      setCount(c);
    };

    refresh();
    const ch = supabase
      .channel(`unread-notifs-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => refresh())
      .subscribe();


    const onStorage = (e: StorageEvent) => {
      if (e.key === HIDDEN_KEY || e.key === READ_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

  return count;
}
