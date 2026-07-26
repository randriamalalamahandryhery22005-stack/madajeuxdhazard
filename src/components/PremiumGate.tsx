import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import PremiumPaywall from "@/components/PremiumPaywall";
import { usePremiumAccess } from "@/lib/premiumAccess";

interface PremiumGateProps {
  /** Kept for backwards compatibility — access is always evaluated globally now. */
  gameMode: string;
  gameName: string;
  children: ReactNode;
  /** Deprecated — paywall is now always shown inline. */
  inline?: boolean;
}

const PremiumGate = ({ gameName, children }: PremiumGateProps) => {
  const { loading, hasAccess } = usePremiumAccess();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    );
  }
  if (hasAccess) return <>{children}</>;
  return <PremiumPaywall gameName={gameName} />;
};

export default PremiumGate;
