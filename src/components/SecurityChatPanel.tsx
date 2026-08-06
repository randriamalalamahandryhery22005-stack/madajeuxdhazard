import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  pending?: boolean;
};

const sortByDate = (list: Msg[]) =>
  [...list].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));

/** Chat privé de sécurité entre l'administrateur et le titulaire du compte. */
export default function SecurityChatPanel({
  conversationId,
  meId,
  height = "18rem",
}: {
  conversationId: string;
  meId: string;
  height?: string;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const aliveRef = useRef(true);

  const scrollToEnd = useCallback((behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior, block: "end" }), 40);
  }, []);

  /** Recharge l'historique et fusionne avec les messages optimistes en attente. */
  const load = useCallback(
    async (initial = false) => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,content,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(300);
      if (!aliveRef.current) return;
      if (error) {
        if (initial) setLoading(false);
        return;
      }
      const rows = (data || []) as Msg[];
      setMsgs((prev) => {
        const stillPending = prev.filter(
          (m) => m.pending && !rows.some((r) => r.sender_id === m.sender_id && r.content === m.content),
        );
        return sortByDate([...rows, ...stillPending]);
      });
      if (initial) {
        setLoading(false);
        scrollToEnd("auto");
      }
    },
    [conversationId, scrollToEnd],
  );

  useEffect(() => {
    aliveRef.current = true;
    setLoading(true);
    setMsgs([]);
    void load(true);

    const ch = supabase
      .channel(`sec-chat-${conversationId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as Msg;
          setMsgs((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            // Remplace l'éventuel message optimiste correspondant.
            const withoutPending = prev.filter(
              (m) => !(m.pending && m.sender_id === row.sender_id && m.content === row.content),
            );
            return sortByDate([...withoutPending, row]);
          });
          scrollToEnd();
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const old = payload.old as { id?: string };
          if (!old?.id) return;
          setMsgs((prev) => prev.filter((m) => m.id !== old.id));
        },
      )
      .subscribe((status) => {
        // Resynchronise après une reconnexion pour ne perdre aucun message.
        if (status === "SUBSCRIBED") void load();
      });

    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);

    return () => {
      aliveRef.current = false;
      window.removeEventListener("focus", onFocus);

      try {
        supabase.removeChannel(ch);
      } catch {
        /* noop */
      }
    };
  }, [conversationId, load, scrollToEnd]);

  const send = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
    const optimistic: Msg = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: meId,
      content: value,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMsgs((prev) => sortByDate([...prev, optimistic]));
    setText("");
    scrollToEnd();

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: meId, content: value })
      .select("id,conversation_id,sender_id,content,created_at")
      .maybeSingle();

    if (!aliveRef.current) return;
    setSending(false);

    if (error) {
      setMsgs((prev) => prev.filter((m) => m.id !== tempId));
      setText(value);
      toast.error("Message non envoyé", { description: error.message });
      return;
    }

    if (data) {
      const row = data as Msg;
      setMsgs((prev) =>
        prev.some((m) => m.id === row.id)
          ? prev.filter((m) => m.id !== tempId)
          : sortByDate([...prev.filter((m) => m.id !== tempId), row]),
      );
    }
    scrollToEnd();
  };


  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: height }}>
        {loading ? (
          <p className="text-center text-sm text-slate-400 py-6">Chargement...</p>
        ) : msgs.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">Aucun message. Écrivez pour démarrer l'échange.</p>
        ) : (
          msgs.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${mine ? "bg-emerald-600 text-white" : "bg-white/10 text-slate-100"}`}>
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{new Date(m.created_at).toLocaleString()}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-2 p-2 border-t border-white/10">
        <textarea
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Écrire un message..."
          className="flex-1 resize-none rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="w-10 h-10 rounded-xl bg-emerald-600 hover:brightness-110 disabled:opacity-40 flex items-center justify-center text-white"
          aria-label="Envoyer"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
