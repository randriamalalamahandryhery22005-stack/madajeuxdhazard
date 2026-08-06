import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/contexts/CallContext";
import { toast } from "sonner";
import { MessageCircle, Mic, Bell, PhoneMissed, Lock } from "lucide-react";
import IncomingCallOverlay, { type IncomingCall } from "@/components/IncomingCallOverlay";
import { playNotificationSound, startRingtone, unlockAudioPlayback } from "@/lib/notificationSound";
import { openPrivateChat } from "@/lib/privateChat";



const AUDIO_RX = /\.(webm|ogg|mp3|m4a|wav|aac)(\?|$)/i;
// Les sons sont synthétisés à la volée (Web Audio) : aucun fichier externe requis.
const SOUNDS = {
  text: "message",
  voice: "voice",
  call: "call",
  ring: "ring",
  missed: "missed",
  notification: "notification",
} as const;

type Profile = { user_id: string; name?: string | null; full_name?: string | null; avatar_url?: string | null };

export default function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { openPanel } = useCall();
  const locRef = useRef(location.pathname);
  useEffect(() => { locRef.current = location.pathname; }, [location.pathname]);

  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const incomingRef = useRef<IncomingCall | null>(null);
  useEffect(() => { incomingRef.current = incomingCall; }, [incomingCall]);

  const ringRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const lastPlayRef = useRef<Record<string, number>>({});
  const seenCallsRef = useRef<Set<string>>(new Set());
  const lastRingRef = useRef<{ callId: string; at: number } | null>(null);


  // Débloque l'audio au premier geste utilisateur (politique d'autoplay)
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      unlockAudioPlayback();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = useCallback((kind: keyof typeof SOUNDS) => {
    playNotificationSound(SOUNDS[kind]);
  }, []);

  const stopRingRef = useRef<(() => void) | null>(null);

  const startRing = useCallback(() => {
    stopRingRef.current?.();
    stopRingRef.current = startRingtone();
  }, []);

  const stopRing = useCallback(() => {
    stopRingRef.current?.();
    stopRingRef.current = null;
    try { ringRef.current?.pause(); } catch { /* noop */ }
    ringRef.current = null;
  }, []);


  const acceptCall = useCallback((_c: IncomingCall) => {
    stopRing();
    setIncomingCall(null);
    openPanel();
  }, [openPanel, stopRing]);

  const declineCall = useCallback((c: IncomingCall) => {
    stopRing();
    setIncomingCall(null);
    // Fast path: tell the caller immediately over the ring channel.
    const ch = supabase.channel("chatsup_voice_ring", { config: { broadcast: { self: false } } });
    ch.subscribe((st) => {
      if (st === "SUBSCRIBED") {
        ch.send({ type: "broadcast", event: "call-declined", payload: { callId: c.id, from: user?.id } });
        window.setTimeout(() => { try { supabase.removeChannel(ch); } catch { /* noop */ } }, 300);
      }
    });
    // Robust path: best-effort persisted trace so the caller sees it even if offline momentarily.
    if (user) {
      void supabase.from("notifications").insert({
        title: "Appel refusé",
        message: "L'appel a été refusé.",
        target_user_id: c.callerId,
        created_by: user.id,
        is_global: false,
      }).then(({ error }) => { if (error) console.warn("decline notify error", error); });
    }
  }, [stopRing, user]);

  const missedCall = useCallback(async (c: IncomingCall) => {
    stopRing();
    setIncomingCall(null);
    if (!user) return;
    // Local toast for the recipient
    play("missed");
    toast.custom(
      (id) => (
        <div className="flex items-center gap-3 w-[300px] max-w-[88vw] rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur-xl shadow-[0_18px_40px_-16px_rgba(0,0,0,0.8)] px-3 py-2.5">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-rose-500/15 text-rose-300 flex items-center justify-center">
            <PhoneMissed className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">Appel manqué</p>
            <p className="text-[11px] text-slate-400 truncate">de {c.callerName}</p>
          </div>
          <button
            onClick={() => { toast.dismiss(id); openPanel(); }}
            className="shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white transition"
          >
            Rappeler
          </button>
        </div>
      ),
      { duration: 5000 }
    );

    // Persistent notification (visible on all screens through the global notifs stream)
    try {
      await supabase.from("notifications").insert({
        title: "Appel manqué",
        message: `Appel manqué de ${c.callerName}`,
        target_user_id: user.id,
        created_by: c.callerId,
        is_global: false,
      });
    } catch { /* ignore */ }
  }, [openPanel, play, stopRing, user]);


  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const handleGlobalMessage = async (payload: any) => {
      const msg = payload.new;
      if (!msg || msg.user_id === user.id) return;

      const isVoice = AUDIO_RX.test(msg.image_url || "");
      const kind: "text" | "voice" = isVoice ? "voice" : "text";

      const { data: prof } = await supabase
        .from("public_profiles")
        .select("user_id,name,full_name,avatar_url")
        .eq("user_id", msg.user_id)
        .maybeSingle();
      const p = prof as Profile | null;
      const senderName = p?.full_name || p?.name || "Un utilisateur";

      const onChat = locRef.current.startsWith("/chat");
      if (onChat) return; // Chat page handles its own realtime updates

      play(kind);
      const Icon = isVoice ? Mic : MessageCircle;
      toast.custom(
        (id) => (
          <div
            onClick={() => { toast.dismiss(id); navigate("/chat"); }}
            className="cursor-pointer flex items-center gap-3 w-[300px] max-w-[88vw] rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur-xl shadow-[0_18px_40px_-16px_rgba(0,0,0,0.8)] px-3 py-2.5 transition hover:border-white/20"
          >
            <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${isVoice ? "bg-emerald-500/15 text-emerald-300" : "bg-violet-500/15 text-violet-300"}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{senderName}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {isVoice ? "🎤 Message vocal" : (msg.content || (msg.image_url ? "📷 Image" : "Nouveau message"))}
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-violet-600/90 text-white">
              Ouvrir
            </span>
          </div>
        ),
        { duration: 5000 }
      );
    };

    const handleNotification = (payload: any) => {
      const n = payload.new;
      if (!n) return;
      const isMine = n.is_global || n.target_user_id === user.id;
      if (!isMine) return;
      play("notification");
      toast.custom(
        (id) => (
          <div
            onClick={() => toast.dismiss(id)}
            className="cursor-pointer flex items-center gap-3 w-[300px] max-w-[88vw] rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur-xl shadow-[0_18px_40px_-16px_rgba(0,0,0,0.8)] px-3 py-2.5 transition hover:border-white/20"
          >
            <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{n.title}</p>
              <p className="text-[11px] text-slate-400 line-clamp-2">{n.message}</p>
            </div>
          </div>
        ),
        { duration: 5000 }
      );
    };


    /**
     * Messages privés (table `messages`) : notification temps réel affichant le
     * nom de l'expéditeur, un aperçu du message et le nombre de non-lus,
     * avec ouverture directe de la conversation concernée au toucher.
     */
    const handlePrivateMessage = async (payload: any) => {
      const msg = payload.new as {
        id: string;
        conversation_id: string;
        sender_id: string;
        content: string | null;
        attachment_type: string | null;
        attachments?: unknown;
      };
      if (!msg || msg.sender_id === user.id) return;

      // Suis-je membre de cette conversation ?
      const { data: me } = await supabase
        .from("conversation_members")
        .select("conversation_id,last_read_at")
        .eq("conversation_id", msg.conversation_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!me) return;

      const { data: prof } = await supabase
        .from("public_profiles")
        .select("user_id,name,full_name,avatar_url")
        .eq("user_id", msg.sender_id)
        .maybeSingle();
      const p = prof as Profile | null;
      const senderName = p?.full_name || p?.name || "Message privé";

      // Nombre total de messages privés non lus (toutes conversations).
      const { data: mem } = await supabase
        .from("conversation_members")
        .select("conversation_id,last_read_at")
        .eq("user_id", user.id);
      const readAt = new Map((mem || []).map((m) => [m.conversation_id, m.last_read_at]));
      const { data: recent } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,created_at")
        .in("conversation_id", [...readAt.keys()])
        .neq("sender_id", user.id)
        .order("created_at", { ascending: false })
        .limit(300);
      const unread = (recent || []).filter((m) => {
        const last = readAt.get(m.conversation_id);
        return !last || new Date(m.created_at) > new Date(last);
      }).length;

      const hasAttachment =
        !!msg.attachment_type || (Array.isArray(msg.attachments) && msg.attachments.length > 0);
      const preview =
        (msg.content && msg.content.trim()) || (hasAttachment ? "📎 Pièce jointe" : "Nouveau message privé");

      play("text");
      toast.custom(
        (id) => (
          <div
            onClick={() => {
              toast.dismiss(id);
              navigate("/chat");
              window.setTimeout(() => openPrivateChat(msg.conversation_id), 120);
            }}
            className="cursor-pointer flex items-center gap-3 w-[300px] max-w-[88vw] rounded-2xl border border-amber-400/20 bg-slate-950/85 backdrop-blur-xl shadow-[0_18px_40px_-16px_rgba(0,0,0,0.8)] px-3 py-2.5 transition hover:border-amber-400/40"
          >
            <div className="relative w-9 h-9 shrink-0 rounded-xl overflow-hidden bg-amber-500/15 text-amber-300 flex items-center justify-center">
              {p?.avatar_url ? (
                <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Lock className="w-4.5 h-4.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{senderName}</p>
              <p className="text-[11px] text-slate-400 truncate">{preview}</p>
            </div>
            {unread > 0 && (
              <span className="shrink-0 min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
        ),
        { duration: 6000 }
      );
    };

    const dbChannel = supabase
      .channel(`global-notifs-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "global_chat_messages" }, handleGlobalMessage)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, handleNotification)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, handlePrivateMessage)
      .subscribe();

    // Resolves caller profile then raises the incoming-call overlay, de-duplicated by call id.
    const showIncomingCall = async (callId: string, callerId: string) => {
      if (!callId || !callerId || callerId === user.id) return;
      lastRingRef.current = { callId, at: Date.now() };
      if (seenCallsRef.current.has(callId)) return;
      seenCallsRef.current.add(callId);

      const { data: prof } = await supabase
        .from("public_profiles")
        .select("user_id,name,full_name,avatar_url")
        .eq("user_id", callerId)
        .maybeSingle();
      const p = prof as Profile | null;
      const callerName = p?.full_name || p?.name || "Appel entrant";

      play("call");
      startRing();
      setIncomingCall({
        id: callId,
        callerId,
        callerName,
        avatarUrl: p?.avatar_url ?? null,
      });
    };

    // Fast path: voice call ring signaling via broadcast (no DB round-trip).
    const ringChannel = supabase
      .channel("chatsup_voice_ring", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "ring" }, ({ payload }) => {
        void showIncomingCall(payload?.callId as string, payload?.from as string);
      })
      .on("broadcast", { event: "ring-cancel" }, ({ payload }) => {
        const callId = payload?.callId as string | undefined;
        if (!callId) return;
        if (incomingRef.current?.id === callId) {
          stopRing();
          setIncomingCall(null);
        }
      })
      .subscribe();

    // Robust path: DB-backed fallback so a callee who joined late (or missed the
    // broadcast) still gets notified. voice_calls rows use caller_id/callee_id;
    // any freshly-created "active" row where we are not the caller is treated as a ring.
    const dbCallChannel = supabase
      .channel(`incoming-calls-db-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "voice_calls" },
        (payload) => {
          const row = payload.new as { id: string; caller_id: string; status: string; created_at: string };
          if (!row || row.status !== "active") return;
          if (row.caller_id === user.id) return;
          if (Date.now() - new Date(row.created_at).getTime() > 60_000) return;
          void showIncomingCall(row.id, row.caller_id);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "voice_calls" },
        (payload) => {
          const row = payload.new as { id: string; status: string };
          if (!row) return;
          if ((row.status === "ended" || row.status === "declined" || row.status === "missed") && incomingRef.current?.id === row.id) {
            stopRing();
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    // Filet de sécurité : si l'appelant raccroche sans que l'annulation arrive,
    // l'appel entrant disparaît dès que le battement de cœur s'interrompt.
    const watchdog = window.setInterval(() => {
      const current = incomingRef.current;
      if (!current) return;
      const last = lastRingRef.current;
      if (!last || last.callId !== current.id) return;
      if (Date.now() - last.at > 9000) {
        stopRing();
        setIncomingCall(null);
      }
    }, 2000);


    return () => {
      window.clearInterval(watchdog);
      try { supabase.removeChannel(dbChannel); } catch {}
      try { supabase.removeChannel(ringChannel); } catch {}
      try { supabase.removeChannel(dbCallChannel); } catch {}
      stopRing();
    };

  }, [user, play, startRing, stopRing, navigate]);

  const overlay = useMemo(
    () => <IncomingCallOverlay call={incomingCall} onAccept={acceptCall} onDecline={declineCall} onMissed={missedCall} />,
    [incomingCall, acceptCall, declineCall, missedCall]
  );

  return (
    <>
      {children}
      {overlay}
    </>
  );
}
