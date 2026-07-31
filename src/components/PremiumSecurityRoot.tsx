import { usePremiumDeviceGuard } from "@/hooks/usePremiumDeviceGuard";

/** Active la surveillance multi-appareils des comptes Premium. */
export default function PremiumSecurityRoot() {
  usePremiumDeviceGuard();
  return null;
}
