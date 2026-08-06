import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AccountBadges from "@/components/AccountBadges";
import { Calendar, Globe2, Mail, MapPin, ShieldCheck, User2, Cake, Phone, Loader2 } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

const countryName = (code?: string | null) =>
  (COUNTRIES as Array<{ code: string; name: string }>).find((c) => c.code === code)?.name ?? null;

type FullProfile = {
  user_id: string;
  name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  gender: string | null;
  country_code: string | null;
  region: string | null;
  status: string | null;
  is_validated: boolean | null;
  created_at: string | null;
  email?: string | null;
  birth_date?: string | null;
  phone?: string | null;
};

/**
 * Fiche publique d'un compte.
 * Les membres lisent l'annuaire public (nom, avatar, pays…) ; l'e-mail,
 * la date de naissance et le téléphone restent réservés aux administrateurs.
 */
export default function UserProfileDialog({
  userId,
  open,
  onClose,
  viewerIsAdmin,
  admins,
  premium,
}: {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  viewerIsAdmin: boolean;
  admins: Set<string>;
  premium: Set<string>;
}) {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let alive = true;
    setLoading(true);
    setProfile(null);
    (async () => {
      const source = viewerIsAdmin ? "profiles" : "public_profiles";
      const { data } = await supabase
        .from(source as "profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (!alive) return;
      setProfile((data as FullProfile) ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [open, userId, viewerIsAdmin]);

  const name = profile?.full_name || profile?.name || "Membre";
  const initials = name.trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors">
      <span className="w-8 h-8 shrink-0 rounded-lg bg-amber-500/10 text-amber-300 flex items-center justify-center">{icon}</span>
      <span className="text-[10px] uppercase tracking-widest text-slate-500 w-20 shrink-0">{label}</span>
      <span className="text-sm text-slate-100 truncate ml-auto text-right">{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm overflow-hidden border-white/10 bg-slate-950 p-0 text-white">
        <div className="relative">
          <div className="h-24 w-full bg-gradient-to-br from-amber-500/30 via-emerald-500/20 to-slate-900" />
          <div className="absolute inset-x-0 top-8 flex justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-900 ring-4 ring-slate-950 shadow-2xl flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-2xl font-bold text-amber-300">{initials || "?"}</span>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-16">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-center text-lg font-semibold text-white">
              {loading ? "Chargement…" : name}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <p className="py-8 flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement du profil
            </p>
          ) : !profile ? (
            <p className="py-8 text-center text-sm text-slate-400">Profil indisponible.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <AccountBadges userId={profile.user_id} admins={admins} premium={premium} />
                {profile.status && profile.status !== "active" && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/30 text-rose-200">
                    Compte {profile.status}
                  </span>
                )}
                {profile.is_validated && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-200">
                    Vérifié
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Row
                  icon={<User2 className="w-4 h-4" />}
                  label="Sexe"
                  value={profile.gender === "female" ? "Féminin" : profile.gender === "male" ? "Masculin" : "Non précisé"}
                />
                <Row icon={<Globe2 className="w-4 h-4" />} label="Pays" value={countryName(profile.country_code) || profile.country_code || "—"} />
                <Row icon={<MapPin className="w-4 h-4" />} label="Région" value={profile.region || "—"} />
                <Row
                  icon={<Calendar className="w-4 h-4" />}
                  label="Membre"
                  value={profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
                />
                <Row icon={<ShieldCheck className="w-4 h-4" />} label="Statut" value={profile.is_validated ? "Validé" : "En cours"} />
                {viewerIsAdmin ? (
                  <>
                    <Row icon={<Mail className="w-4 h-4" />} label="E-mail" value={profile.email || "—"} />
                    <Row icon={<Cake className="w-4 h-4" />} label="Naissance" value={profile.birth_date || "—"} />
                    <Row icon={<Phone className="w-4 h-4" />} label="Téléphone" value={profile.phone || "—"} />
                  </>
                ) : (
                  <p className="text-[11px] text-slate-500 px-1 pt-1 text-center">
                    L'e-mail, le téléphone et la date de naissance restent privés.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
