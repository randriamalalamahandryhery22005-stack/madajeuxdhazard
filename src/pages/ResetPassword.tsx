import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase places a recovery session in the URL hash and auto-persists it.
    // We wait for the auth state to settle, then confirm a valid recovery session exists.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setValidSession(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true);
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setDone(true);
      toast.success("Mot de passe mis à jour");
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login");
      }, 1500);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-destructive/15 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">Lien invalide ou expiré</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Ce lien de réinitialisation n'est plus valide. Veuillez en demander un nouveau.
        </p>
        <Button variant="premium" onClick={() => navigate("/forgot-password")}>
          Demander un nouveau lien
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5 px-6 py-8">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col justify-center">
        {done ? (
          <div className="space-y-4 text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Mot de passe modifié</h1>
            <p className="text-sm text-muted-foreground">Redirection vers la connexion...</p>
          </div>
        ) : (
          <div className="space-y-6" style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards" }}>
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/30">
                <KeyRound className="w-10 h-10 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
              <p className="text-sm text-muted-foreground">
                Choisissez un mot de passe sûr d'au moins 6 caractères.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Nouveau mot de passe
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-14 bg-secondary/80 border-border/50 pl-11 pr-11 text-base"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Confirmer le mot de passe
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-14 bg-secondary/80 border-border/50 pl-11 text-base"
                    autoComplete="new-password"
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                  />
                </div>
              </div>
            </div>

            <Button variant="premium" className="w-full h-12 text-base" onClick={submit} disabled={loading}>
              {loading ? "Mise à jour..." : "Valider le nouveau mot de passe"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
