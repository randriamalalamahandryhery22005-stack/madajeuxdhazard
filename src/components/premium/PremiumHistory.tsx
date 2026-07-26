import { useMemo, useState } from "react";
import {
  CalendarCheck, CalendarX, Clock, Receipt, ImageIcon, ExternalLink, Loader2,
  Search, ArrowDownUp, Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePremiumHistory, type PremiumHistoryEntry } from "@/lib/premiumAccess";

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (v: string | null) =>
  v ? new Date(v).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

type StatusKind = "active" | "pending" | "expired" | "rejected";
const kindOf = (e: PremiumHistoryEntry): StatusKind => {
  if (e.rejection_reason) return "rejected";
  if (!e.granted_by) return "pending";
  if (e.expires_at && new Date(e.expires_at) < new Date()) return "expired";
  return "active";
};

const statusMeta: Record<StatusKind, { label: string; cls: string; Icon: typeof CalendarCheck }> = {
  active:   { label: "Actif",     cls: "bg-[hsl(var(--pm-green)/0.15)] text-[hsl(var(--pm-green))] border-[hsl(var(--pm-green)/0.4)]", Icon: CalendarCheck },
  pending:  { label: "En attente", cls: "bg-[hsl(var(--pm-gold)/0.15)] text-[hsl(var(--pm-gold))] border-[hsl(var(--pm-gold)/0.4)]", Icon: Clock },
  expired:  { label: "Expiré",    cls: "bg-white/5 text-slate-400 border-white/10", Icon: CalendarX },
  rejected: { label: "Rejeté",    cls: "bg-amber-500/15 text-amber-300 border-amber-500/40", Icon: CalendarX },
};

const planLabel = (e: PremiumHistoryEntry) => {
  if (e.game_mode === "premium-lifetime") return "Premium À Vie";
  if (e.days_requested >= 31) return `Premium ${e.days_requested} jours`;
  return `Premium ${e.days_requested}j`;
};

