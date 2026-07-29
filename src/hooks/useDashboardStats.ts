import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ONLINE_WINDOW_MS = 90_000;
const WIN_WINDOW_MS = 24 * 60 * 60 * 1000;
export const WIN_REASON = "prediction_win";

export function useDashboardStats() {
  const { user } = useAuth();
  const [onlineNow, setOnlineNow] = useState(0);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [winsToday, setWinsToday] = useState(0);
  const [claimingWin, setClaimingWin] = useState(false);

  const fetchAll = useCallback(async () => {
    const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    const winCutoff = new Date(Date.now() - WIN_WINDOW_MS).toISOString();

    const [onlineRes, accountsRes, winsRes] = await Promise.all([
      supabase
        .from("online_users")
        .select("user_id", { count: "exact", head: true })
        .gte("last_ping", onlineCutoff),
      supabase.from("profiles").select("user_id", { count: "exact", head: true }),
      supabase
        .from("user_points")
        .select("id", { count: "exact", head: true })
        .eq("reason", WIN_REASON)
        .gte("created_at", winCutoff),
    ]);

    if (onlineRes.count !== null) setOnlineNow(onlineRes.count);
    if (accountsRes.count !== null) setTotalAccounts(accountsRes.count);
    if (winsRes.count !== null) setWinsToday(winsRes.count);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15_000);
    const suffix = Math.random().toString(36).slice(2, 8);
    const ch = supabase
      .channel(`dashboard-stats-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "online_users" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_points" }, fetchAll)
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(ch);
    };
  }, [fetchAll]);

  const claimWin = useCallback(async () => {
    if (!user || claimingWin) return { ok: false };
    setClaimingWin(true);
    try {
      const { error } = await supabase
        .from("user_points")
        .insert({ user_id: user.id, points: 10, reason: WIN_REASON });
      if (error) throw error;
      await fetchAll();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    } finally {
      setClaimingWin(false);
    }
  }, [user, claimingWin, fetchAll]);

  return { onlineNow, totalAccounts, winsToday, claimWin, claimingWin, refresh: fetchAll };
}
