import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SecurityChatPanel from "@/components/SecurityChatPanel";
import AccountBadges from "@/components/AccountBadges";
import { openUserProfile } from "@/lib/profileViewer";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Lock, Search, ShieldCheck, UserRound } from "lucide-react";
import { useUnreadPrivate, markPrivateConversationRead } from "@/hooks/useUnreadPrivate";

type Peer = {
  user_id: string;
  name: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type Thread = {
  conversationId: string;
  peer: Peer | null;
  lastMessageAt: string;
};

const label = (p?: Peer | null) => p?.full_name || p?.name || "Membre";
const initials = (n: string) =>
  n.trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";

/**
 * Messages privés — réservés aux échanges administrateur ↔ utilisateur.
 * Un utilisateur ne peut ouvrir une conversation qu'avec un administrateur ;
 * un administrateur peut écrire à n'importe quel membre.
 */
export default function PrivateMessages({
  open,
  onClose,
  meId,
  isAdmin,
  admins,
  premium,
  initialConversationId,
}: {
  open: boolean;
  onClose: () => void;
  meId: string;
  isAdmin: boolean;
  admins: Set<string>;
  premium: Set<string>;
  /** Ouvre directement cette conversation (ex. via une notification). */
  initialConversationId?: string | null;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [candidates, setCandidates] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Thread | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const { byConversation, refresh } = useUnreadPrivate(open ? meId : null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: mine } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", meId);
    const ids = (mine || []).map((m) => m.conversation_id);

    let list: Thread[] = [];
    if (ids.length > 0) {
      const [{ data: convs }, { data: members }] = await Promise.all([
        supabase
          .from("conversations")
          .select("id,last_message_at,is_group")
          .in("id", ids)
          .eq("is_group", false),
        supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id", ids),
      ]);
      const peerIds = new Set<string>();
      const peerByConv = new Map<string, string>();
      for (const m of members || []) {
        if (m.user_id !== meId) {
          peerIds.add(m.user_id);
          peerByConv.set(m.conversation_id, m.user_id);
        }
      }
      const { data: profs } = peerIds.size
        ? await supabase
            .from("public_profiles")
            .select("user_id,name,full_name,avatar_url")
            .in("user_id", [...peerIds])
        : { data: [] as Peer[] };
      const map = new Map((profs || []).map((p) => [p.user_id, p as Peer]));
      list = (convs || []).map((c) => ({
        conversationId: c.id,
        peer: map.get(peerByConv.get(c.id) ?? "") ?? null,
        lastMessageAt: c.last_message_at,
      }));
      list.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
    }
    setThreads(list);

    // Interlocuteurs possibles : tous les membres pour un admin, les admins sinon.
    let allowed: string[] | null = null;
    if (!isAdmin) allowed = [...admins].filter((id) => id !== meId);
    const q = supabase.from("public_profiles").select("user_id,name,full_name,avatar_url").limit(300);
    const { data: people } = allowed ? await q.in("user_id", allowed.length ? allowed : ["-"]) : await q;
    setCandidates(((people || []) as Peer[]).filter((p) => p.user_id !== meId));
    setLoading(false);
  }, [meId, isAdmin, admins]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Ouverture directe d'une conversation demandée par une notification.
  useEffect(() => {
    if (!open || !initialConversationId) return;
    const found = threads.find((t) => t.conversationId === initialConversationId);
    if (found) setActive(found);
    else setActive({ conversationId: initialConversationId, peer: null, lastMessageAt: new Date().toISOString() });
  }, [open, initialConversationId, threads]);

  // Marque la conversation active comme lue.
  useEffect(() => {
    if (!open || !active) return;
    void markPrivateConversationRead(active.conversationId, meId).then(() => void refresh());
  }, [open, active, meId, refresh]);

  useEffect(() => {
    if (!open) return;
    const ch = supabase
      .channel(`dm-list-${meId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => void load())
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(ch);
      } catch {
        /* noop */
      }
    };
  }, [open, meId, load]);

  const openWith = async (peer: Peer) => {
    setOpening(peer.user_id);
    const { data, error } = await supabase.rpc("open_admin_dm", { _peer: peer.user_id });
    setOpening(null);
    if (error || !data) {
      toast.error(
        error?.message?.includes("administrateur")
          ? "Les messages privés sont réservés aux échanges avec un administrateur."
          : "Impossible d'ouvrir la conversation.",
      );
      return;
    }
    setActive({ conversationId: data as string, peer, lastMessageAt: new Date().toISOString() });
    void load();
  };

  const filteredThreads = useMemo(
    () => threads.filter((t) => label(t.peer).toLowerCase().includes(query.toLowerCase())),
    [threads, query],
  );
  const filteredCandidates = useMemo(() => {
    const known = new Set(threads.map((t) => t.peer?.user_id));
    return candidates
      .filter((p) => !known.has(p.user_id))
      .filter((p) => label(p).toLowerCase().includes(query.toLowerCase()))
      .slice(0, 40);
  }, [candidates, threads, query]);

  const PeerRow = ({ peer, onOpen, unread = 0 }: { peer: Peer | null; onOpen: () => void; unread?: number }) => (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 hover:bg-white/[0.07] transition-colors">
      <button
        type="button"
        onClick={() => openUserProfile(peer?.user_id)}
        className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-slate-800 grid place-items-center text-[11px] font-bold"
        aria-label="Voir le profil"
      >
        {peer?.avatar_url ? (
          <img src={peer.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          initials(label(peer))
        )}
      </button>
      <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-left">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate">{label(peer)}</span>
          {peer && <AccountBadges userId={peer.user_id} admins={admins} premium={premium} />}
        </span>
        <span className="block text-[11px] text-slate-400">
          {unread > 0 ? `${unread} nouveau${unread > 1 ? "x" : ""} message${unread > 1 ? "s" : ""}` : "Conversation privée"}
        </span>
      </button>
      {unread > 0 && (
        <span className="shrink-0 min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
      {opening === peer?.user_id ? (
        <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
      ) : (
        <ShieldCheck className="w-4 h-4 text-emerald-300/70" />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (setActive(null), onClose())}>
      <DialogContent className="max-w-md border-white/10 bg-slate-950 text-white p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            {active ? (
              <>
                <button
                  onClick={() => setActive(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="truncate">{label(active.peer)}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-amber-300" /> Messages privés
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {active ? (
          <div className="px-3 pb-3">
            <SecurityChatPanel conversationId={active.conversationId} meId={meId} height="22rem" />
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-[11px] text-slate-400">
              {isAdmin
                ? "Écrivez à n'importe quel membre en toute confidentialité."
                : "Les messages privés sont réservés aux échanges avec un administrateur."}
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un membre..."
                className="w-full pl-9 pr-3 h-9 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <div className="max-h-[22rem] overflow-y-auto space-y-3 pr-0.5">
              {loading ? (
                <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
                </p>
              ) : (
                <>
                  {filteredThreads.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">Conversations</p>
                      {filteredThreads.map((t) => (
                        <PeerRow
                          key={t.conversationId}
                          peer={t.peer}
                          unread={byConversation[t.conversationId] || 0}
                          onOpen={() => setActive(t)}
                        />
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">
                      {isAdmin ? "Membres" : "Administration"}
                    </p>
                    {filteredCandidates.length === 0 ? (
                      <p className="flex items-center gap-2 text-[11px] text-slate-400 py-2">
                        <UserRound className="w-3.5 h-3.5" /> Aucun interlocuteur disponible.
                      </p>
                    ) : (
                      filteredCandidates.map((p) => (
                        <PeerRow key={p.user_id} peer={p} onOpen={() => void openWith(p)} />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
