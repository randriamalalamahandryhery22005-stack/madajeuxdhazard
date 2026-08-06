import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trophy, UserPlus, User as UserIcon } from "lucide-react";
import { WIN_REASON } from "@/hooks/useDashboardStats";

type Kind = "accounts" | "wins";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kind: Kind;
}

interface Row {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  when: string;
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
};

const StatsDetailDialog = ({ open, onOpenChange, kind }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;

    const fetchData = async () => {
      setLoading((prev) => (rows.length === 0 ? true : prev));

      if (kind === "accounts") {
        const { data } = await supabase
          .from("public_profiles")
          .select("user_id, full_name, name, avatar_url, created_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (!active) return;
        setRows(
          (data || []).map((p: any) => ({
            id: p.user_id,
            user_id: p.user_id,
            full_name: p.full_name || p.name,
            avatar_url: p.avatar_url,
            when: p.created_at,
          })),
        );
      } else {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: pts } = await supabase
          .from("user_points")
          .select("id, user_id, created_at")
          .eq("reason", WIN_REASON)
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false })
          .limit(100);

        const ids = Array.from(new Set((pts || []).map((r: any) => r.user_id))) as string[];
        const map = new Map<string, { full_name: string | null; avatar_url: string | null }>();
        if (ids.length) {
          const { data: profs } = await supabase
            .from("public_profiles")
            .select("user_id, full_name, name, avatar_url")
            .in("user_id", ids);
          (profs || []).forEach((p: any) =>
            map.set(p.user_id, { full_name: p.full_name || p.name, avatar_url: p.avatar_url }),
          );
        }
        if (!active) return;
        setRows(
          (pts || []).map((r: any) => ({
            id: r.id,
            user_id: r.user_id,
            full_name: map.get(r.user_id)?.full_name ?? null,
            avatar_url: map.get(r.user_id)?.avatar_url ?? null,
            when: r.created_at,
          })),
        );
      }
      setLoading(false);
    };

    fetchData();
    const table = kind === "accounts" ? "profiles" : "user_points";
    const suffix = Math.random().toString(36).slice(2, 8);
    const ch = supabase
      .channel(`stats-detail-${kind}-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, fetchData)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind]);

  const title = kind === "accounts" ? "Comptes enregistrés" : "Prédictions gagnées (24 h)";
  const Icon = kind === "accounts" ? UserPlus : Trophy;
  const tint =
    kind === "accounts"
      ? { bg: "bg-emerald-500/15", border: "border-emerald-400/30", text: "text-emerald-300" }
      : { bg: "bg-amber-500/15", border: "border-amber-400/30", text: "text-amber-300" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-slate-950 border border-white/10">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className={`w-8 h-8 rounded-full ${tint.bg} border ${tint.border} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${tint.text}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-[10px] font-normal text-slate-400">
                {rows.length.toLocaleString("fr-FR")} entrée{rows.length > 1 ? "s" : ""}
                {kind === "wins" ? " · réinitialisation auto après 24 h" : ""}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              {kind === "accounts" ? "Aucun compte enregistré." : "Aucune prédiction gagnée récente."}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {rows.map((r) => {
                const name = r.full_name || "Utilisateur";
                const initial = name.trim().charAt(0).toUpperCase() || "?";
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                      {r.avatar_url ? (
                        <img
                          src={r.avatar_url}
                          alt={name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          draggable={false}
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-300">{initial || <UserIcon className="w-5 h-5" />}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{name}</p>
                      <p className="text-[10px] text-slate-500">{timeAgo(r.when)}</p>
                    </div>
                    {kind === "wins" && (
                      <span className={`text-[10px] font-bold ${tint.text} shrink-0`}>WIN</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StatsDetailDialog;
