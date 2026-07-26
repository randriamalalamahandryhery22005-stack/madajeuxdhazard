import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User as UserIcon, Wifi, Crown, MapPin } from "lucide-react";

interface OnlineRow {
  user_id: string;
  last_ping: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    name: string | null;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
    country_code: string | null;
  };
  isPremium?: boolean;
}

const AdminOnlineUsersPanel = () => {
  const [rows, setRows] = useState<OnlineRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: online } = await supabase
        .from("online_users")
        .select("user_id, last_ping, updated_at")
        .order("last_ping", { ascending: false })
        .limit(200);

      const userIds = (online || []).map((o: any) => o.user_id);
      if (userIds.length === 0) {
        setRows([]);
      } else {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, name, avatar_url, email, phone, country_code")
          .in("user_id", userIds);
        const { data: coins } = await supabase
          .from("user_coins")
          .select("user_id, plan_type, balance")
          .in("user_id", userIds);

        const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        const coinsMap = new Map((coins || []).map((c: any) => [c.user_id, c]));

        setRows(
          (online || []).map((o: any) => {
            const c = coinsMap.get(o.user_id) as any;
            return {
              ...o,
              profile: profMap.get(o.user_id) as any,
              isPremium: c?.plan_type === "premium" && Number(c?.balance) > 0,
            };
          }),
        );
      }

      const { count } = await supabase
        .from("profiles")
        .select("user_id", { count: "exact", head: true });
      setTotalUsers(count || 0);
    };

    fetchData();

    const channel = supabase
      .channel("admin-online-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "online_users" }, () => {
        fetchData();
      })
      .subscribe();

    const interval = setInterval(fetchData, 15000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-transparent">
          <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider font-bold mb-1">
            <Wifi className="w-3 h-3" /> En ligne
          </div>
          <p className="text-3xl font-black gold-text">{rows.length}</p>
        </div>
        <div className="rounded-2xl p-4 border border-border/40 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider font-bold mb-1">
            <UserIcon className="w-3 h-3" /> Total
          </div>
          <p className="text-3xl font-black">{totalUsers}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
          Sessions actives
        </h3>
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucun utilisateur en ligne actuellement.
          </p>
        )}
        <ul className="space-y-2">
          {rows.map((r) => {
            const name = r.profile?.full_name || r.profile?.name || "Utilisateur";
            return (
              <li
                key={r.user_id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40"
              >
                <div className="relative shrink-0">
                  {r.profile?.avatar_url ? (
                    <img
                      src={r.profile.avatar_url}
                      alt={name}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate">{name}</p>
                    {r.isPremium && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[8px] uppercase font-bold">
                        <Crown className="w-2.5 h-2.5" /> Premium
                      </span>
                    )}
                    {!r.isPremium && (
                      <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[8px] uppercase font-bold">
                        Free
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate font-mono">
                    {r.profile?.email || r.profile?.phone || "—"}
                  </p>
                  {r.profile?.country_code && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> {r.profile.country_code}
                    </p>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground">
                  {new Date(r.last_ping).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default AdminOnlineUsersPanel;
