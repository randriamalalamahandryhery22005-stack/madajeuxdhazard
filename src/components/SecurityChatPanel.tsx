import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send } from "lucide-react";

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
};

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

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,content,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!alive) return;
      setMsgs((data || []) as Msg[]);
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "auto" }), 30);
    };
    load();
    const ch = supabase
      .channel(`sec-chat-${conversationId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as Msg;
          setMsgs((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
        }
      )
      .subscribe();
    return () => { alive = false; try { supabase.removeChannel(ch); } catch { /* noop */ } };
  }, [conversationId]);

  const send = async () => {
    const value = text.trim();
    if (!value) return;
    setSending(true);
    await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: meId, content: value });
    setText("");
    setSending(false);
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
