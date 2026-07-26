import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ActiveRoom = {
  id: string;
  initiated_by: string;
  status: string;
  started_at: string;
};

type VoiceCallRow = {
  id: string;
  caller_id: string;
  callee_id: string;
  status: string;
  started_at: string | null;
  created_at: string;
};

const toRoom = (r: VoiceCallRow | null | undefined): ActiveRoom | null =>
  r ? { id: r.id, initiated_by: r.caller_id, status: r.status, started_at: r.started_at ?? r.created_at } : null;

type Ctx = {
  panelOpen: boolean;
  active: boolean;                  // I am currently joined in the call
  activeRoom: ActiveRoom | null;    // Any live room (mine or someone else's)
  openPanel: () => void;
  closePanel: () => void;
  setActive: (v: boolean) => void;
  startRoom: () => Promise<ActiveRoom | null>;
  endRoom: () => Promise<void>;
};

const CallCtx = createContext<Ctx>({
  panelOpen: false,
  active: false,
  activeRoom: null,
  openPanel: () => {},
  closePanel: () => {},
  setActive: () => {},
  startRoom: async () => null,
  endRoom: async () => {},
});

export const useCall = () => useContext(CallCtx);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  // Subscribe to voice_call_rooms and keep the current active one in sync
  useEffect(() => {
    if (!user) {
      setActiveRoom(null);
      return;
    }
    let alive = true;

    const refresh = async () => {
      const { data } = await supabase
        .from("voice_calls")
        .select("id,caller_id,callee_id,status,started_at,created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      setActiveRoom(toRoom(data as VoiceCallRow | null));
    };
    refresh();

    const channel = supabase
      .channel(`voice_calls_watch_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "voice_calls" },
        () => refresh()
      )
      .subscribe();

    return () => {
      alive = false;
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [user]);

  const startRoom = useCallback(async () => {
    if (!user) return null;
    const { data: existing } = await supabase
      .from("voice_calls")
      .select("id,caller_id,callee_id,status,started_at,created_at")
      .eq("status", "active")
      .maybeSingle();
    if (existing) return toRoom(existing as VoiceCallRow);
    const { data, error } = await supabase
      .from("voice_calls")
      .insert({ caller_id: user.id, callee_id: user.id, status: "active", started_at: new Date().toISOString() })
      .select("id,caller_id,callee_id,status,started_at,created_at")
      .maybeSingle();
    if (error) return null;
    return toRoom(data as VoiceCallRow | null);
  }, [user]);

  const endRoom = useCallback(async () => {
    if (!activeRoom) return;
    await supabase
      .from("voice_calls")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", activeRoom.id);
  }, [activeRoom]);

  return (
    <CallCtx.Provider value={{ panelOpen, active, activeRoom, openPanel, closePanel, setActive, startRoom, endRoom }}>
      {children}
    </CallCtx.Provider>
  );
}
