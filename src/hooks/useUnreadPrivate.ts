import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Compte les messages privés non lus (table `messages`) pour l'utilisateur courant.
 * Un message est non lu lorsqu'il a été envoyé par un autre membre après le
 * `last_read_at` de l'utilisateur dans la conversation.
 */
export function useUnreadPrivate(userId: string | null | undefined) {
  const [total, setTotal] = useState(0);
  const [byConversation, setByConversation] = useState<Record<string, number>>({});
  const debounce = useRef<number | null>(null);

  const compute = useCallback(async () => {
    if (!userId) {
      setTotal(0);
      setByConversation({});
      return;
    }
    const { data: mem } = await supabase
      .from("conversation_members")
      .select("conversation_id,last_read_at")
      .eq("user_id", userId);
    const members = mem || [];
    if (members.length === 0) {
      setTotal(0);
      setByConversation({});
      return;
    }
    const ids = members.map((m) => m.conversation_id);
    const { data: msgs } = await supabase
      .from("messages")
      .select("id,conversation_id,sender_id,created_at")
      .in("conversation_id", ids)
      .neq("sender_id", userId)
      .order("created_at", { ascending: false })
      .limit(300);

    const readAt = new Map(members.map((m) => [m.conversation_id, m.last_read_at]));
    const counts: Record<string, number> = {};
    for (const m of msgs || []) {
      const last = readAt.get(m.conversation_id);
      if (last && new Date(m.created_at) <= new Date(last)) continue;
      counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1;
    }
    setByConversation(counts);
    setTotal(Object.values(counts).reduce((a, b) => a + b, 0));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void compute();
    const schedule = () => {
      if (debounce.current) window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(() => void compute(), 250);
    };
    const ch = supabase
      .channel(`unread-private-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, schedule)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_members", filter: `user_id=eq.${userId}` }, schedule)
      .subscribe();
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
      try { supabase.removeChannel(ch); } catch { /* noop */ }
    };
  }, [userId, compute]);

  return { total, byConversation, refresh: compute };
}

/** Marque une conversation privée comme lue. */
export async function markPrivateConversationRead(conversationId: string, userId: string) {
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}
