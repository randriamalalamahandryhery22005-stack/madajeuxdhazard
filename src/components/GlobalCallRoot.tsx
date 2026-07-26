import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/contexts/CallContext";
import VoiceCallPanel from "@/components/VoiceCallPanel";
import { Phone } from "lucide-react";

type Profile = {
  user_id: string;
  name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

/**
 * Persistent global root for the voice call panel.
 * - Keeps the call alive across navigation.
 * - Shows a floating pill to reopen the panel when minimized.
 * - Shows a "Rejoindre l'appel en cours" pill when someone else has an active room.
 */
export default function GlobalCallRoot() {
  const { user } = useAuth();
  const { panelOpen, active, activeRoom, openPanel, closePanel, setActive } = useCall();
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

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
      (data || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    })();
    return () => { alive = false; };
  }, [user]);

  if (!user) return null;

  const showJoinPill = !!activeRoom && !active && !panelOpen;

  return (
    <>
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
