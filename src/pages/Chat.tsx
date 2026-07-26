import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useCall } from "@/contexts/CallContext";
import VoiceRecorder from "@/components/VoiceRecorder";
import VoiceMessagePlayer from "@/components/VoiceMessagePlayer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Send,
  ImagePlus,
  Paperclip,
  X,
  Search,
  Reply,
  Trash2,
  Loader2,
  MessageCircle,
  Smile,
  Eye,
  Check,
  CheckCheck,
  Phone,
  FileText,
  Download,
  Play,
} from "lucide-react";

const AUDIO_RX = /\.(webm|ogg|mp3|m4a|wav|aac)(\?|$)/i;
const IMAGE_RX = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|avif)(\?|$)/i;
const VIDEO_RX = /\.(mp4|mov|webm|mkv|m4v|3gp|avi)(\?|$)/i;
const isAudioPath = (p?: string | null) => !!p && AUDIO_RX.test(p);
const isImagePath = (p?: string | null) => !!p && IMAGE_RX.test(p);
const isVideoPath = (p?: string | null) => !!p && VIDEO_RX.test(p);
const fileNameFromPath = (p: string) => {
  const raw = p.split("/").pop() || p;
  return raw.replace(/^\d+-[a-z0-9]+\./i, (m) => m.split(".").slice(1).join("."));
};
const MAX_FILE_MB = 50;

type ChatRow = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  reply_to_id: string | null;
  created_at: string;
};

type Profile = {
  user_id: string;
  name: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type Reaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

type ReadRow = {
  message_id: string;
  user_id: string;
  read_at: string;
};

const SIGNED_TTL = 60 * 60 * 24 * 365;
const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "🙏"];

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}
function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const isYest = d.toDateString() === y.toDateString();
  if (isToday) return "Aujourd'hui";
  if (isYest) return "Hier";
  return d.toLocaleDateString();
}

