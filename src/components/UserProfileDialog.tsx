import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AccountBadges from "@/components/AccountBadges";
import { Calendar, Globe2, Mail, MapPin, ShieldCheck, User2, Cake, Phone } from "lucide-react";

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
 * L'e-mail, la date de naissance et le téléphone restent privés :
 * seuls les administrateurs peuvent les consulter.
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
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      if (!alive) return;
      setProfile((data as FullProfile) ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, userId]);

  const name = profile?.full_name || profile?.name || "Joueur";
  const initials = name.trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
      <span className="text-amber-300">{icon}</span>
      <span className="text-[11px] uppercase tracking-wide text-slate-400 w-24 shrink-0">{label}</span>
      <span className="text-sm text-slate-100 truncate">{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Profil public</DialogTitle>
        </DialogHeader>
        {loading || !profile ? (
          <p className="py-6 text-center text-sm text-slate-400">Chargement...</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-800 ring-2 ring-amber-400/40 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-xl font-bold">{initials || "?"}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{name}</p>
                <AccountBadges userId={profile.user_id} admins={admins} premium={premium} />
              </div>
              {profile.status && profile.status !== "active" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-200">
                  Compte {profile.status}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <Row icon={<User2 className="w-4 h-4" />} label="Sexe" value={profile.gender === "female" ? "Féminin" : profile.gender === "male" ? "Masculin" : "Non précisé"} />
              <Row icon={<Globe2 className="w-4 h-4" />} label="Pays" value={profile.country_code || "—"} />
              <Row icon={<MapPin className="w-4 h-4" />} label="Région" value={profile.region || "—"} />
              <Row icon={<Calendar className="w-4 h-4" />} label="Membre depuis" value={profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"} />
              <Row icon={<ShieldCheck className="w-4 h-4" />} label="Validé" value={profile.is_validated ? "Oui" : "En cours"} />
              {viewerIsAdmin ? (
                <>
                  <Row icon={<Mail className="w-4 h-4" />} label="E-mail" value={profile.email || "—"} />
                  <Row icon={<Cake className="w-4 h-4" />} label="Naissance" value={profile.birth_date || "—"} />
                  <Row icon={<Phone className="w-4 h-4" />} label="Téléphone" value={profile.phone || "—"} />
                </>
              ) : (
                <p className="text-[11px] text-slate-500 px-1 pt-1">
                  L'e-mail et la date de naissance restent privés.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
