import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, UserRound } from "lucide-react";
import { missingFields, syncRestriction } from "@/lib/accountVerification";

/** Routes toujours accessibles à un compte restreint. */
const ALLOWED = ["/profile", "/notifications", "/login", "/signup", "/forgot-password", "/reset-password", "/chat"];

/**
 * Un compte restreint (informations obligatoires manquantes ou vérification en
 * cours) ne peut pas utiliser les fonctionnalités principales de l'application
 * tant que son dossier n'est pas validé.
 */
export default function RestrictedAccountGate() {
  const { user, profile, isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    if (!user || isAdmin || !profile) { setRestricted(false); return; }
    const p = profile as unknown as Parameters<typeof syncRestriction>[0];
    void syncRestriction({ ...p, user_id: user.id }).then((r) => setRestricted(r.restricted));
  }, [user, isAdmin, profile]);

  const allowed = ALLOWED.some((a) => pathname.startsWith(a));
  if (!user || isAdmin || !restricted || allowed) return null;

  const missing = missingFields(profile as unknown as Parameters<typeof missingFields>[0]);

  return (
    <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-md overflow-y-auto">
      <div className="max-w-md mx-auto px-4 py-12 space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-lg font-bold">Compte restreint</h1>
          <p className="text-sm text-muted-foreground">
            Votre compte doit être vérifié avant d'accéder aux fonctionnalités principales.
          </p>
        </div>

        {missing.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card/80 p-4 text-xs space-y-1.5">
            <p className="font-bold">Informations manquantes</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
              {missing.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </div>
        )}

        <Link
          to="/profile"
          className="flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
        >
          <UserRound className="w-4 h-4" /> Compléter mon profil et demander un examen
        </Link>
      </div>
    </div>
  );
}
