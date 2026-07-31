import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PREMIUM_GAME_MODES } from "@/lib/premiumAccess";

export type BadgeMaps = {
  admins: Set<string>;
  premium: Set<string>;
  loading: boolean;
};

/**
 * Charge la liste des administrateurs officiels et des comptes Premium
 * afin d'afficher les badges correspondants dans le chat et les profils.
 */
export function useAccountBadges(): BadgeMaps {
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [premium, setPremium] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rolesRes, accessRes, bonusRes] = await Promise.all([
        supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
        supabase
          .from("game_access")
          .select("user_id,game_mode,expires_at,is_active")
          .in("game_mode", PREMIUM_GAME_MODES as unknown as string[])
          .eq("is_active", true),
        supabase.from("premium_bonuses").select("user_id,expires_at,is_active").eq("is_active", true),
      ]);
      if (!alive) return;
      setAdmins(new Set(((rolesRes.data || []) as { user_id: string }[]).map((r) => r.user_id)));
      const now = Date.now();
      const prem = new Set<string>();
      for (const row of (accessRes.data || []) as { user_id: string; expires_at: string | null }[]) {
        if (!row.expires_at || new Date(row.expires_at).getTime() > now) prem.add(row.user_id);
      }
      for (const row of (bonusRes.data || []) as { user_id: string; expires_at: string | null }[]) {
        if (!row.expires_at || new Date(row.expires_at).getTime() > now) prem.add(row.user_id);
      }
      setPremium(prem);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { admins, premium, loading };
}
