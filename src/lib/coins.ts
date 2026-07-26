import { supabase } from "@/integrations/supabase/client";

// 1 coin per hour of subscription. Lifetime = effectively infinite.
const COINS_PER_HOUR = 1;
const LIFETIME_COINS = 1_000_000;

/**
 * L'attribution des jetons est calculée côté serveur (fonction sécurisée) :
 * elle exige un abonnement réellement validé par un administrateur, le client
 * ne choisit ni le montant ni la durée. Repli sur l'ancien chemin tant que la
 * fonction sécurisée n'est pas déployée.
 */
export async function grantSubscriptionCoins(
  userId: string,
  opts: { days: number; lifetime?: boolean; expiresAt?: string | null },
) {
  const { error: rpcError } = await (
    supabase.rpc as unknown as (n: string) => Promise<{ error: unknown }>
  )("grant_subscription_coins");
  if (!rpcError) return;

  const coins = opts.lifetime ? LIFETIME_COINS : Math.max(1, opts.days * 24 * COINS_PER_HOUR);
  const ratePerHour = opts.lifetime ? 0 : COINS_PER_HOUR;
  const startedAt = new Date().toISOString();
  const expires = opts.lifetime
    ? null
    : opts.expiresAt || new Date(Date.now() + opts.days * 24 * 3600 * 1000).toISOString();


  const { data: existing } = await supabase
    .from("user_coins")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_coins")
      .update({
        balance: Number(existing.balance) + coins,
        total_granted: Number(existing.total_granted) + coins,
        plan_type: "premium",
        plan_started_at: startedAt,
        plan_expires_at: expires,
        consumption_rate_per_hour: ratePerHour,
        last_consumed_at: startedAt,
      })
      .eq("user_id", userId);
  } else {
    await supabase.from("user_coins").insert({
      user_id: userId,
      balance: coins,
      total_granted: coins,
      total_consumed: 0,
      plan_type: "premium",
      plan_started_at: startedAt,
      plan_expires_at: expires,
      consumption_rate_per_hour: ratePerHour,
      last_consumed_at: startedAt,
    });
  }
}

export async function ensureCoinsRow(userId: string) {
  const { data } = await supabase
    .from("user_coins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    await supabase.from("user_coins").insert({
      user_id: userId,
      balance: 0,
      plan_type: "free",
    });
  }
}

// Compute current balance considering elapsed hours since last_consumed_at.
export function computeLiveBalance(row: {
  balance: number | string;
  consumption_rate_per_hour: number | string;
  last_consumed_at: string | null;
  plan_expires_at: string | null;
}): number {
  const base = Number(row.balance);
  const rate = Number(row.consumption_rate_per_hour || 0);
  if (!rate || !row.last_consumed_at) return Math.max(0, base);
  const hours = (Date.now() - new Date(row.last_consumed_at).getTime()) / 3600000;
  const consumed = hours * rate;
  return Math.max(0, base - consumed);
}
