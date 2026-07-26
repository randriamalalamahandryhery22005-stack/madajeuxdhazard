import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ensureCoinsRow } from "@/lib/coins";

interface CoinsRow {
  balance: number;
  total_granted: number;
  total_consumed: number;
  plan_type: string;
  plan_expires_at: string | null;
  consumption_rate_per_hour: number;
  last_consumed_at: string | null;
}

// Balances are kept fresh by the server-side cron `consume_user_coins()`.
// The client just reads the latest row and subscribes to realtime updates.
export function useCoins() {
  const { user } = useAuth();
  const [row, setRow] = useState<CoinsRow | null>(null);

  useEffect(() => {
    if (!user) {
      setRow(null);
      return;
    }
    let cancelled = false;

    const load = async () => {
      await ensureCoinsRow(user.id);
      const { data } = await supabase
        .from("user_coins")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && data) setRow(data as any);
    };
    load();

    const channel = supabase
      .channel(`coins-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_coins", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new) setRow(payload.new as any);
        },
      )
      .subscribe();

    // Refresh every minute as a safety net in case realtime hiccups.
    const tick = setInterval(load, 60_000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, [user]);

  const balance = Math.max(0, Math.floor(Number(row?.balance ?? 0)));
  const isPremium = !!row && row.plan_type === "premium" && balance > 0;

  return { row, balance, isPremium };
}

