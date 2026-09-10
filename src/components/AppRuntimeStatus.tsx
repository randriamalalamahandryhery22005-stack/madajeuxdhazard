import { useEffect } from "react";
import { toast } from "sonner";

/** Global runtime resilience: keeps users informed when connectivity changes. */
const AppRuntimeStatus = () => {
  useEffect(() => {
    const handleOnline = () => toast.success("Connexion rétablie", { id: "network-status" });
    const handleOffline = () => toast.error("Connexion Internet interrompue. Certaines actions peuvent être temporairement indisponibles.", { id: "network-status", duration: Infinity });

    if (!navigator.onLine) handleOffline();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return null;
};

export default AppRuntimeStatus;
