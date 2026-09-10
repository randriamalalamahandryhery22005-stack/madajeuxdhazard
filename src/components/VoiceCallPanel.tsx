import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCall } from "@/contexts/CallContext";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Users, X } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  user_id: string;
  name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

type PeerState = {
  pc: RTCPeerConnection;
  stream?: MediaStream;
  audioEl?: HTMLAudioElement;
  speaking?: boolean;
};

const ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };

const displayName = (p?: Profile) => p?.full_name || p?.name || "Utilisateur";
const initials = (n?: string) => (n ? n.split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase() : "?");

export default function VoiceCallPanel({
  open,
  onClose,
  userId,
  profiles,
  onJoinedChange,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  profiles: Record<string, Profile>;
  onJoinedChange?: (joined: boolean) => void;
}) {
  const { activeRoom, startRoom, endRoom } = useCall();
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [connecting, setConnecting] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ringChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ringHeartbeatRef = useRef<number | null>(null);

  const callIdRef = useRef<string>("");
  const peersRef = useRef<Record<string, PeerState>>({});
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const ringbackRef = useRef<{ ctx: AudioContext; stop: () => void } | null>(null);

  const stopRingback = useCallback(() => {
    try { ringbackRef.current?.stop(); } catch {}
    ringbackRef.current = null;
  }, []);

  const startRingback = useCallback(() => {
    if (ringbackRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      osc1.connect(gain); osc2.connect(gain);
      osc1.start(); osc2.start();
      let timer: number | null = null;
      const cycle = () => {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.15, t + 0.05);
        gain.gain.setValueAtTime(0.15, t + 1.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
      };
      cycle();
      timer = window.setInterval(cycle, 3000);
      ringbackRef.current = {
        ctx,
        stop: () => {
          if (timer) window.clearInterval(timer);
          try { osc1.stop(); osc2.stop(); } catch {}
          try { ctx.close(); } catch {}
        },
      };
    } catch { /* ignore */ }
  }, []);


  const cleanup = useCallback(() => {
    Object.values(peersRef.current).forEach((p) => {
      try { p.pc.close(); } catch {}
      if (p.audioEl) { try { p.audioEl.pause(); p.audioEl.remove(); } catch {} }
    });
    peersRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
    if (ringHeartbeatRef.current) {
      window.clearInterval(ringHeartbeatRef.current);
      ringHeartbeatRef.current = null;
    }
    if (ringChannelRef.current) {
      const rc = ringChannelRef.current;
      const cid = callIdRef.current;
      try {
        if (cid) {
          // Laisse le temps au signal d'annulation de partir avant de fermer le canal
          rc.send({ type: "broadcast", event: "ring-cancel", payload: { callId: cid, from: userId } });
          window.setTimeout(() => { try { supabase.removeChannel(rc); } catch { /* noop */ } }, 400);
        } else {
          supabase.removeChannel(rc);
        }
      } catch { /* noop */ }
      ringChannelRef.current = null;
    }

    callIdRef.current = "";
    setParticipants([]);
    setSpeaking({});
    setJoined(false);
    stopRingback();
  }, [stopRingback, userId]);

  useEffect(() => () => cleanup(), [cleanup]);
  useEffect(() => { onJoinedChange?.(joined); }, [joined, onJoinedChange]);

  // Ringback: play while alone in the room
  useEffect(() => {
    if (!joined) { stopRingback(); return; }
    if (participants.length <= 1) startRingback();
    else stopRingback();
  }, [joined, participants, startRingback, stopRingback]);


  // Monitor speaking via local audio level (simple)
  const monitorLevel = (stream: MediaStream, id: string) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let raf = 0;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setSpeaking((s) => (s[id] === avg > 18 ? s : { ...s, [id]: avg > 18 }));
        raf = requestAnimationFrame(tick);
      };
      tick();
      return () => { cancelAnimationFrame(raf); try { ctx.close(); } catch {} };
    } catch { return () => {}; }
  };

  const createPeer = useCallback((peerId: string, initiator: boolean) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];
    const pc = new RTCPeerConnection(ICE);
    const state: PeerState = { pc };
    peersRef.current[peerId] = state;

    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    pc.onicecandidate = (ev) => {
      if (ev.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "webrtc",
          payload: { from: userId, to: peerId, kind: "ice", data: ev.candidate.toJSON() },
        });
      }
    };
    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      state.stream = stream;
      const audio = document.createElement("audio");
      audio.autoplay = true;
      (audio as any).playsInline = true;
      audio.setAttribute("playsinline", "true");
      audioContainerRef.current?.appendChild(audio);
      audio.srcObject = stream;
      audio.play().catch(() => {
        // Autoplay was blocked; retry on next user interaction
        const retry = () => { audio.play().catch(() => {}); window.removeEventListener("pointerdown", retry); };
        window.addEventListener("pointerdown", retry, { once: true });
      });
      state.audioEl = audio;
      monitorLevel(stream, peerId);
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        try { pc.restartIce(); } catch {}
      }
    };

    if (initiator) {
      (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channelRef.current?.send({
            type: "broadcast",
            event: "webrtc",
            payload: { from: userId, to: peerId, kind: "offer", data: offer },
          });
        } catch (e) { console.warn("offer err", e); }
      })();
    }
    return state;
  }, [userId]);

  const join = async () => {
    setConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      localStreamRef.current = stream;
      monitorLevel(stream, userId);

      const channel = supabase.channel("chatsup_voice_room", { config: { presence: { key: userId } } });
      channelRef.current = channel;

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState() as Record<string, unknown>;
          const ids = Object.keys(state);
          setParticipants(ids);
          // Connect to existing participants (deterministic initiator: smaller id initiates)
          ids.forEach((pid) => {
            if (pid !== userId && !peersRef.current[pid]) {
              createPeer(pid, userId < pid);
            }
          });
          // Clean up peers no longer present
          Object.keys(peersRef.current).forEach((pid) => {
            if (!ids.includes(pid)) {
              try { peersRef.current[pid].pc.close(); } catch {}
              peersRef.current[pid].audioEl?.remove();
              delete peersRef.current[pid];
            }
          });
        })
        .on("broadcast", { event: "webrtc" }, async ({ payload }) => {
          if (payload.to !== userId) return;
          const from = payload.from as string;
          let state = peersRef.current[from];
          if (!state) state = createPeer(from, false);
          const pc = state.pc;
          try {
            if (payload.kind === "offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({ type: "broadcast", event: "webrtc", payload: { from: userId, to: from, kind: "answer", data: answer } });
            } else if (payload.kind === "answer") {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
            } else if (payload.kind === "ice") {
              await pc.addIceCandidate(new RTCIceCandidate(payload.data));
            }
          } catch (e) { console.warn("webrtc err", e); }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ user_id: userId, joined_at: Date.now() });
            setJoined(true);

            // Reserve or reuse the active DB room (single-active-call constraint)
            const room = await startRoom();
            const callId = room?.id || `${userId}-${Date.now()}`;
            callIdRef.current = callId;

            // Broadcast ring signal — only when we're the initiator of a *new* room
            const iAmInitiator = room?.initiated_by === userId;
            const rc = supabase.channel("chatsup_voice_ring", { config: { broadcast: { self: false } } });
            ringChannelRef.current = rc;
            rc.on("broadcast", { event: "call-declined" }, ({ payload }) => {
              if (payload?.callId !== callId) return;
              stopRingback();
              if (ringHeartbeatRef.current) { window.clearInterval(ringHeartbeatRef.current); ringHeartbeatRef.current = null; }
              toast.info("Appel refusé");
            });
            rc.subscribe((st) => {
              if (st === "SUBSCRIBED" && iAmInitiator) {
                const ring = () =>
                  rc.send({ type: "broadcast", event: "ring", payload: { callId, from: userId } });
                ring();
                // Battement de cœur : le destinataire ferme l'appel entrant dès qu'il s'arrête
                if (ringHeartbeatRef.current) window.clearInterval(ringHeartbeatRef.current);
                ringHeartbeatRef.current = window.setInterval(ring, 3000);
              }
            });

          }
        });
    } catch (e: any) {
      toast.error(e?.message || "Micro indisponible");
    } finally {
      setConnecting(false);
    }
  };

  const leave = async () => {
    const wasInitiator = activeRoom?.initiated_by === userId;
    const wasAlone = participants.length <= 1;
    cleanup();
    // Only the initiator ends the room when the last participant leaves
    if (wasInitiator && wasAlone) {
      try { await endRoom(); } catch { /* ignore */ }
    }
    onClose();
  };

  const toggleMute = () => {
    const enabled = muted; // becoming unmuted if was muted
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setMuted(!muted);
  };

  const allIds = joined ? Array.from(new Set([userId, ...participants])) : [];

  return (
    <>
      {/* Audio elements must stay mounted even when the panel is hidden so the call keeps playing. */}
      <div ref={audioContainerRef} className="hidden" />
      {open && (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>

      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-gradient-to-br from-slate-900 via-slate-950 to-black border-t sm:border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ animation: "sheet-up 0.35s cubic-bezier(0.16,1,0.3,1)" }}
      >
        <div className="relative p-5 border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-violet-500/10" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Appel vocal · J&H Chats</h2>
                <p className="text-[11px] text-white/60 flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> {joined ? `${allIds.length} participant${allIds.length > 1 ? "s" : ""}` : "Salon de groupe"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>

        <div className="p-5 min-h-[220px]">
          {!joined ? (
            <div className="text-center py-6">
              <div className="relative mx-auto w-24 h-24 mb-4">
                <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-2xl animate-pulse" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl">
                  <Phone className="w-10 h-10 text-white" />
                </div>
              </div>
              <p className="text-sm text-white/70 mb-5">
                {activeRoom
                  ? "Un appel de groupe est déjà en cours. Rejoignez la conversation vocale."
                  : "Lancez un salon vocal de groupe. Tous les membres connectés recevront une notification d'appel entrant."}
              </p>
              <button
                onClick={join}
                disabled={connecting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:brightness-110 text-white font-bold shadow-lg disabled:opacity-50 active:scale-[0.98] transition"
              >
                <Phone className="w-4 h-4" />
                {connecting ? "Connexion..." : activeRoom ? "Rejoindre l'appel" : "Lancer un appel"}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {allIds.map((id) => {
                  const p = profiles[id];
                  const isMe = id === userId;
                  const isSpeaking = !!speaking[id] && !(isMe && muted);
                  return (
                    <div key={id} className="flex flex-col items-center gap-1.5">
                      <div className={`relative w-16 h-16 rounded-full overflow-hidden ring-2 transition ${isSpeaking ? "ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]" : "ring-white/10"}`}>
                        {p?.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-blue-500 text-white text-sm font-bold">
                            {initials(displayName(p))}
                          </div>
                        )}
                        {isMe && muted && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <MicOff className="w-5 h-5 text-rose-400" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-white/70 truncate max-w-[70px]">{isMe ? "Vous" : displayName(p)}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${muted ? "bg-rose-500/20 border border-rose-400/40 text-rose-300" : "bg-white/10 border border-white/20 text-white hover:bg-white/15"}`}
                >
                  {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  onClick={leave}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-red-600 hover:brightness-110 text-white flex items-center justify-center shadow-[0_10px_30px_-5px_rgba(244,63,94,0.6)] active:scale-95 transition"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
              <p className="text-center text-[10px] text-white/40 mt-4">Appel P2P chiffré · Aucun enregistrement</p>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes sheet-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
      )}
    </>
  );
}

