import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Source de vérité du salon global "J&H Chats".
 *
 * Objectifs :
 *  - tous les contenus (texte, image, audio, vidéo, PDF, APK, archives…) sont
 *    visibles par tous les comptes autorisés, en ligne ou non ;
 *  - réception temps réel fiable (abonnement unique, jamais recréé) ;
 *  - resynchronisation automatique : au (re)branchement du canal, au retour de
 *    l'onglet, au retour du réseau et via un filet de sécurité périodique.
 */

export type ChatRow = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  attachments?: unknown;
};

/** Chemins de stockage portés par un message (colonne `attachments` + héritage `image_url`). */
const rowPaths = (row: ChatRow): string[] => {
  const out: string[] = [];
  if (Array.isArray(row.attachments)) {
    for (const a of row.attachments as Array<{ path?: unknown }>) {
      if (a && typeof a.path === "string") out.push(a.path);
    }
  }
  if (out.length === 0 && row.image_url) out.push(row.image_url);
  return out;
};

export type Profile = {
  user_id: string;
  name: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type Reaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

export type ReadRow = {
  message_id: string;
  user_id: string;
  read_at: string;
};

const HISTORY_LIMIT = 300;
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 jours
const POLL_MS = 15000;

const byTime = (a: ChatRow, b: ChatRow) =>
  a.created_at === b.created_at ? a.id.localeCompare(b.id) : a.created_at.localeCompare(b.created_at);

export function useGlobalChat(userId?: string | null) {
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reads, setReads] = useState<ReadRow[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const messagesRef = useRef<ChatRow[]>([]);
  const profilesRef = useRef<Record<string, Profile>>({});
  const pendingProfiles = useRef<Set<string>>(new Set());
  const signedRef = useRef<Record<string, string>>({});
  const pendingUrls = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(userId ?? null);
  const onNewMessage = useRef<((row: ChatRow) => void) | null>(null);

  useEffect(() => {
    userIdRef.current = userId ?? null;
  }, [userId]);

  /* ------------------------------------------------------------------ */
  /* Pièces jointes : URLs signées (bucket privé chat-files)             */
  /* ------------------------------------------------------------------ */
  const resolveAttachments = useCallback(async (paths: Array<string | null | undefined>) => {
    const todo = Array.from(
      new Set(
        paths.filter(
          (p): p is string => !!p && !signedRef.current[p] && !pendingUrls.current.has(p),
        ),
      ),
    );
    if (todo.length === 0) return;
    todo.forEach((p) => pendingUrls.current.add(p));

    const direct = todo.filter((p) => p.startsWith("http"));
    const stored = todo.filter((p) => !p.startsWith("http"));
    const next: Record<string, string> = {};
    for (const p of direct) next[p] = p;

    if (stored.length > 0) {
      const { data } = await supabase.storage.from("chat-files").createSignedUrls(stored, SIGNED_TTL);
      for (const item of data || []) {
        if (item.signedUrl && item.path) next[item.path] = item.signedUrl;
      }
    }
    todo.forEach((p) => pendingUrls.current.delete(p));
    if (Object.keys(next).length === 0) return;
    signedRef.current = { ...signedRef.current, ...next };
    setSignedUrls(signedRef.current);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Profils                                                             */
  /* ------------------------------------------------------------------ */
  const loadProfiles = useCallback(async (ids: Array<string | null | undefined>) => {
    const todo = Array.from(
      new Set(
        ids.filter(
          (id): id is string => !!id && !profilesRef.current[id] && !pendingProfiles.current.has(id),
        ),
      ),
    );
    if (todo.length === 0) return;
    todo.forEach((id) => pendingProfiles.current.add(id));
    const { data } = await supabase
      .from("public_profiles")
      .select("user_id, name, full_name, avatar_url")
      .in("user_id", todo);
    todo.forEach((id) => pendingProfiles.current.delete(id));
    if (!data || data.length === 0) return;
    const next = { ...profilesRef.current };
    for (const p of data as Profile[]) next[p.user_id] = p;
    profilesRef.current = next;
    setProfiles(next);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Messages                                                            */
  /* ------------------------------------------------------------------ */
  const ingest = useCallback(
    (rows: ChatRow[], notify = false) => {
      if (rows.length === 0) return;
      const fresh: ChatRow[] = [];
      const map = new Map(messagesRef.current.map((m) => [m.id, m]));
      for (const row of rows) {
        if (!map.has(row.id)) fresh.push(row);
        map.set(row.id, { ...(map.get(row.id) || {}), ...row } as ChatRow);
      }
      messagesRef.current = Array.from(map.values()).sort(byTime);
      setMessages(messagesRef.current);
      void loadProfiles(rows.map((r) => r.user_id));
      void resolveAttachments(rows.flatMap(rowPaths));
      if (notify && fresh.length > 0) fresh.forEach((r) => onNewMessage.current?.(r));
    },
    [loadProfiles, resolveAttachments],
  );

  const removeMessage = useCallback((id: string) => {
    messagesRef.current = messagesRef.current.filter((m) => m.id !== id);
    setMessages(messagesRef.current);
  }, []);

  /** Recharge complète de la fenêtre courante + réconciliation des suppressions. */
  const resync = useCallback(
    async (withMeta = true) => {
      const msgReq = supabase
        .from("global_chat_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT);

      const [msgRes, reactRes, readRes] = await Promise.all([
        msgReq,
        withMeta ? supabase.from("chat_message_reactions").select("*") : Promise.resolve({ data: null }),
        withMeta
          ? supabase.from("chat_message_reads").select("message_id,user_id,read_at")
          : Promise.resolve({ data: null }),
      ]);

      if (msgRes.error) throw msgRes.error;
      const rows = ((msgRes.data || []) as ChatRow[]).slice().sort(byTime);
      const serverIds = new Set(rows.map((r) => r.id));
      const oldest = rows[0]?.created_at;

      // On garde les éventuels messages locaux plus anciens que la fenêtre,
      // on retire ceux supprimés côté serveur pendant une déconnexion.
      const kept = messagesRef.current.filter(
        (m) => (oldest ? m.created_at < oldest : false) || serverIds.has(m.id),
      );
      const map = new Map(kept.map((m) => [m.id, m]));
      for (const r of rows) map.set(r.id, r);
      messagesRef.current = Array.from(map.values()).sort(byTime);
      setMessages(messagesRef.current);

      void loadProfiles(messagesRef.current.map((m) => m.user_id));
      void resolveAttachments(messagesRef.current.flatMap(rowPaths));

      if (reactRes && "data" in reactRes && reactRes.data) setReactions(reactRes.data as Reaction[]);
      if (readRes && "data" in readRes && readRes.data) setReads(readRes.data as ReadRow[]);
    },
    [loadProfiles, resolveAttachments],
  );

  /* ------------------------------------------------------------------ */
  /* Chargement initial                                                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await resync(true);
      } catch {
        /* l'UI affiche l'état hors-ligne, le polling reprendra */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [resync]);

  /* ------------------------------------------------------------------ */
  /* Temps réel (abonnement unique, jamais recréé)                       */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let disposed = false;

    const fetchOnline = async () => {
      const { data } = await supabase.from("online_users").select("user_id");
      if (!disposed && data) {
        setOnlineIds(new Set((data as { user_id: string }[]).map((u) => u.user_id)));
      }
    };

    const channel = supabase
      .channel("jh_global_chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat_messages" },
        (payload) => ingest([payload.new as ChatRow], true),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "global_chat_messages" },
        (payload) => ingest([payload.new as ChatRow]),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "global_chat_messages" },
        (payload) => removeMessage((payload.old as { id: string }).id),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_message_reactions" },
        (payload) => {
          const r = payload.new as Reaction;
          setReactions((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_message_reactions" },
        (payload) => {
          const r = payload.old as { id: string };
          setReactions((prev) => prev.filter((x) => x.id !== r.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_message_reads" },
        (payload) => {
          const r = payload.new as ReadRow;
          setReads((prev) =>
            prev.some((x) => x.message_id === r.message_id && x.user_id === r.user_id) ? prev : [...prev, r],
          );
          void loadProfiles([r.user_id]);
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "online_users" }, () => {
        void fetchOnline();
      })
      .subscribe((status) => {
        if (disposed) return;
        const ok = status === "SUBSCRIBED";
        setConnected(ok);
        if (ok) {
          void resync(true);
          void fetchOnline();
        }
      });

    void fetchOnline();

    // Filet de sécurité : rattrapage périodique + au retour d'onglet / réseau.
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void resync(false).catch(() => {});
    }, POLL_MS);

    const wake = () => {
      if (document.visibilityState === "visible") {
        void resync(true).catch(() => {});
        void fetchOnline();
      }
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    window.addEventListener("focus", wake);

    return () => {
      disposed = true;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
      window.removeEventListener("focus", wake);
      supabase.removeChannel(channel);
    };
  }, [ingest, removeMessage, resync, loadProfiles]);

  /* ------------------------------------------------------------------ */
  /* Accusés de lecture                                                  */
  /* ------------------------------------------------------------------ */
  const markingRef = useRef(false);
  useEffect(() => {
    if (!userId || markingRef.current) return;
    const known = new Set(reads.filter((r) => r.user_id === userId).map((r) => r.message_id));
    const toMark = messages.filter((m) => m.user_id !== userId && !known.has(m.id));
    if (toMark.length === 0) return;
    markingRef.current = true;
    void supabase
      .from("chat_message_reads")
      .upsert(
        toMark.map((m) => ({ message_id: m.id, user_id: userId })),
        { onConflict: "message_id,user_id", ignoreDuplicates: true },
      )
      .then(({ error }) => {
        markingRef.current = false;
        if (!error) {
          const at = new Date().toISOString();
          setReads((prev) => [...prev, ...toMark.map((m) => ({ message_id: m.id, user_id: userId, read_at: at }))]);
        }
      });
  }, [messages, reads, userId]);

  return {
    messages,
    profiles,
    reactions,
    reads,
    onlineIds,
    signedUrls,
    loading,
    connected,
    resync,
    ingest,
    removeMessage,
    resolveAttachments,
    loadProfiles,
    setReactions,
    onNewMessage,
  };
}
