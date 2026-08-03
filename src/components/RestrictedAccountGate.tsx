import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AccountReviewWizard from "@/components/AccountReviewWizard";
import { getMyReview, missingProfileFields, restrictAccount, type ProfileLike } from "@/lib/accountReview";
import { ShieldAlert } from "lucide-react";

/**
 * Surveille la conformité du profil : un compte incomplet devient restreint,
 * reçoit une notification et ne peut plus utiliser l'application tant que
 * l'examen n'est pas approuvé par l'administrateur.
 */
export default function RestrictedAccountGate() {
  const { user, isAdmin } = useAuth();
  const [restricted, setRestricted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || isAdmin) {
      setRestricted(false);
      return;
    }
    let alive = true;
    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id,full_name,name,birth_date,gender,phone,country_code,avatar_url,status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!alive) return;
      const profile = data as ProfileLike | null;
      if (!profile || profile.status === "blocked") return;
      const missing = missingProfileFields(profile);
      const review = await getMyReview(user.id);
      if (!alive) return;
      const needsReview = missing.length > 0 || review?.status === "rejected";
      const isRestricted = profile.status === "restricted" || needsReview;
      setRestricted(isRestricted && review?.status !== "approved");
      setOpen(isRestricted && review?.status !== "approved");
      if (needsReview && profile.status !== "restricted") {
        await restrictAccount(user.id, missing.length ? missing : ["Informations refusées par l'administrateur"]);
      }
    };
    void check();
    const ch = supabase
      .channel(`restricted-watch-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        () => void check(),
      )
      .subscribe();
    return () => {
      alive = false;
      try {
        supabase.removeChannel(ch);
      } catch {
        /* noop */
      }
    };
  }, [user, isAdmin]);

  if (!user || !restricted || !open) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-md overflow-y-auto">
      <div className="max-w-md mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-base font-bold">Compte restreint</h1>
            <p className="text-xs text-muted-foreground">
              L'application reste inaccessible tant que votre demande d'examen n'a pas été validée par l'administrateur.
            </p>
          </div>
        </div>
        <AccountReviewWizard />
      </div>
    </div>
  );
}

