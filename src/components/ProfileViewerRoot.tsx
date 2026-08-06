import { useEffect, useState } from "react";
import UserProfileDialog from "@/components/UserProfileDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountBadges } from "@/hooks/useAccountBadges";
import { onOpenUserProfile } from "@/lib/profileViewer";

/** Fiche profil globale : disponible dans toutes les sections de l'application. */
export default function ProfileViewerRoot() {
  const { isAdmin } = useAuth();
  const { admins, premium } = useAccountBadges();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => onOpenUserProfile(setUserId), []);

  return (
    <UserProfileDialog
      userId={userId}
      open={!!userId}
      onClose={() => setUserId(null)}
      viewerIsAdmin={!!isAdmin}
      admins={admins}
      premium={premium}
    />
  );
}
