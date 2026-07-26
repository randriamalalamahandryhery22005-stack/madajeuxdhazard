import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Counts the number of GEN Store publications created after the user's
 * `profiles.gen_store_last_seen_at` timestamp. Live-updates on INSERT.
 * Call `markSeen()` when the user opens the store to reset the badge.
 */
export function useUnreadStore(userId: string | null) {
  const [count, setCount] = useState(0);
  const lastSeenRef = useRef<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const compute = useCallback(async () => {
    if (!userId) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("gen_store_last_seen_at")
      .eq("user_id", userId)
      .maybeSingle();
    const lastSeen = (prof as any)?.gen_store_last_seen_at || null;
    lastSeenRef.current = lastSeen;
    let q = supabase.from("gen_store_items").select("id", { count: "exact", head: true });
    if (lastSeen) q = q.gt("created_at", lastSeen);
    const { count: c } = await q;
    setCount(c || 0);
  }, [userId]);

  const markSeen = useCallback(async () => {
    if (!userId) return;
    const nowIso = new Date().toISOString();
    lastSeenRef.current = nowIso;
    setCount(0);
    await supabase.from("profiles").update({ gen_store_last_seen_at: nowIso } as any).eq("user_id", userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) { setCount(0); return; }
    let alive = true;
    compute();
    const schedule = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => { if (alive) compute(); }, 250);
    };
    const ch = supabase
      .channel(`unread-store-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gen_store_items" }, schedule)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "gen_store_items" }, schedule)
      .subscribe();
    return () => {
      alive = false;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      try { supabase.removeChannel(ch); } catch {}
    };
  }, [userId, compute]);

  return { count, markSeen, refresh: compute };
}
