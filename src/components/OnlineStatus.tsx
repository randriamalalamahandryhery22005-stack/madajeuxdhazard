import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import OnlineUsersDialog from "@/components/OnlineUsersDialog";

interface OnlineStatusProps {
  className?: string;
  compact?: boolean;
}

const OnlineStatus = ({ className = "", compact = false }: OnlineStatusProps) => {
  const [online, setOnline] = useState(true);
  const [count, setCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const fetchCount = async () => {
      const cutoff = new Date(Date.now() - 90_000).toISOString();
      const { count: c } = await supabase
        .from("online_users")
        .select("user_id", { count: "exact", head: true })
        .gte("last_ping", cutoff);
      if (c !== null) setCount(c);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 12_000);

    const ch = supabase
      .channel("online-status-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "online_users" }, fetchCount)
      .subscribe();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
      supabase.removeChannel(ch);
    };
  }, []);

  const openDialog = () => setDialogOpen(true);

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={openDialog}
          className={`flex items-center gap-1.5 rounded-full px-1 -mx-1 hover:bg-white/5 transition ${className}`}
          aria-label="Voir les utilisateurs en ligne"
        >
          <div className={`w-2 h-2 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-[10px] font-medium text-muted-foreground">
            {online ? `${count.toLocaleString()} en ligne` : "Hors ligne"}
          </span>
        </button>
        <OnlineUsersDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  }

  return (
    <>
      <div className={`flex items-center gap-3 ${className}`}>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
          online ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
        }`}>
          <div className={`w-2 h-2 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className={`text-[10px] font-semibold ${online ? "text-emerald-400" : "text-red-400"}`}>
            {online ? "En ligne" : "Hors ligne"}
          </span>
        </div>
        <button
          type="button"
          onClick={openDialog}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/50 border border-border/30 hover:bg-secondary/70 hover:border-border/60 transition cursor-pointer"
          aria-label="Voir les utilisateurs en ligne"
        >
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-bold text-foreground">{count.toLocaleString()}</span>
          <span className="text-[8px] text-muted-foreground">en direct</span>
        </button>
      </div>
      <OnlineUsersDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
};

export default OnlineStatus;
