import { Coins } from "lucide-react";
import { useCoins } from "@/hooks/useCoins";
import { useNavigate } from "react-router-dom";

const CoinsBadge = () => {
  const { balance, isPremium } = useCoins();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/premium")}
      className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 shadow-sm hover:border-primary/50 active:scale-95 transition-all"
      title={isPremium ? "Solde Premium" : "Compte Free — souscrire"}
    >
      <Coins className="w-3.5 h-3.5 text-primary" />
      <span className="text-xs font-black gold-text tabular-nums">{balance.toLocaleString()}</span>
      <span
        className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full ${
          isPremium
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isPremium ? "Premium" : "Free"}
      </span>
    </button>
  );
};

export default CoinsBadge;
