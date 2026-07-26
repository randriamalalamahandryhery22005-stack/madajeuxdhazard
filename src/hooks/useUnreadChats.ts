import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Counts the number of unread messages in the global "Chats Up" room
 * (global_chat_messages) for the current user.
 * A message is "unread" when the user has no row in chat_message_reads for it.
 * Live-updates via realtime on both tables.
 */
export function useUnreadChats(userId: string | null) {
  const [count, setCount] = useState(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }
    let alive = true;

    const compute = async () => {
      const [{ data: msgs }, { data: reads }] = await Promise.all([
        supabase
          .from("global_chat_messages")
          .select("id,user_id")
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("chat_message_reads")
          .select("message_id")
          .eq("user_id", userId)
          .limit(1000),
      ]);
      if (!alive) return;
      const readSet = new Set((reads || []).map((r: any) => r.message_id));
      const unread = (msgs || []).filter((m: any) => !readSet.has(m.id)).length;
      setCount(unread);
    };

    const scheduleCompute = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(compute, 250);
    };

    compute();

    const channel = supabase
      .channel(`unread-chats-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat_messages" },
        scheduleCompute
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "global_chat_messages" },
        scheduleCompute
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_message_reads", filter: `user_id=eq.${userId}` },
        scheduleCompute
      )
      .subscribe();

    return () => {
      alive = false;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [userId]);

  return count;
}
