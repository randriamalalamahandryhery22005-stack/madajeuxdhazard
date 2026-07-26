import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/contexts/CallContext";
import { toast } from "sonner";
import { MessageCircle, Mic, Bell, PhoneMissed } from "lucide-react";
import IncomingCallOverlay, { type IncomingCall } from "@/components/IncomingCallOverlay";
import { playNotificationSound, startRingtone } from "@/lib/notificationSound";



const AUDIO_RX = /\.(webm|ogg|mp3|m4a|wav|aac)(\?|$)/i;
const SOUNDS = {
  text: "/sounds/notif-text.wav",
  voice: "/sounds/notif-voice.wav",
  call: "/sounds/notif-call.wav",
  ring: "/sounds/ringtone.wav",
};

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

  // Preload audio + unlock on first user gesture (autoplay policy)
  useEffect(() => {
    const els: HTMLAudioElement[] = [];
    (Object.values(SOUNDS)).forEach((s) => {
      const a = new Audio(s);
      a.preload = "auto";
      a.volume = 0.6;
      els.push(a);
    });
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      els.forEach((a) => { a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {}); });
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = useCallback((kind: keyof typeof SOUNDS) => {
    const map = { text: "message", voice: "voice", call: "call", ring: "ring" } as const;
    playNotificationSound(map[kind]);
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

  const declineCall = useCallback((_c: IncomingCall) => {
    stopRing();
    setIncomingCall(null);
  }, [stopRing]);

  const missedCall = useCallback(async (c: IncomingCall) => {
    stopRing();
    setIncomingCall(null);
    if (!user) return;
    // Local toast for the recipient
    play("call");
    toast.custom(
      (id) => (
        <div className="flex items-start gap-3 min-w-[280px] max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-lg shadow-2xl p-3 pr-4">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
            <PhoneMissed className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Appel manqué</p>
            <p className="text-xs text-slate-300 truncate">de {c.callerName}</p>
            <button
              onClick={() => { toast.dismiss(id); openPanel(); }}
              className="mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
            >
              Rappeler
            </button>
          </div>
        </div>
      ),
      { duration: 8000 }
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
        .from("profiles")
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
          <div className="flex items-start gap-3 min-w-[280px] max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-lg shadow-2xl p-3 pr-4">
            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${isVoice ? "bg-emerald-500/20 text-emerald-300" : "bg-violet-500/20 text-violet-300"}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{senderName}</p>
              <p className="text-xs text-slate-300 truncate">
                {isVoice ? "🎤 Message vocal" : (msg.content || (msg.image_url ? "📷 Image" : "Nouveau message"))}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => { toast.dismiss(id); navigate("/chat"); }}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition"
                >
                  Ouvrir
                </button>
                <button
                  onClick={() => toast.dismiss(id)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition"
                >
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        ),
        { duration: 6000 }
      );
    };

    const handleNotification = (payload: any) => {
      const n = payload.new;
      if (!n) return;
      const isMine = n.is_global || n.target_user_id === user.id;
      if (!isMine) return;
      play("text");
      toast.custom(
        (id) => (
          <div className="flex items-start gap-3 min-w-[280px] max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-lg shadow-2xl p-3 pr-4">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{n.title}</p>
              <p className="text-xs text-slate-300 line-clamp-2">{n.message}</p>
              <button
                onClick={() => toast.dismiss(id)}
                className="mt-2 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition"
              >
                OK
              </button>
            </div>
          </div>
        ),
        { duration: 6000 }
      );
    };

    const dbChannel = supabase
      .channel(`global-notifs-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "global_chat_messages" }, handleGlobalMessage)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, handleNotification)
      .subscribe();

    // Voice call ring signaling via broadcast (no DB table required)
    const ringChannel = supabase
      .channel("chatsup_voice_ring", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "ring" }, async ({ payload }) => {
        const callerId = payload?.from as string | undefined;
        const callId = payload?.callId as string | undefined;
        if (!callerId || !callId || callerId === user.id) return;
        if (seenCallsRef.current.has(callId)) return;
        seenCallsRef.current.add(callId);

        const { data: prof } = await supabase
          .from("profiles")
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

    return () => {
      try { supabase.removeChannel(dbChannel); } catch {}
      try { supabase.removeChannel(ringChannel); } catch {}
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
