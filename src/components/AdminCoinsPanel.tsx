import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Coins, TrendingDown, TrendingUp, Wallet, Gamepad2, Crown, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CoinsRow {
  user_id: string;
  balance: number | string;
  total_granted: number | string;
  total_consumed: number | string;
  plan_type: string;
  plan_expires_at: string | null;
  consumption_rate_per_hour: number | string;
}
interface Profile { user_id: string; full_name: string | null; avatar_url: string | null; }
interface UsageRow { user_id: string; game_name: string; used_at: string; }

const GAMES = ["aviator-premium", "jetx", "cosmox", "virtuel", "aviator-studio", "aviator-spribe"];
const GAME_LABEL: Record<string, string> = {
  "aviator-premium": "Aviator", jetx: "JetX", cosmox: "CosmoX", virtuel: "Virtuel",
  "aviator-studio": "Studio", "aviator-spribe": "Spribe",
};

const AdminCoinsPanel = () => {
  const [coins, setCoins] = useState<CoinsRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [query, setQuery] = useState("");

  const load = async () => {
    const [c, p, u] = await Promise.all([
      supabase.from("user_coins").select("*"),
      supabase.from("profiles").select("user_id, full_name, avatar_url"),
      supabase.from("game_usage").select("user_id, game_name, used_at"),
    ]);
    setCoins((c.data as any) || []);
    setProfiles((p.data as any) || []);
    setUsage((u.data as any) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-coins")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_coins" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_usage" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const profMap = useMemo(() => new Map(profiles.map(p => [p.user_id, p])), [profiles]);

  const totals = useMemo(() => {
    let granted = 0, consumed = 0, balance = 0, premium = 0;
    coins.forEach(c => {
      granted += Number(c.total_granted);
      consumed += Number(c.total_consumed);
      balance += Number(c.balance);
      if (c.plan_type === "premium" && Number(c.balance) > 0) premium++;
    });
    return { granted, consumed, balance, premium };
  }, [coins]);

  const usageByGame = useMemo(() => {
    const stats: Record<string, { count: number; users: Set<string>; last: string | null }> = {};
    GAMES.forEach(g => stats[g] = { count: 0, users: new Set(), last: null });
    usage.forEach(u => {
      const key = GAMES.includes(u.game_name) ? u.game_name : null;
      if (!key) return;
      stats[key].count++;
      stats[key].users.add(u.user_id);
      if (!stats[key].last || u.used_at > stats[key].last!) stats[key].last = u.used_at;
    });
    return stats;
  }, [usage]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coins;
    return coins.filter(c => {
      const p = profMap.get(c.user_id);
      return p?.full_name?.toLowerCase().includes(q) || c.user_id.includes(q);
    });
  }, [coins, profMap, query]);

  const exportCsv = () => {
    const rows = [
      ["user_id", "full_name", "plan", "balance", "granted", "consumed", "rate/h", "expires"],
      ...coins.map(c => [
        c.user_id,
        profMap.get(c.user_id)?.full_name || "",
        c.plan_type,
        c.balance, c.total_granted, c.total_consumed, c.consumption_rate_per_hour,
        c.plan_expires_at || "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `coins-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Distribués", value: totals.granted.toLocaleString(), icon: TrendingUp, accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/30" },
          { label: "Consommés", value: totals.consumed.toLocaleString(), icon: TrendingDown, accent: "from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/30" },
          { label: "Restants", value: totals.balance.toLocaleString(), icon: Wallet, accent: "from-primary/20 to-primary/5 text-primary border-primary/30" },
          { label: "Premium actifs", value: totals.premium.toString(), icon: Crown, accent: "from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/30" },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border bg-gradient-to-br ${k.accent} p-4 backdrop-blur`}>
            <div className="flex items-center justify-between mb-2">
              <k.icon className="w-4 h-4 opacity-80" />
              <Coins className="w-3 h-3 opacity-50" />
            </div>
            <p className="text-2xl font-black">{k.value}</p>
            <p className="text-[10px] uppercase tracking-wider opacity-80 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Per-game history */}
      <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Historique par jeu</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3">
          {GAMES.map(g => {
            const s = usageByGame[g];
            return (
              <div key={g} className="rounded-xl border border-border/30 bg-background/40 p-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{GAME_LABEL[g]}</p>
                <p className="text-xl font-black">{s.count}</p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{s.users.size} joueur{s.users.size > 1 ? "s" : ""}</span>
                  {s.last && <span>{new Date(s.last).toLocaleDateString("fr-FR")}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User table */}
      <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-sm flex-1">Utilisateurs ({filtered.length})</h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher..."
              className="h-9 pl-9 w-48 text-xs" />
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} className="h-9">
            <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50 sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold">Utilisateur</th>
                <th className="px-3 py-2 font-semibold">Plan</th>
                <th className="px-3 py-2 font-semibold text-right">Solde</th>
                <th className="px-3 py-2 font-semibold text-right">Consommé</th>
                <th className="px-3 py-2 font-semibold text-right">Taux/h</th>
                <th className="px-3 py-2 font-semibold">Expire</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const p = profMap.get(c.user_id);
                return (
                  <tr key={c.user_id} className="border-t border-border/20 hover:bg-secondary/30">
                    <td className="px-3 py-2 flex items-center gap-2">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/15" />
                      )}
                      <span className="font-medium truncate max-w-[140px]">{p?.full_name || "—"}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        c.plan_type === "premium"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-secondary text-muted-foreground border border-border/40"
                      }`}>{c.plan_type}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-primary">{Math.floor(Number(c.balance))}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{Math.floor(Number(c.total_consumed))}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(c.consumption_rate_per_hour) || 0}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {c.plan_expires_at ? new Date(c.plan_expires_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Aucun résultat</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCoinsPanel;
