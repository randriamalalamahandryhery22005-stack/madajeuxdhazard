import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().trim().email("Adresse email invalide").max(255);

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Email de réinitialisation envoyé");
    } catch (err: any) {
      toast.error(err?.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5 px-6 py-8">
      <button
        onClick={() => navigate("/login")}
        className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95 self-start mb-6"
      >
        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
      </button>

      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col justify-center">
        {!sent ? (
          <div className="space-y-6" style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards" }}>
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/30">
                <Mail className="w-10 h-10 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
              <p className="text-sm text-muted-foreground">
                Saisissez l'adresse email associée à votre compte. Un lien sécurisé de
                réinitialisation vous sera envoyé.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Adresse email
              </Label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="h-14 bg-secondary/80 border-border/50 text-base"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>

            <Button
              variant="premium"
              className="w-full h-12 text-base"
              onClick={submit}
              disabled={loading}
            >
              {loading ? "Envoi..." : "Envoyer le lien"}
            </Button>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/40 rounded-xl p-3 border border-border/30">
              <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                Pour votre sécurité, seul le propriétaire de l'adresse email pourra
                confirmer et définir un nouveau mot de passe via le lien reçu.
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center" style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards" }}>
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Vérifiez vos emails</h1>
            <p className="text-sm text-muted-foreground">
              Un lien de réinitialisation a été envoyé à <span className="font-semibold text-foreground">{email}</span>.
              Cliquez sur le lien pour définir votre nouveau mot de passe.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Vous ne voyez pas l'email ? Vérifiez vos spams ou réessayez dans quelques minutes.
            </p>
            <Button variant="outline" className="w-full h-12" onClick={() => navigate("/login")}>
              Retour à la connexion
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
