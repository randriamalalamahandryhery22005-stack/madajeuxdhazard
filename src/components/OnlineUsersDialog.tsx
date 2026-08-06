import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User as UserIcon, Users } from "lucide-react";

interface OnlineUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OnlineUser {
  user_id: string;
  full_name: string | null;
  name: string | null;
  avatar_url: string | null;
}

const CUTOFF_MS = 90_000;

const OnlineUsersDialog = ({ open, onOpenChange }: OnlineUsersDialogProps) => {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;

    const fetchUsers = async () => {
      setLoading((prev) => (users.length === 0 ? true : prev));
      const cutoff = new Date(Date.now() - CUTOFF_MS).toISOString();
      const { data: online } = await supabase
        .from("online_users")
        .select("user_id, last_ping")
        .gte("last_ping", cutoff)
        .order("last_ping", { ascending: false })
        .limit(500);

      const ids = Array.from(new Set((online || []).map((o: any) => o.user_id))) as string[];
      if (ids.length === 0) {
        if (active) {
          setUsers([]);
          setLoading(false);
        }
        return;
      }

      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("user_id, full_name, name, avatar_url")
        .in("user_id", ids);

      const map = new Map<string, OnlineUser>();
      (profiles || []).forEach((p: any) => map.set(p.user_id, p));

      const ordered: OnlineUser[] = [];
      for (const id of ids) {
        const p = map.get(id);
        if (p) ordered.push(p);
        else ordered.push({ user_id: id, full_name: null, name: null, avatar_url: null });
      }

      if (active) {
        setUsers(ordered);
        setLoading(false);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 15_000);
    const ch = supabase
      .channel("online-users-dialog")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "online_users" },
        () => fetchUsers(),
      )
      .subscribe();

    return () => {
      active = false;
      clearInterval(interval);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-slate-950 border border-white/10">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Utilisateurs en ligne</span>
              <span className="text-[10px] font-normal text-slate-400">
                {users.length.toLocaleString()} compte{users.length > 1 ? "s" : ""} connecté{users.length > 1 ? "s" : ""}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Aucun utilisateur en ligne pour le moment.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {users.map((u) => {
                const name = u.full_name || u.name || "Utilisateur";
                const initial = name.trim().charAt(0).toUpperCase() || "?";
                return (
                  <li
                    key={u.user_id}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 select-none"
                    aria-disabled="true"
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 ring-1 ring-white/10 flex items-center justify-center">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={name}
                            className="w-full h-full object-cover pointer-events-none"
                            referrerPolicy="no-referrer"
                            draggable={false}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <UserIcon className="w-5 h-5 text-slate-400" />
                        )}
                        {!u.avatar_url && (
                          <span className="absolute text-sm font-semibold text-slate-300">{initial}</span>
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{name}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/10 bg-black/40">
          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            Liste informative uniquement. Vous ne pouvez pas ouvrir ces profils ni interagir avec ces utilisateurs.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnlineUsersDialog;
