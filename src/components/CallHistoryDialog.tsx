import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing } from "lucide-react";

type CallRow = {
  id: string;
  caller_id: string;
  callee_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

type Profile = { user_id: string; name?: string | null; full_name?: string | null };

const label = (r: CallRow) => {
  if (r.status === "declined") return "Refusé";
  if (r.status === "missed") return "Manqué";
  if (r.status === "active") return "En cours";
  return "Terminé";
};

const duration = (r: CallRow) => {
  if (!r.started_at || !r.ended_at) return null;
  const s = Math.max(0, Math.round((new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 1000));
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
};

/** Historique des appels vocaux. */
export default function CallHistoryDialog({
  open,
  onClose,
  userId,
  profiles,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  profiles: Record<string, Profile>;
}) {
  const [rows, setRows] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("voice_calls")
        .select("id,caller_id,callee_id,status,started_at,ended_at,created_at")
        .order("created_at", { ascending: false })
        .limit(80);
      if (!alive) return;
      setRows((data || []) as CallRow[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open]);

  const nameOf = (id: string) => {
    if (id === userId) return "Vous";
    const p = profiles[id];
    return p?.full_name || p?.name || "Joueur";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <PhoneCall className="w-4 h-4" /> Historique des appels
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-1.5">
          {loading && <p className="py-6 text-center text-sm text-slate-400">Chargement...</p>}
          {!loading && rows.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">Aucun appel enregistré.</p>
          )}
          {rows.map((r) => {
            const outgoing = r.caller_id === userId;
            const Icon = r.status === "missed" || r.status === "declined" ? PhoneMissed : outgoing ? PhoneOutgoing : PhoneIncoming;
            const d = duration(r);
            return (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                <Icon className={`w-4 h-4 shrink-0 ${r.status === "missed" || r.status === "declined" ? "text-rose-400" : "text-emerald-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{nameOf(r.caller_id)}</p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(r.created_at).toLocaleString()} · {label(r)}{d ? ` · ${d}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
