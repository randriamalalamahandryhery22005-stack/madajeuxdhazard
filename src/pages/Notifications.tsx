import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Bell, CheckCheck, Trash2, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  is_global: boolean;
  target_user_id: string | null;
  created_at: string;
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Il y a ${days} j`;
  return new Date(dateStr).toLocaleDateString();
};

const READ_KEY = "jh.notifs.read.v1";
const HIDDEN_KEY = "jh.notifs.hidden.v1";

const loadSet = (key: string): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(window.localStorage.getItem(key) || "[]")); }
  catch { return new Set(); }
};
const saveSet = (key: string, s: Set<string>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(s)));
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readSet, setReadSet] = useState<Set<string>>(() => loadSet(READ_KEY));
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(() => loadSet(HIDDEN_KEY));

  const persistRead = (s: Set<string>) => { setReadSet(new Set(s)); saveSet(READ_KEY, s); };
  const persistHidden = (s: Set<string>) => { setHiddenSet(new Set(s)); saveSet(HIDDEN_KEY, s); };

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`is_global.eq.true,target_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(100);
    setLoading(false);
    if (error) { toast.error("Erreur de chargement"); return; }
    setItems((data as Notification[]) || []);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (!user) return;
    fetchAll();
    const ch = supabase
      .channel("notif-page-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, authLoading, navigate, fetchAll]);

  const isRead = (n: Notification) => n.is_read || readSet.has(n.id);
  const visible = items.filter((n) => !hiddenSet.has(n.id));
  const unreadCount = visible.filter((n) => !isRead(n)).length;

  const markRead = async (n: Notification) => {
    if (isRead(n)) return;
    if (n.target_user_id === user?.id) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    const next = new Set(readSet); next.add(n.id); persistRead(next);
  };

  const markAllRead = async () => {
    const next = new Set(readSet);
    for (const n of visible) next.add(n.id);
    persistRead(next);
    if (user) {
      await supabase.from("notifications").update({ is_read: true }).eq("target_user_id", user.id).eq("is_read", false);
    }
    toast.success("Toutes marquées comme lues");
  };

  const removeOne = async (n: Notification) => {
    const next = new Set(hiddenSet); next.add(n.id); persistHidden(next);
    if (n.target_user_id === user?.id && !n.is_global) {
      await supabase.from("notifications").delete().eq("id", n.id);
    }
    toast.success("Notification supprimée");
  };

  const clearAll = async () => {
    if (!visible.length) return;
    const next = new Set(hiddenSet);
    for (const n of visible) next.add(n.id);
    persistHidden(next);
    if (user) {
      await supabase.from("notifications").delete().eq("target_user_id", user.id);
    }
    toast.success("Notifications effacées");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-secondary/60"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notifications
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/15">
              <CheckCheck className="w-3.5 h-3.5 inline mr-1" /> Tout lu
            </button>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Aucune notification</p>
            <p className="text-xs mt-1">Vous serez alerté en temps réel ici.</p>
          </div>
        ) : (
          <>
            {visible.map((n) => {
              const read = isRead(n);
              return (
                <div
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`group rounded-2xl border p-3 transition cursor-pointer ${
                    read
                      ? "border-border/30 bg-card/50"
                      : "border-primary/30 bg-primary/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${read ? "bg-secondary/60 text-muted-foreground" : "bg-primary/15 text-primary"}`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{n.title}</p>
                        {!read && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1.5">{timeAgo(n.created_at)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeOne(n); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition opacity-60 group-hover:opacity-100"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={clearAll}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Tout effacer
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
