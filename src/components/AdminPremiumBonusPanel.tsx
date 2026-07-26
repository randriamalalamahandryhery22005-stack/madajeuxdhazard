import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Crown, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Profile { user_id: string; name: string | null; full_name: string | null; email?: string | null; avatar_url: string | null; }
interface Bonus {
  id: string;
  user_id: string;
  days: number;
  granted_at: string;
  expires_at: string;
  reason: string | null;
  is_active: boolean;
}

const formatDate = (d: string) => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

const AdminPremiumBonusPanel = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: profs }, { data: bs }] = await Promise.all([
      supabase.from("profiles").select("user_id,name,full_name,email,avatar_url").order("created_at", { ascending: false }),
      supabase.from("premium_bonuses").select("*").order("granted_at", { ascending: false }),
    ]);
    setProfiles((profs as any) || []);
    setBonuses((bs as any) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-premium-bonuses")
      .on("postgres_changes", { event: "*", schema: "public", table: "premium_bonuses" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles.slice(0, 30);
    return profiles
      .filter((p) => (p.full_name || p.name || p.email || "").toLowerCase().includes(q))
      .slice(0, 30);
  }, [profiles, query]);

  const grant = async () => {
    if (!user || !selected) return toast.error("Sélectionnez un utilisateur");
    if (days < 1 || days > 5) return toast.error("La durée doit être entre 1 et 5 jours");
    setSaving(true);
    try {
      const expires = new Date();
      expires.setDate(expires.getDate() + days);
      const { error } = await supabase.from("premium_bonuses").insert({
        user_id: selected.user_id,
        days,
        expires_at: expires.toISOString(),
        granted_by: user.id,
        reason: reason.trim() || null,
        is_active: true,
      });
      if (error) throw error;
      toast.success(`Bonus Premium de ${days} jour${days > 1 ? "s" : ""} accordé`);
      setSelected(null);
      setReason("");
      setDays(1);
      setQuery("");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (b: Bonus) => {
    if (!confirm("Révoquer ce bonus ?")) return;
    await supabase.from("premium_bonuses").update({ is_active: false, expires_at: new Date().toISOString() }).eq("id", b.id);
    toast.success("Bonus révoqué");
  };

  const now = Date.now();
  const active = bonuses.filter((b) => b.is_active && new Date(b.expires_at).getTime() > now);
  const expired = bonuses.filter((b) => !b.is_active || new Date(b.expires_at).getTime() <= now);
  const profileById = (id: string) => profiles.find((p) => p.user_id === id);

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-card border border-border/40 space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" /> Offrir un Bonus Premium
        </h3>

        <div>
          <Label className="text-xs text-muted-foreground">Utilisateur</Label>
          {selected ? (
            <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl border border-primary/30 bg-primary/10">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                {(selected.full_name || selected.name || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{selected.full_name || selected.name || selected.email}</p>
                <p className="text-[10px] text-muted-foreground truncate">{selected.email || selected.user_id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <div className="relative mt-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom ou email" className="h-10 pl-9" />
              </div>
              {query && (
                <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-border/40 divide-y divide-border/30">
                  {filtered.length === 0 && <p className="p-3 text-xs text-muted-foreground text-center">Aucun résultat</p>}
                  {filtered.map((p) => (
                    <button key={p.user_id} onClick={() => setSelected(p)} className="w-full text-left p-2.5 flex items-center gap-2 hover:bg-primary/5 transition">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                        {(p.full_name || p.name || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{p.full_name || p.name || p.email}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.email || p.user_id}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Durée (1 à 5 jours)</Label>
          <div className="grid grid-cols-5 gap-1.5 mt-2">
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`h-10 rounded-xl border font-bold text-sm transition ${days === d ? "border-primary bg-primary/15 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/30"}`}
              >
                {d}j
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Motif (optionnel)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex : cadeau de bienvenue" className="h-10 mt-1" />
        </div>

        <Button variant="premium" className="w-full" onClick={grant} disabled={saving || !selected}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crown className="w-4 h-4 mr-2" />}
          Accorder le bonus
        </Button>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">
          Bonus actifs ({active.length})
        </h3>
        {active.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun bonus actif.</p>}
        <ul className="space-y-2">
          {active.map((b) => {
            const p = profileById(b.user_id);
            return (
              <li key={b.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-emerald-500/30">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p?.full_name || p?.name || b.user_id}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.days}j · expire le {formatDate(b.expires_at)}
                  </p>
                  {b.reason && <p className="text-[10px] text-muted-foreground italic truncate">« {b.reason} »</p>}
                </div>
                <button onClick={() => revoke(b)} className="text-[10px] font-semibold px-2 py-1 rounded-lg text-destructive hover:bg-destructive/10">Révoquer</button>
              </li>
            );
          })}
        </ul>
      </div>

      {expired.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Historique ({expired.length})</h3>
          <ul className="space-y-1">
            {expired.slice(0, 20).map((b) => {
              const p = profileById(b.user_id);
              return (
                <li key={b.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 text-xs">
                  <span className="flex-1 truncate">{p?.full_name || p?.name || b.user_id}</span>
                  <span className="text-muted-foreground">{b.days}j · {formatDate(b.expires_at)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdminPremiumBonusPanel;
