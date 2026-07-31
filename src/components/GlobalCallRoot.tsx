import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/contexts/CallContext";
import VoiceCallPanel from "@/components/VoiceCallPanel";
import IncomingCallOverlay, { type IncomingCall } from "@/components/IncomingCallOverlay";
import { startRingtone } from "@/lib/notificationSound";
import { Phone } from "lucide-react";

type Profile = {
  user_id: string;
  name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

type CallRow = {
  id: string;
  caller_id: string;
  callee_id: string;
  status: string;
  created_at: string;
};

/**
 * Persistent global root for the voice call panel.
 * - Keeps the call alive across navigation.
 * - Shows a floating pill to reopen the panel when minimized.
 * - Affiche une notification d'appel entrant (sonnerie + accepter/refuser)
 *   sur toutes les pages de l'application.
 */
export default function GlobalCallRoot() {
  const { user } = useAuth();
  const { panelOpen, active, activeRoom, openPanel, closePanel, setActive } = useCall();
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const handledRef = useRef<Set<string>>(new Set());
  const stopRingRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id,name,full_name,avatar_url")
        .limit(500);
      if (!alive) return;
      const map: Record<string, Profile> = {};
      (data || []).forEach((p: Profile) => { map[p.user_id] = p; });
      setProfiles(map);
    })();
    return () => { alive = false; };
  }, [user]);

  // Détection des appels entrants (partout dans l'application).
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`incoming-calls-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "voice_calls" },
        (payload) => {
          const row = payload.new as CallRow;
          if (row.caller_id === user.id) return;
          if (row.status !== "active") return;
          if (handledRef.current.has(row.id)) return;
          if (Date.now() - new Date(row.created_at).getTime() > 60_000) return;
          handledRef.current.add(row.id);
          const p = profiles[row.caller_id];
          setIncoming({
            id: row.id,
            callerId: row.caller_id,
            callerName: p?.full_name || p?.name || "Un joueur",
            avatarUrl: p?.avatar_url ?? null,
          });
        }
      )
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch { /* noop */ } };
  }, [user, profiles]);

  // Sonnerie audible pendant l'appel entrant.
  useEffect(() => {
    if (!incoming) {
      stopRingRef.current?.();
      stopRingRef.current = null;
      return;
    }
    try { stopRingRef.current = startRingtone(); } catch { /* noop */ }
    return () => { stopRingRef.current?.(); stopRingRef.current = null; };
  }, [incoming]);

  if (!user) return null;

  const showJoinPill = !!activeRoom && !active && !panelOpen;

  const acceptCall = (c: IncomingCall) => {
    setIncoming(null);
    openPanel();
  };
  const finishCall = async (c: IncomingCall, status: "declined" | "missed") => {
    setIncoming(null);
    try {
      await supabase
        .from("voice_calls")
        .update({ status, ended_at: new Date().toISOString() })
        .eq("id", c.id)
        .eq("status", "active");
    } catch { /* noop */ }
  };

  return (
    <>
      <IncomingCallOverlay
        call={incoming}
        onAccept={acceptCall}
        onDecline={(c) => void finishCall(c, "declined")}
        onMissed={(c) => void finishCall(c, "missed")}
      />
      <VoiceCallPanel
        open={panelOpen}
        onClose={closePanel}
        userId={user.id}
        profiles={profiles}
        onJoinedChange={setActive}
      />
      {active && !panelOpen && (
        <button
          onClick={openPanel}
          className="fixed bottom-24 right-4 z-[55] flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold shadow-2xl border border-white/20 animate-pulse"
          aria-label="Reprendre l'appel en cours"
        >
          <Phone className="w-4 h-4" />
          Appel en cours
        </button>
      )}
      {showJoinPill && (
        <button
          onClick={openPanel}
          className="fixed bottom-24 right-4 z-[55] flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white text-sm font-bold shadow-2xl border border-white/20 animate-pulse"
          aria-label="Rejoindre l'appel en cours"
        >
          <Phone className="w-4 h-4" />
          Rejoindre l'appel
        </button>
      )}
    </>
  );
}
