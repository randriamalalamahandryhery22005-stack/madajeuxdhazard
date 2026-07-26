import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, TRIAL_DURATION_MS } from "@/contexts/AuthContext";

export const PREMIUM_GAME_MODES = ["premium-global", "premium-lifetime"] as const;

export interface PremiumHistoryEntry {
  id: string;
  game_mode: string;
  granted_at: string;
  expires_at: string | null;
  days_requested: number;
  price_amount: number;
  granted_by: string | null;
  is_active: boolean;
  payment_proof_url: string | null;
  rejection_reason: string | null;
}

export interface PremiumAccessState {
  loading: boolean;
  hasAccess: boolean;
  isLifetime: boolean;
  expiresAt: string | null;
  grantedAt: string | null;
  isTrial: boolean;
  trialRemainingMs: number;
}

/** Computes trial window from a profile.trial_started_at string. */
export const computeTrial = (trialStartedAt: string | null | undefined) => {
  if (!trialStartedAt) return { active: false, remainingMs: 0, endsAt: null as string | null };
  const start = new Date(trialStartedAt).getTime();
  const endsAt = start + TRIAL_DURATION_MS;
  const remaining = endsAt - Date.now();
  return {
    active: remaining > 0,
    remainingMs: Math.max(0, remaining),
    endsAt: new Date(endsAt).toISOString(),
  };
};

/**
 * Centralized Premium access check.
 * A user has Premium access when they hold an active row in `game_access`
 * for game_mode = "premium-global" (with non-expired `expires_at`)
 * OR for game_mode = "premium-lifetime" (no expiration).
 * Admins always have access.
 */
export const usePremiumAccess = (): PremiumAccessState => {
  const { user, isAdmin, profile } = useAuth();
  const [state, setState] = useState<PremiumAccessState>({
    loading: true,
    hasAccess: false,
    isLifetime: false,
    expiresAt: null,
    grantedAt: null,
    isTrial: false,
    trialRemainingMs: 0,
  });

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const trial = computeTrial(profile?.trial_started_at ?? null);
      if (!user) {
        if (alive) setState({ loading: false, hasAccess: false, isLifetime: false, expiresAt: null, grantedAt: null, isTrial: false, trialRemainingMs: 0 });
        return;
      }
      if (isAdmin) {
        if (alive) setState({ loading: false, hasAccess: true, isLifetime: true, expiresAt: null, grantedAt: null, isTrial: false, trialRemainingMs: 0 });
        return;
      }
      const [{ data }, { data: bonuses }] = await Promise.all([
        supabase
          .from("game_access")
          .select("game_mode,expires_at,granted_at,is_active,granted_by")
          .eq("user_id", user.id)
          .in("game_mode", PREMIUM_GAME_MODES as unknown as string[])
          .eq("is_active", true),
        supabase
          .from("premium_bonuses")
          .select("granted_at,expires_at,is_active")
          .eq("user_id", user.id)
          .eq("is_active", true),
      ]);
      const now = new Date();
      const valid = (data || []).filter(
        (a) => !!a.granted_by && (!a.expires_at || new Date(a.expires_at) > now)
      );
      const activeBonus = (bonuses || []).find(
        (b: any) => !b.expires_at || new Date(b.expires_at) > now
      );
      const lifetime = valid.find((a) => a.game_mode === "premium-lifetime");
      const active = lifetime || valid[0] || (activeBonus ? { expires_at: activeBonus.expires_at, granted_at: activeBonus.granted_at } as any : null);
      if (alive) {
        setState({
          loading: false,
          hasAccess: !!active || trial.active,
          isLifetime: !!lifetime,
          expiresAt: active?.expires_at ?? (trial.active ? trial.endsAt : null),
          grantedAt: active?.granted_at ?? (trial.active ? profile?.trial_started_at ?? null : null),
          isTrial: !active && trial.active,
          trialRemainingMs: trial.remainingMs,
        });
      }
    };
    check();
    // Tick the trial countdown so state flips when it expires
    const trialStart = profile?.trial_started_at ? new Date(profile.trial_started_at).getTime() : 0;
    const trialEnd = trialStart + TRIAL_DURATION_MS;
    const trialActive = trialStart > 0 && Date.now() < trialEnd;
    let ticker: number | undefined;
    if (trialActive) {
      // Perf : on n'interroge plus la base toutes les 5 s et jamais quand
      // l'onglet est masqué (moins de requêtes, moins de saccades).
      ticker = window.setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        check();
      }, 20000);
    }
    if (!user) {
      return () => { if (ticker) clearInterval(ticker); };
    }
    const channel = supabase
      .channel(`premium-access-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_access", filter: `user_id=eq.${user.id}` },
        () => check()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "premium_bonuses", filter: `user_id=eq.${user.id}` },
        () => check()
      )
      .subscribe();
    return () => {
      alive = false;
      if (ticker) clearInterval(ticker);
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, profile?.trial_started_at]);

  return state;
};

/**
 * Reads the full Premium subscription/payment history for the current user
 * from `game_access`. Used by the Premium dashboard History tab. Realtime.
 */
export const usePremiumHistory = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PremiumHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!user) {
        if (alive) { setEntries([]); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("game_access")
        .select("id,game_mode,granted_at,expires_at,days_requested,price_amount,granted_by,is_active,payment_proof_url,rejection_reason")
        .eq("user_id", user.id)
        .in("game_mode", PREMIUM_GAME_MODES as unknown as string[])
        .order("granted_at", { ascending: false });
      if (alive) {
        setEntries((data as PremiumHistoryEntry[] | null) || []);
        setLoading(false);
      }
    };
    load();
    if (!user) return;
    const channel = supabase
      .channel(`premium-history-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_access", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { loading, entries };
};