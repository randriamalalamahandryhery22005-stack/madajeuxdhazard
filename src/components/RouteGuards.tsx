import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumAccess } from "@/lib/premiumAccess";
import PremiumPaywall from "@/components/PremiumPaywall";
import { Loader2 } from "lucide-react";

const FullScreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
    <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
  </div>
);

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
};

export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/games" replace />;
  }
  return <>{children}</>;
};

export const RedirectIfAuthed = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/games" replace />;
  return <>{children}</>;
};

export const RequirePremium = ({ children, gameName = "ce jeu" }: { children: ReactNode; gameName?: string }) => {
  const { user, loading } = useAuth();
  const access = usePremiumAccess();
  const location = useLocation();
  if (loading || access.loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!access.hasAccess) return <PremiumPaywall gameName={gameName} />;
  return <>{children}</>;
};
