import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SecurityChatPanel from "@/components/SecurityChatPanel";
import { ensureSecurityConversation, listAccountDevices, unblockAccount, PREMIUM_DEVICE_LIMIT } from "@/lib/accountSecurity";
import { toast } from "sonner";
import { ShieldAlert, Smartphone, Unlock, MessageSquare, XCircle } from "lucide-react";

type Row = {
  user_id: string;
  full_name: string | null;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: string;
};

/** Panneau d'administration : comptes bloqués par la sécurité Premium. */
export default function AdminSecurityPanel() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [devices, setDevices] = useState<Record<string, number>>({});
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id,full_name,name,email,avatar_url,status")
      .eq("status", "blocked");
    const list = (data || []) as Row[];
    setRows(list);
    const counts: Record<string, number> = {};
    await Promise.all(list.map(async (r) => { counts[r.user_id] = (await listAccountDevices(r.user_id)).length; }));
    setDevices(counts);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`admin-security-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch { /* noop */ } };
  }, []);

  const openConversation = async (r: Row) => {
    const id = await ensureSecurityConversation(r.user_id, r.full_name || r.name || "Compte Premium");
    setConvId(id);
    setOpenChat(r.user_id);
  };

  const doUnblock = async (r: Row) => {
    await unblockAccount(r.user_id);
    await supabase.from("notifications").insert({
      title: "Compte réactivé",
      message: "Votre compte Premium a été réactivé par l'administrateur.",
      is_global: false,
      target_user_id: r.user_id,
      created_by: user?.id ?? null,
    });
    toast.success("Compte débloqué");
    load();
  };

  const doRefuse = async (r: Row) => {
    await supabase.from("notifications").insert({
      title: "Réactivation refusée",
      message: "Votre demande de réactivation a été refusée. Contactez l'administrateur dans le chat de sécurité.",
      is_global: false,
      target_user_id: r.user_id,
      created_by: user?.id ?? null,
    });
    toast.info("Refus notifié à l'utilisateur");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-rose-400" />
        <h2 className="text-sm font-bold">Sécurité Premium · comptes bloqués</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Blocage automatique au-delà de {PREMIUM_DEVICE_LIMIT} appareils distincts pour un compte Premium.
      </p>
      {loading && <p className="text-sm text-muted-foreground">Chargement...</p>}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun compte bloqué actuellement.</p>
      )}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.user_id} className="rounded-xl border border-border/40 bg-card/60 p-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs font-bold">
                {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : (r.full_name || r.name || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.full_name || r.name}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Smartphone className="w-3 h-3" /> {devices[r.user_id] ?? "…"} appareils · {r.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => doUnblock(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                <Unlock className="w-3.5 h-3.5" /> Débloquer
              </button>
              <button onClick={() => doRefuse(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-400/30 text-rose-300 text-xs font-semibold">
                <XCircle className="w-3.5 h-3.5" /> Refuser
              </button>
              <button onClick={() => openConversation(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold">
                <MessageSquare className="w-3.5 h-3.5" /> Chat privé
              </button>
            </div>
            {openChat === r.user_id && convId && user && (
              <SecurityChatPanel conversationId={convId} meId={user.id} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