const printReceipt = (e: PremiumHistoryEntry) => {
  const win = window.open("", "_blank", "width=520,height=680");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reçu ${e.id.slice(0, 8)}</title>
  <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:28px;color:#111;background:#fff}
  h1{margin:0 0 4px;font-size:20px}small{color:#666}
  table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}
  td{padding:8px 4px;border-bottom:1px solid #eee}td:first-child{color:#666;width:45%}
  .total{font-size:18px;font-weight:800;color:#000}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#111;color:#fff;font-size:11px;margin-top:8px}
  </style></head><body>
  <h1>Reçu Premium</h1><small>Référence #${e.id.slice(0, 8).toUpperCase()}</small>
  <div class="badge">${statusMeta[kindOf(e)].label}</div>
  <table>
    <tr><td>Formule</td><td>${planLabel(e)}</td></tr>
    <tr><td>Durée</td><td>${e.game_mode === "premium-lifetime" ? "Illimité (à vie)" : `${e.days_requested} jours`}</td></tr>
    <tr><td>Date de demande</td><td>${fmtDateTime(e.granted_at)}</td></tr>
    <tr><td>Date d'expiration</td><td>${e.game_mode === "premium-lifetime" ? "—" : fmtDateTime(e.expires_at)}</td></tr>
    <tr><td class="total">Montant</td><td class="total">${e.price_amount.toLocaleString()} Ar</td></tr>
  </table>
  <p style="margin-top:24px;font-size:11px;color:#888">Merci pour votre confiance.</p>
  <script>window.onload=()=>{window.print()}</script>
  </body></html>`);
  win.document.close();
};

const PremiumHistory = () => {
  const { loading, entries } = usePremiumHistory();

  const [query, setQuery]   = useState("");
  const [status, setStatus] = useState<"all" | StatusKind>("all");
  const [sort, setSort]     = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  const filtered = useMemo(() => {
    let out = entries.slice();
    if (status !== "all") out = out.filter((e) => kindOf(e) === status);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter((e) =>
        planLabel(e).toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        String(e.price_amount).includes(q)
      );
    }
    out.sort((a, b) => {
      switch (sort) {
        case "date-asc":    return new Date(a.granted_at ?? 0).getTime() - new Date(b.granted_at ?? 0).getTime();
        case "amount-desc": return b.price_amount - a.price_amount;
        case "amount-asc":  return a.price_amount - b.price_amount;
        default:            return new Date(b.granted_at ?? 0).getTime() - new Date(a.granted_at ?? 0).getTime();
      }
    });
    return out;
  }, [entries, query, status, sort]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--pm-violet))]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pm-anim-fade">
      {/* Search + sort/filter toolbar */}
      <div className="pm-glass p-3 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (formule, référence, montant)…"
            className="pl-9 h-10 bg-black/30 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-[hsl(var(--pm-violet))] focus-visible:ring-[hsl(var(--pm-violet)/0.4)]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="h-9 bg-black/30 border-white/10 text-white text-xs">
              <span className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5 text-[hsl(var(--pm-blue))]" /> <SelectValue /></span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="expired">Expiré</SelectItem>
              <SelectItem value="rejected">Rejeté</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="h-9 bg-black/30 border-white/10 text-white text-xs">
              <span className="flex items-center gap-1.5"><ArrowDownUp className="w-3.5 h-3.5 text-[hsl(var(--pm-gold))]" /> <SelectValue /></span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Plus récent d'abord</SelectItem>
              <SelectItem value="date-asc">Plus ancien d'abord</SelectItem>
              <SelectItem value="amount-desc">Montant décroissant</SelectItem>
              <SelectItem value="amount-asc">Montant croissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </div>
      </div>

      {entries.length === 0 && (
        <div className="pm-glass p-8 text-center space-y-2">
          <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-white">Aucun historique pour le moment</p>
          <p className="text-xs text-slate-400">Vos abonnements et paiements apparaîtront ici après votre première souscription.</p>
        </div>
      )}

      {entries.length > 0 && filtered.length === 0 && (
        <div className="pm-glass p-6 text-center">
          <p className="text-sm font-semibold text-white">Aucun résultat</p>
          <p className="text-xs text-slate-400 mt-1">Essayez d'autres filtres ou une autre recherche.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Historique des abonnements</h2>
          <div className="space-y-2.5 pm-stagger">
            {filtered.map((e) => {
              const s = statusMeta[kindOf(e)];
              const SIcon = s.Icon;
              return (
                <div key={e.id} className="pm-glass p-3.5 hover:border-[hsl(var(--pm-violet)/0.5)] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl pm-gradient-primary flex items-center justify-center shadow-lg shrink-0">
                        <Receipt className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white truncate">{planLabel(e)}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {fmtDate(e.granted_at)} {e.game_mode === "premium-lifetime" ? "· accès permanent" : `→ ${fmtDate(e.expires_at)}`}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Réf. #{e.id.slice(0, 8).toUpperCase()}</div>
                      </div>
                    </div>
                    <Badge className={`border shrink-0 font-bold flex items-center gap-1 ${s.cls}`}>
                      <SIcon className="w-3 h-3" /> {s.label}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Montant</div>
                      <div className="text-sm font-black pm-text-gold">{e.price_amount.toLocaleString()} Ar</div>
                    </div>
                    <div className="flex gap-1.5">
                      {e.payment_proof_url && (
                        <a
                          href={e.payment_proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/30 hover:bg-black/50 text-slate-200 flex items-center gap-1 transition-colors"
                        >
                          <ImageIcon className="w-3 h-3" /> Preuve
                        </a>
                      )}
                      <Button
                        size="sm"
                        onClick={() => printReceipt(e)}
                        className="h-7 text-[10px] px-2.5 pm-gradient-primary text-white border-0 hover:opacity-90 pm-ripple"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> Reçu
                      </Button>
                    </div>
                  </div>

                  {e.rejection_reason && (
                    <p className="mt-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                      Motif du rejet : {e.rejection_reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default PremiumHistory;