export default function Chat() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reads, setReads] = useState<ReadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatRow | null>(null);
  const [search, setSearch] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [viewersFor, setViewersFor] = useState<ChatRow | null>(null);
  const { openPanel: openCallPanel } = useCall();
  const setCallOpen = (v: boolean) => { if (v) openCallPanel(); };

  // Auto-open call panel when arriving with ?call=1 (from incoming call accept)
  useEffect(() => {
    if (searchParams.get("call") === "1") {
      openCallPanel();
      const next = new URLSearchParams(searchParams);
      next.delete("call");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, openCallPanel]);


  const [voiceActive, setVoiceActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const loadProfiles = useCallback(async (ids: string[]) => {
    const missing = Array.from(new Set(ids)).filter((id) => !profiles[id]);
    if (missing.length === 0) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, name, full_name, avatar_url")
      .in("user_id", missing);
    if (data) {
      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of data as Profile[]) next[p.user_id] = p;
        return next;
      });
    }
  }, [profiles]);

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const resolveImage = useCallback(async (path: string) => {
    if (!path) return;
    if (signedUrls[path]) return;
    if (path.startsWith("http")) {
      setSignedUrls((s) => ({ ...s, [path]: path }));
      return;
    }
    const { data } = await supabase.storage.from("chat-files").createSignedUrl(path, SIGNED_TTL);
    if (data?.signedUrl) setSignedUrls((s) => ({ ...s, [path]: data.signedUrl }));
  }, [signedUrls]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [msgRes, reactRes, readRes] = await Promise.all([
        supabase.from("global_chat_messages").select("*").order("created_at", { ascending: true }).limit(300),
        supabase.from("chat_message_reactions").select("*"),
        supabase.from("chat_message_reads").select("message_id,user_id,read_at"),
      ]);
      if (cancelled) return;
      if (msgRes.error) {
        toast.error("Impossible de charger le chat");
        setLoading(false);
        return;
      }
      const rows = (msgRes.data || []) as ChatRow[];
      setMessages(rows);
      setReactions((reactRes.data || []) as Reaction[]);
      setReads((readRes.data || []) as ReadRow[]);
      await loadProfiles(rows.map((m) => m.user_id));
      rows.forEach((m) => m.image_url && resolveImage(m.image_url));
      setLoading(false);
      setTimeout(() => scrollToBottom(false), 50);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("global_chat_v2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "global_chat_messages" }, async (payload) => {
        const row = payload.new as ChatRow;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        loadProfiles([row.user_id]);
        if (row.image_url) resolveImage(row.image_url);
        if (!atBottom && row.user_id !== user?.id) setUnreadCount((c) => c + 1);
        else setTimeout(() => scrollToBottom(true), 30);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "global_chat_messages" }, (payload) => {
        const oldRow = payload.old as { id: string };
        setMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_message_reactions" }, (payload) => {
        const r = payload.new as Reaction;
        setReactions((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_message_reactions" }, (payload) => {
        const r = payload.old as { id: string };
        setReactions((prev) => prev.filter((x) => x.id !== r.id));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_message_reads" }, (payload) => {
        const r = payload.new as ReadRow;
        setReads((prev) =>
          prev.some((x) => x.message_id === r.message_id && x.user_id === r.user_id) ? prev : [...prev, r]
        );
        loadProfiles([r.user_id]);
      })
      .subscribe();

    async function fetchOnline() {
      const { data } = await supabase.from("online_users").select("user_id");
      if (data) setOnlineIds(new Set((data as { user_id: string }[]).map((u) => u.user_id)));
    }
    const onlineChannel = supabase
      .channel("chat_online_v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "online_users" }, fetchOnline)
      .subscribe();
    fetchOnline();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(onlineChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atBottom, user?.id, loadProfiles, resolveImage, scrollToBottom]);

  // Auto-mark messages as read (visible + not own)
  useEffect(() => {
    if (!user) return;
    const toMark = messages.filter(
      (m) =>
        m.user_id !== user.id &&
        !reads.some((r) => r.message_id === m.id && r.user_id === user.id)
    );
    if (toMark.length === 0) return;
    const rowsToInsert = toMark.map((m) => ({ message_id: m.id, user_id: user.id }));
    supabase.from("chat_message_reads").insert(rowsToInsert).then(({ error }) => {
      if (!error) {
        setReads((prev) => [
          ...prev,
          ...toMark.map((m) => ({ message_id: m.id, user_id: user.id, read_at: new Date().toISOString() })),
        ]);
      }
    });
  }, [messages, user, reads]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setAtBottom(near);
    if (near) setUnreadCount(0);
  };

  const handleImagePick = (f: File | null) => {
    if (!f) { setImageFile(null); setImagePreview(null); return; }
    if (f.size > MAX_FILE_MB * 1024 * 1024) { toast.error(`Fichier trop volumineux (max ${MAX_FILE_MB}MB)`); return; }
    setImageFile(f);
    if (f.type.startsWith("image/")) setImagePreview(URL.createObjectURL(f));
    else setImagePreview(null);
  };

  const send = async () => {
    if (!user) return;
    const text = input.trim();
    if (!text && !imageFile) return;
    setSending(true);
    try {
      let imagePath: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("chat-files")
          .upload(path, imageFile, { contentType: imageFile.type, upsert: false });
        if (upErr) throw upErr;
        imagePath = path;
      }
      const { error } = await supabase.from("global_chat_messages").insert({
        user_id: user.id,
        content: text,
        image_url: imagePath,
        reply_to_id: replyTo?.id ?? null,
      });
      if (error) throw error;
      setInput("");
      setImageFile(null);
      setImagePreview(null);
      setReplyTo(null);
      setTimeout(() => scrollToBottom(true), 30);
    } catch (e) {
      toast.error("Échec de l'envoi");
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("global_chat_messages").delete().eq("id", id);
    if (error) toast.error("Suppression impossible");
  };

  const sendVoice = async (blob: Blob, durationMs: number) => {
    if (!user) return;
    try {
      const path = `${user.id}/voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webm`;
      const { error: upErr } = await supabase.storage
        .from("chat-files")
        .upload(path, blob, { contentType: blob.type || "audio/webm", upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.from("global_chat_messages").insert({
        user_id: user.id,
        content: `🎤 Message vocal · ${Math.max(1, Math.round(durationMs / 1000))}s`,
        image_url: path,
        reply_to_id: replyTo?.id ?? null,
      });
      if (error) throw error;
      setReplyTo(null);
      setTimeout(() => scrollToBottom(true), 30);
    } catch (e) {
      console.error(e);
      toast.error("Échec de l'envoi vocal");
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find((r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      const { error } = await supabase.from("chat_message_reactions").delete().eq("id", existing.id);
      if (error) toast.error("Impossible de retirer la réaction");
    } else {
      const { error } = await supabase.from("chat_message_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
      if (error) toast.error("Impossible d'ajouter la réaction");
    }
    setEmojiPickerFor(null);
  };

  // Filter: only messages from currently online users (plus your own)
  const visible = useMemo(
    () => messages.filter((m) => onlineIds.has(m.user_id) || m.user_id === user?.id),
    [messages, onlineIds, user?.id]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return visible;
    const q = search.toLowerCase();
    return visible.filter((m) => m.content?.toLowerCase().includes(q));
  }, [visible, search]);

  const grouped = useMemo(() => {
    const out: Array<{ day: string; items: ChatRow[] }> = [];
    for (const m of filtered) {
      const day = formatDay(m.created_at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [filtered]);

  const msgById = useMemo(() => {
    const m: Record<string, ChatRow> = {};
    for (const x of messages) m[x.id] = x;
    return m;
  }, [messages]);

  const displayName = (p?: Profile) => p?.full_name || p?.name || "Joueur";

  const reactionsByMsg = useMemo(() => {
    const m: Record<string, Record<string, Reaction[]>> = {};
    for (const r of reactions) {
      m[r.message_id] ??= {};
      m[r.message_id][r.emoji] ??= [];
      m[r.message_id][r.emoji].push(r);
    }
    return m;
  }, [reactions]);

  const readsByMsg = useMemo(() => {
    const m: Record<string, ReadRow[]> = {};
    for (const r of reads) {
      m[r.message_id] ??= [];
      m[r.message_id].push(r);
    }
    return m;
  }, [reads]);

  const viewers = viewersFor ? readsByMsg[viewersFor.id] || [] : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col">
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/10"
        style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,23,42,0.75))" }}
      >
        <div className="max-w-2xl mx-auto px-3 py-3 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center" aria-label="Retour">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-emerald-500 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-semibold leading-tight">J&H Chats</h1>
            <p className="text-[11px] text-slate-400">
              {onlineIds.size} en ligne · Utilisateurs en ligne uniquement
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un message..."
              className="w-full pl-9 pr-3 h-9 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>
        </div>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto" style={{ paddingBottom: "180px" }}>
        <div className="max-w-2xl mx-auto px-3 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              Aucun message d'utilisateur en ligne pour l'instant.
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.day} className="space-y-2">
                <div className="flex justify-center">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1 rounded-full">{g.day}</span>
                </div>
                {g.items.map((m) => {
                  const mine = m.user_id === user?.id;
                  const p = profiles[m.user_id];
                  const online = onlineIds.has(m.user_id);
                  const reply = m.reply_to_id ? msgById[m.reply_to_id] : null;
                  const replyAuthor = reply ? profiles[reply.user_id] : null;
                  const imgUrl = m.image_url ? signedUrls[m.image_url] : null;
                  const msgReactions = reactionsByMsg[m.id] || {};
                  const msgReads = readsByMsg[m.id] || [];
                  const readCount = msgReads.filter((r) => r.user_id !== m.user_id).length;
                  return (
                    <div key={m.id} className={`flex gap-2 group ${mine ? "flex-row-reverse" : ""}`} style={{ animation: "chat-in 0.25s ease-out" }}>
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 ring-1 ring-white/10 flex items-center justify-center">
                          {p?.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                          ) : (
                            <span className="text-[11px] font-bold uppercase">{initials(displayName(p))}</span>
                          )}
                        </div>
                        {online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />}
                      </div>
                      <div className={`max-w-[78%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                        <div className={`flex items-center gap-2 text-[11px] mb-1 ${mine ? "flex-row-reverse" : ""}`}>
                          <span className="font-semibold text-slate-200 truncate max-w-[140px]">{mine ? "Vous" : displayName(p)}</span>
                          <span className="text-slate-500">{formatTime(m.created_at)}</span>
                        </div>
                        <div
                          className={`relative px-3 py-2 rounded-2xl text-[14px] leading-snug break-words shadow ${
                            mine ? "bg-gradient-to-br from-amber-600 to-emerald-600 text-white rounded-tr-sm" : "bg-white/[0.06] border border-white/10 text-slate-100 rounded-tl-sm"
                          }`}
                        >
                          {reply && (
                            <div className={`mb-1.5 px-2 py-1 rounded-lg text-[11px] border-l-2 ${mine ? "bg-white/10 border-white/40" : "bg-black/20 border-amber-400"}`}>
                              <div className="font-semibold opacity-80 truncate">
                                {reply.user_id === user?.id ? "Vous" : displayName(replyAuthor ?? undefined)}
                              </div>
                              <div className="opacity-70 truncate">{reply.content || (reply.image_url ? "📷 Image" : "")}</div>
                            </div>
                          )}
                          {imgUrl && isAudioPath(m.image_url) && (
                            <VoiceMessagePlayer src={imgUrl} variant={mine ? "me" : "them"} cacheKey={m.id} />
                          )}
                          {imgUrl && isImagePath(m.image_url) && (
                            <a href={imgUrl} target="_blank" rel="noreferrer" className="block mb-1">
                              <img src={imgUrl} alt="pièce jointe" className="rounded-xl max-h-64 object-cover" />
                            </a>
                          )}
                          {imgUrl && isVideoPath(m.image_url) && (
                            <video src={imgUrl} controls playsInline className="rounded-xl max-h-64 mb-1 bg-black" />
                          )}
                          {imgUrl && !isAudioPath(m.image_url) && !isImagePath(m.image_url) && !isVideoPath(m.image_url) && (
                            <a
                              href={imgUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className={`flex items-center gap-2 mb-1 px-2.5 py-2 rounded-xl border ${mine ? "bg-white/15 border-white/25" : "bg-black/20 border-white/10"}`}
                            >
                              <FileText className="w-5 h-5 shrink-0 opacity-80" />
                              <span className="flex-1 min-w-0 text-[12px] font-medium truncate">{fileNameFromPath(m.image_url!)}</span>
                              <Download className="w-4 h-4 shrink-0 opacity-80" />
                            </a>
                          )}
                          {m.content && !isAudioPath(m.image_url) && <div className="whitespace-pre-wrap">{m.content}</div>}
                          {m.content && isAudioPath(m.image_url) && <div className="text-[11px] opacity-70 mt-0.5">{m.content}</div>}
                        </div>

                        {/* Reactions */}
                        {Object.keys(msgReactions).length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${mine ? "justify-end" : ""}`}>
                            {Object.entries(msgReactions).map(([emoji, list]) => {
                              const active = user && list.some((r) => r.user_id === user.id);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(m.id, emoji)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition ${
                                    active ? "bg-amber-500/30 border-amber-400/60 text-white" : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-semibold">{list.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Actions + read receipts */}
                        <div className={`flex items-center gap-1 mt-1 flex-wrap ${mine ? "flex-row-reverse" : ""}`}>
                          <div className="relative">
                            <button
                              onClick={() => setEmojiPickerFor(emojiPickerFor === m.id ? null : m.id)}
                              className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 inline-flex items-center gap-1"
                            >
                              <Smile className="w-3 h-3" /> Réagir
                            </button>
                            {emojiPickerFor === m.id && (
                              <div className="absolute z-40 mt-1 p-1.5 rounded-xl bg-slate-800 border border-white/10 shadow-xl flex gap-1">
                                {EMOJIS.map((e) => (
                                  <button key={e} onClick={() => toggleReaction(m.id, e)} className="w-7 h-7 rounded-lg hover:bg-white/10 text-base">
                                    {e}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => setReplyTo(m)} className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 inline-flex items-center gap-1">
                            <Reply className="w-3 h-3" /> Répondre
                          </button>
                          {mine && (
                            <button onClick={() => setViewersFor(m)} className="text-[10px] text-slate-300 hover:text-white px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 inline-flex items-center gap-1">
                              {readCount > 0 ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Check className="w-3 h-3" />}
                              Vu · {readCount}
                            </button>
                          )}
                          {!mine && (
                            <button onClick={() => setViewersFor(m)} className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 inline-flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {readCount}
                            </button>
                          )}
                          {(mine || isAdmin) && (
                            <button onClick={() => deleteMessage(m.id)} className="text-[10px] text-amber-300 hover:text-white px-2 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 inline-flex items-center gap-1">
                              <Trash2 className="w-3 h-3" /> {isAdmin && !mine ? "Admin" : "Supprimer"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {unreadCount > 0 && (
        <button onClick={() => { scrollToBottom(true); setUnreadCount(0); }} className="fixed left-1/2 -translate-x-1/2 z-40" style={{ bottom: "180px" }}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-600 text-white text-xs font-semibold shadow-lg">
            {unreadCount} nouveau{unreadCount > 1 ? "x" : ""} message{unreadCount > 1 ? "s" : ""} ↓
          </span>
        </button>
      )}

      <div className="fixed left-0 right-0 z-30 border-t border-white/10 backdrop-blur-xl" style={{ bottom: "72px", background: "linear-gradient(180deg, rgba(15,23,42,0.85), rgba(15,23,42,0.98))" }}>
        <div className="max-w-2xl mx-auto px-3 py-2.5 space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <Reply className="w-3.5 h-3.5 text-amber-300" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-200 truncate">
                  Réponse à {replyTo.user_id === user?.id ? "vous" : displayName(profiles[replyTo.user_id])}
                </div>
                <div className="text-slate-400 truncate">{replyTo.content || (replyTo.image_url ? "📷 Image" : "")}</div>
              </div>
              <button onClick={() => setReplyTo(null)} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {imageFile && (
            <div className="flex items-center gap-2">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="aperçu" className="max-h-24 rounded-xl border border-white/10" />
                  <button onClick={() => handleImagePick(null)} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 pr-8 max-w-full">
                  {imageFile.type.startsWith("video/") ? <Play className="w-4 h-4 text-amber-300 shrink-0" /> : <FileText className="w-4 h-4 text-amber-300 shrink-0" />}
                  <span className="text-xs text-slate-200 truncate max-w-[220px]">{imageFile.name}</span>
                  <span className="text-[10px] text-slate-500">{(imageFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                  <button onClick={() => handleImagePick(null)} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex items-end gap-2">
            {!voiceActive && (
              <>
                <label className="w-10 h-10 shrink-0 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center cursor-pointer transition" title="Envoyer une image ou une vidéo">
                  <ImagePlus className="w-4 h-4 text-amber-300" />
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { handleImagePick(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
                </label>
                <label className="w-10 h-10 shrink-0 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center cursor-pointer transition" title="Envoyer un fichier">
                  <Paperclip className="w-4 h-4 text-amber-300" />
                  <input type="file" className="hidden" onChange={(e) => { handleImagePick(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
                </label>
                <button
                  onClick={() => user && setCallOpen(true)}
                  disabled={!user}
                  className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 hover:from-emerald-500/30 hover:to-emerald-500/30 border border-emerald-400/30 flex items-center justify-center transition disabled:opacity-40 active:scale-95"
                  title="Appel vocal de groupe"
                  aria-label="Appel vocal"
                >
                  <Phone className="w-4 h-4 text-emerald-300" />
                </button>
              </>
            )}
            <VoiceRecorder onSend={sendVoice} disabled={!user} onActiveChange={setVoiceActive} />
            {!voiceActive && (
              <>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={1}
                  placeholder={user ? "Écrire un message..." : "Connectez-vous pour discuter"}
                  disabled={!user || sending}
                  className="flex-1 min-w-0 max-h-32 resize-none rounded-2xl bg-white/[0.06] border border-white/10 px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
                <button onClick={send} disabled={sending || !user || (!input.trim() && !imageFile)} className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-amber-600 to-emerald-600 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition" aria-label="Envoyer">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Viewers dialog */}
      <Dialog open={!!viewersFor} onOpenChange={(o) => !o && setViewersFor(null)}>
        <DialogContent className="max-w-sm bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Eye className="w-4 h-4" /> Vu par {viewers.filter((v) => v.user_id !== viewersFor?.user_id).length}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {viewers.filter((v) => v.user_id !== viewersFor?.user_id).length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">Aucun utilisateur n'a encore vu ce message.</p>
            )}
            {viewers
              .filter((v) => v.user_id !== viewersFor?.user_id)
              .sort((a, b) => a.read_at.localeCompare(b.read_at))
              .map((v) => {
                const p = profiles[v.user_id];
                return (
                  <div key={v.user_id} className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[11px] font-bold uppercase">{initials(displayName(p))}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName(p)}</p>
                      <p className="text-[11px] text-slate-400">{new Date(v.read_at).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Global VoiceCallPanel is rendered by GlobalCallRoot to persist across navigation */}
      <BottomNav />
      <style>{`
        @keyframes chat-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
