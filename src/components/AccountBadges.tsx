import { BadgeCheck, Crown } from "lucide-react";

/** Badge officiel administrateur / propriétaire de l'application. */
export function AdminBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="Administrateur officiel · Propriétaire de l'application"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-200 text-[10px] font-bold"
    >
      <BadgeCheck className="w-3 h-3" />
      {!compact && "Admin officiel"}
    </span>
  );
}

/** Badge des comptes Premium. */
export function PremiumBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="Compte Premium"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-bold"
    >
      <Crown className="w-3 h-3" />
      {!compact && "Premium"}
    </span>
  );
}

export default function AccountBadges({
  userId,
  admins,
  premium,
  compact = false,
}: {
  userId: string;
  admins: Set<string>;
  premium: Set<string>;
  compact?: boolean;
}) {
  const isAdmin = admins.has(userId);
  return (
    <>
      {isAdmin && <AdminBadge compact={compact} />}
      {!isAdmin && premium.has(userId) && <PremiumBadge compact={compact} />}
    </>
  );
}
