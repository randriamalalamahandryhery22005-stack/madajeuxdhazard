import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  IdCard,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { COUNTRIES } from "@/lib/countries";
import {
  verifyRecoveryIdentity,
  resetPasswordWithIdentity,
} from "@/lib/accountRecovery.functions";

const identitySchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide").max(255),
  birthDate: z.string().trim().min(1, "Date de naissance requise"),
  gender: z.enum(["male", "female"], { message: "Sexe requis" }),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\+?\d[\d\s().-]{6,20}$/, "Numéro de compte invalide"),
  country: z.string().trim().min(1, "Pays requis"),
  region: z.string().trim().min(1, "Région requise"),
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [form, setForm] = useState({
    email: "",
    birthDate: "",
    gender: "" as "" | "male" | "female",
    accountNumber: "",
    country: "",
    region: "",
  });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const parsed = useMemo(() => identitySchema.safeParse(form), [form]);

  const verify = async () => {
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const res = await verifyRecoveryIdentity({ data: parsed.data });
      if (!res.ok) {
        toast.error("Informations incorrectes", {
          description: "Les données saisies ne correspondent pas à celles du compte.",
        });
        return;
      }
      setStep(2);
    } catch {
      toast.error("Vérification impossible pour le moment");
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async () => {
    if (!parsed.success) return;
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPasswordWithIdentity({
        data: { ...parsed.data, newPassword: password },
      });
      if (!res.ok) {
        toast.error("Réinitialisation refusée");
        return;
      }
      setStep(3);
      toast.success("Mot de passe mis à jour");
      setTimeout(() => navigate("/login"), 1800);
    } catch {
      toast.error("Réinitialisation impossible pour le moment");
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
        {step === 1 && (
          <div className="space-y-5" style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards" }}>
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/30">
                <IdCard className="w-10 h-10 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Vérification d'identité</h1>
              <p className="text-sm text-muted-foreground">
                Renseignez exactement les informations fournies lors de la création du compte.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Adresse email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="vous@exemple.com"
                  className="h-12 bg-secondary/80 border-border/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Numéro du compte</Label>
                <Input
                  type="tel"
                  value={form.accountNumber}
                  onChange={(e) => set("accountNumber", e.target.value)}
                  placeholder="+261340000000"
                  className="h-12 bg-secondary/80 border-border/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Date de naissance</Label>
                <Input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => set("birthDate", e.target.value)}
                  className="h-12 bg-secondary/80 border-border/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Sexe</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: "male", l: "Homme" },
                    { v: "female", l: "Femme" },
                  ] as const).map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => set("gender", g.v)}
                      className={`h-12 rounded-xl border text-sm font-semibold transition ${
                        form.gender === g.v
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border/50 bg-secondary/60 text-muted-foreground"
                      }`}
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Pays</Label>
                <select
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  className="w-full h-12 rounded-xl bg-secondary/80 border border-border/50 px-3 text-sm"
                >
                  <option value="">Sélectionner un pays</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Région</Label>
                <Input
                  value={form.region}
                  onChange={(e) => set("region", e.target.value)}
                  placeholder="Votre région"
                  className="h-12 bg-secondary/80 border-border/50"
                  onKeyDown={(e) => e.key === "Enter" && verify()}
                />
              </div>
            </div>

            <Button variant="premium" className="w-full h-12 text-base" onClick={verify} disabled={loading}>
              {loading ? "Vérification..." : "Vérifier mon identité"}
            </Button>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/40 rounded-xl p-3 border border-border/30">
              <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                Toutes les informations doivent correspondre exactement aux données enregistrées.
                Aucun mot de passe ne peut être modifié sans cette validation.
              </span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5" style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards" }}>
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/30">
                <Lock className="w-10 h-10 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
              <p className="text-sm text-muted-foreground">Identité vérifiée. Choisissez un mot de passe sûr.</p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  autoComplete="new-password"
                  className="h-12 bg-secondary/80 border-border/50 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirmer le mot de passe"
                autoComplete="new-password"
                className="h-12 bg-secondary/80 border-border/50"
                onKeyDown={(e) => e.key === "Enter" && submitNewPassword()}
              />
            </div>

            <Button variant="premium" className="w-full h-12 text-base" onClick={submitNewPassword} disabled={loading}>
              {loading ? "Mise à jour..." : "Valider le nouveau mot de passe"}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Mot de passe modifié</h1>
            <p className="text-sm text-muted-foreground">Redirection vers la connexion...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
