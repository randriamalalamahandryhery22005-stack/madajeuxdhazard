import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumAccess } from "@/lib/premiumAccess";
import { getDeviceId } from "@/hooks/usePresence";
import { PREMIUM_DEVICE_LIMIT, blockPremiumAccount, listAccountDevices } from "@/lib/accountSecurity";

/**
 * Sécurité des comptes Premium : au-delà de 3 appareils distincts, le compte
 * est automatiquement bloqué et l'administration est alertée.
 * Les comptes standards ne sont pas concernés.
 */
export function usePremiumDeviceGuard() {
  const { user, profile, isAdmin } = useAuth();
  const { hasAccess, isTrial, loading } = usePremiumAccess();
  const doneRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || loading || isAdmin) return;
    if (!hasAccess || isTrial) return;
    if (doneRef.current === user.id) return;
    doneRef.current = user.id;

    (async () => {
      const deviceId = getDeviceId();
      const devices = await listAccountDevices(user.id);
      if (!devices.some((d) => d.deviceId === deviceId)) {
        await supabase.from("login_history").insert({
          user_id: user.id,
          event_type: "login",
          session_id: deviceId,
          device_info: `${navigator.platform || ""} · ${navigator.userAgent.slice(0, 90)}`,
        });
        devices.push({ deviceId, info: null, lastAt: new Date().toISOString() });
      }
      if (devices.length > PREMIUM_DEVICE_LIMIT && profile?.full_name !== undefined) {
        const name = profile?.full_name || profile?.name || "Compte Premium";
        await blockPremiumAccount(user.id, name, devices.length);
      }
    })();
  }, [user, profile, isAdmin, hasAccess, isTrial, loading]);
}
