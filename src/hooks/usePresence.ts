import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEVICE_KEY = "kls_device_id";

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/**
 * Tracks presence only — single-device enforcement has been disabled.
 * Multiple devices can stay signed in on the same account simultaneously.
 */
export function usePresence(userId: string | null) {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const deviceId = getDeviceId();
    let active = true;

    const ping = async () => {
      await supabase.from("online_users").upsert({
        user_id: userId,
        last_ping: new Date().toISOString(),
        device_id: deviceId,
        updated_at: new Date().toISOString(),
      });
    };

    const fetchCount = async () => {
      const cutoff = new Date(Date.now() - 90_000).toISOString();
      const { count } = await supabase
        .from("online_users")
        .select("user_id", { count: "exact", head: true })
        .gte("last_ping", cutoff);
      if (active && count !== null) setOnlineCount(count);
    };

    ping();
    fetchCount();
    const pingInt = setInterval(ping, 20_000);
    const countInt = setInterval(fetchCount, 15_000);

    const ch = supabase
      .channel("presence-watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "online_users" },
        () => fetchCount()
      )
      .subscribe();

    const cleanup = async () => {
      await supabase.from("online_users").delete().eq("user_id", userId);
    };
    window.addEventListener("beforeunload", cleanup);

    return () => {
      active = false;
      clearInterval(pingInt);
      clearInterval(countInt);
      supabase.removeChannel(ch);
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
    };
  }, [userId]);

  return { onlineCount };
}
