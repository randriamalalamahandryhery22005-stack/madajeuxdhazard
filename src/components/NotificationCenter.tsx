import { useState, useEffect } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  is_global: boolean;
  created_at: string;
}

const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .or(`is_global.eq.true,target_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifs();

    const ch = supabase
      .channel("notif-center-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload) => {
        fetchNotifs();
        if (payload.eventType === "INSERT") {
          const n = payload.new as Notification;
          toast.info(n.title, { description: n.message, duration: 5000 });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    if (!user) return;
    // We can only mark global ones - update via admin
    // For now just clear local state
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs}h`;
    return `Il y a ${Math.floor(hrs / 24)}j`;
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-secondary/80 hover:bg-primary/10 transition-all active:scale-95 border border-border/30"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 max-h-[400px] rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-secondary/30">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Notifications
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{unreadCount}</span>
                )}
              </h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors" title="Tout marquer comme lu">
                    <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[340px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">Aucune notification</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-border/20 transition-colors ${
                      !n.is_read ? "bg-primary/5" : "hover:bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? "bg-primary animate-pulse" : "bg-muted-foreground/20"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{n.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[9px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
