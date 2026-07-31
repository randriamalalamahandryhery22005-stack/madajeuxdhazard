import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  Camera,
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  Loader2,
  Mail,
  Phone,
  Lock,
  User,
  Globe2,
  MapPin,
  Calendar,
  UserPlus,
  Sparkles,
  Search,
  KeyRound,
  ScanFace,
} from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jhLogo from "@/assets/jh-logo.png";
import { rememberCurrentAccount } from "@/lib/savedAccounts";

/* ------------------------------------------------------------------ */
/*  Validation (unchanged business logic)                             */
/* ------------------------------------------------------------------ */

const passwordSchema = z
  .string()
  .min(8, "Mot de passe : 8 caractères minimum")
  .max(72, "Mot de passe trop long")
  .regex(/[A-Za-z]/, "Le mot de passe doit contenir une lettre")
  .regex(/\d/, "Le mot de passe doit contenir un chiffre");

const credentialsSchemaEmail = z
  .object({
    email: z.string().trim().toLowerCase().email("Format e-mail invalide").max(255),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

const credentialsSchemaPhone = z
  .object({
    phone: z.string().trim().regex(/^\+\d{8,15}$/, "Numéro invalide (ex: +261340000000)"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

const profileSchema = z
  .object({
    fullName: z.string().trim().min(2, "Nom complet trop court").max(80, "Nom trop long"),
    country: z.string().min(1, "Pays requis"),
    birthDate: z.string().min(1, "Date de naissance requise"),
    gender: z.enum(["male", "female", "other"], { message: "Sexe requis" }),
    profilePhone: z.string().trim().regex(/^\+?\d[\d\s().-]{6,20}$/, "Numéro invalide"),
  })
  .refine(
    (v) => {
      const d = new Date(v.birthDate);
      if (isNaN(d.getTime())) return false;
      const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
      return age >= 18;
    },
    { message: "Vous devez avoir 18 ans ou plus", path: ["birthDate"] }
  );

/* ------------------------------------------------------------------ */
/*  Password strength helper                                          */
/* ------------------------------------------------------------------ */

const passwordScore = (pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(4, s) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Trop faible", "Faible", "Correct", "Solide", "Excellent"];
  const colors = ["#7a3232", "#c25b3a", "#c9a84c", "#2dbb7c", "#22c55e"];
  return { score, label: labels[score], color: colors[score] };
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

const STEPS = [
  { icon: KeyRound, title: "Identifiants", desc: "Sécurisez votre accès" },
  { icon: User, title: "Profil", desc: "Vos informations civiles" },
  { icon: ScanFace, title: "Photo", desc: "Vérification par IA" },
  { icon: ShieldCheck, title: "Signature", desc: "Confirmation finale" },
] as const;

const Signup = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [prevStep, setPrevStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    country: "",
    region: "",
    birthDate: "",
    gender: "" as "" | "male" | "female" | "other",
    profilePhone: "",
    profilePhoto: null as File | null,
    profilePhotoPreview: null as string | null,
    notRobot: false,
  });
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingPhoto, setValidatingPhoto] = useState(false);
  const [photoValidated, setPhotoValidated] = useState(false);

  const pwScore = useMemo(() => passwordScore(formData.password), [formData.password]);
  const direction = step > prevStep ? 1 : -1;

  const updateField = (field: string, value: any) => {
    setFormData((p) => ({ ...p, [field]: value }));
    setError("");
  };

  /* ------------ Photo upload (unchanged behaviour) --------------- */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("read_error"));
      reader.readAsDataURL(file);
    });
    setFormData((p) => ({ ...p, profilePhoto: file, profilePhotoPreview: preview }));
    setPhotoValidated(false);
    setError("");

    setValidatingPhoto(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("validate-face-image", {
        body: { imageBase64: preview },
      });
      if (fnErr) throw fnErr;
      const isFace = (data as any)?.isFace;
      const reason = (data as any)?.reason || "";
      if (isFace === false) {
        setFormData((p) => ({ ...p, profilePhoto: null, profilePhotoPreview: null }));
        setError(
          "Cette image ne semble pas être une vraie photo de visage. Veuillez utiliser une photo réelle de votre visage." +
            (reason ? ` (${reason})` : "")
        );
        toast.error("Photo refusée : utilisez une vraie photo de votre visage");
      } else {
        setPhotoValidated(true);
        toast.success("Visage authentifié");
      }
    } catch (err: any) {
      setPhotoValidated(true);
      console.warn("Face validation unavailable:", err?.message);
    } finally {
      setValidatingPhoto(false);
    }
  };

  const normalizePhone = (p: string) => {
    const cleaned = p.replace(/[^\d+]/g, "");
    if (!cleaned) return "";
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
    if (cleaned.startsWith("0")) return "+261" + cleaned.slice(1);
    return "+" + cleaned;
  };

  const validateStep = (): string | null => {
    switch (step) {
      case 1: {
        if (signupMethod === "email") {
          const r = credentialsSchemaEmail.safeParse({
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          });
          return r.success ? null : r.error.issues[0]?.message ?? "Données invalides";
        }
        const phone = normalizePhone(formData.phone);
        const r = credentialsSchemaPhone.safeParse({
          phone,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
        return r.success ? null : r.error.issues[0]?.message ?? "Données invalides";
      }
      case 2: {
        const r = profileSchema.safeParse({
          fullName: formData.fullName,
          country: formData.country,
          birthDate: formData.birthDate,
          gender: formData.gender || undefined,
          profilePhone: formData.profilePhone || (signupMethod === "phone" ? formData.phone : ""),
        });
        return r.success ? null : r.error.issues[0]?.message ?? "Données invalides";
      }
      case 3:
        if (!formData.profilePhoto) return "Photo de profil requise";
        if (validatingPhoto) return "Validation de la photo en cours...";
        if (!photoValidated) return "La photo doit représenter un vrai visage humain";
        return null;
      case 4:
        if (!formData.notRobot) return "Veuillez confirmer que vous n'êtes pas un robot";
        return null;
      default:
        return null;
    }
  };

  const goTo = (n: number) => {
    setPrevStep(step);
    setStep(n);
    setError("");
  };

  const handleBack = () => {
    if (step > 1) goTo(step - 1);
    else navigate("/login");
  };

  const handleNext = async () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    if (step < 4) {
      goTo(step + 1);
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = formData.email.trim().toLowerCase();
      const cleanPhone = normalizePhone(formData.phone);

      const signUpParams: any =
        signupMethod === "email"
          ? {
              email: cleanEmail,
              password: formData.password,
              options: {
                data: { full_name: formData.fullName },
                emailRedirectTo: `${window.location.origin}/games`,
              },
            }
          : {
              phone: cleanPhone,
              password: formData.password,
              options: { data: { full_name: formData.fullName } },
            };

      const { data: authData, error: authError } = await supabase.auth.signUp(signUpParams);
      if (authError) {
        const msg = authError.message?.toLowerCase() || "";
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          throw new Error("Ce compte existe déjà. Connectez-vous.");
        }
        if (msg.includes("invalid") && msg.includes("email")) throw new Error("Adresse e-mail invalide.");
        if (msg.includes("phone")) throw new Error("Numéro de téléphone invalide.");
        throw authError;
      }
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      let userId = authData.user.id;
      if (!authData.session) {
        const { data: signInData, error: signInError } =
          signupMethod === "email"
            ? await supabase.auth.signInWithPassword({ email: cleanEmail, password: formData.password })
            : await supabase.auth.signInWithPassword({ phone: cleanPhone, password: formData.password });
        if (signInError || !signInData.session) {
          toast.success("Compte créé. Vous pouvez maintenant vous connecter.");
          navigate("/login");
          return;
        }
        userId = signInData.user.id;
      }

      let avatarUrl: string | null = null;
      if (formData.profilePhoto) {
        const fileExt = (formData.profilePhoto.name.split(".").pop() || "jpg").toLowerCase();
        const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, formData.profilePhoto, {
            upsert: true,
            contentType: formData.profilePhoto.type || undefined,
          });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
          avatarUrl = urlData.publicUrl;
        } else {
          const fbPath = `avatars/${filePath}`;
          const { error: fbErr } = await supabase.storage
            .from("gen-store")
            .upload(fbPath, formData.profilePhoto, { upsert: true });
          if (!fbErr) {
            const { data: pub } = supabase.storage.from("gen-store").getPublicUrl(fbPath);
            avatarUrl = pub.publicUrl;
          }
        }
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          name: formData.fullName,
          country_code: formData.country,
          region: formData.region || null,
          birth_date: formData.birthDate,
          avatar_url: avatarUrl,
          gender: formData.gender || null,
          is_validated: true,
          phone: normalizePhone(formData.profilePhone || formData.phone) || null,
        } as never)
        .eq("user_id", userId);
      if (profileErr) throw new Error("Impossible d'enregistrer le profil : " + profileErr.message);

      // Permet la connexion indifféremment par e-mail ou par téléphone :
      // on synchronise le numéro sur le compte d'authentification.
      const authPhone = normalizePhone(formData.profilePhone || formData.phone);
      if (signupMethod === "email" && authPhone) {
        try {
          await supabase.functions.invoke("update-user-auth", { body: { phone: authPhone } });
        } catch { /* non bloquant */ }
      }

      await refreshProfile();

      // Remember this account on this device (Facebook-style quick relogin)
      try {
        await rememberCurrentAccount(userId, {
          identifier: signupMethod === "email" ? cleanEmail : cleanPhone,
          method: signupMethod,
          displayName: formData.fullName,
        });
      } catch { /* non-blocking */ }
      toast.success("Bienvenue chez Jeux d'Hazard");
      navigate("/games");
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const selectedCountry = COUNTRIES.find((c) => c.code === formData.country);
  const meta = STEPS[step - 1];
  const StepIcon = meta.icon;
  const progressPct = (step / STEPS.length) * 100;

  /* ------------------ shared styles ------------------ */
  const labelClass =
    "text-[10px] uppercase tracking-[0.28em] text-foreground/55 font-bold flex items-center gap-1.5 ml-0.5";
  const inputClass =
    "h-12 pl-11 rounded-2xl text-sm bg-foreground/[0.04] border border-border/60 focus:border-[hsl(var(--gold)/0.6)] focus:ring-2 focus:ring-[hsl(var(--gold)/0.15)] placeholder:text-foreground/30";

  /* ================================================== */
  return (
    <div className="relative min-h-[100dvh] overflow-hidden flex flex-col bg-[hsl(158_60%_3%)]">
      {/* Ambient background — Émeraude Prestige */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-24 -right-16 w-[26rem] h-[26rem] rounded-full bg-[hsl(152_72%_28%_/_0.4)] blur-[110px] animate-aurora" />
        <div
          className="absolute -bottom-32 -left-20 w-[24rem] h-[24rem] rounded-full bg-[hsl(42_82%_45%_/_0.22)] blur-[110px] animate-aurora"
          style={{ animationDelay: "1.6s" }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none"
          aria-hidden
        >
          <span className="font-display text-[22rem] font-black text-[hsl(42_82%_55%)] leading-none">JH</span>
        </div>
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--gold)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)/0.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 78%)",
          }}
        />
      </div>

      <div className="max-w-md mx-auto w-full px-5 pt-6 pb-8 flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 animate-blur-in">
          <button
            onClick={handleBack}
            aria-label="Retour"
            className="p-2.5 rounded-2xl bg-white/[0.04] border border-[hsl(var(--gold)/0.2)] hover:border-[hsl(var(--gold)/0.5)] hover:bg-[hsl(var(--gold)/0.08)] transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div
                className="absolute inset-[-4px] rounded-2xl opacity-70 blur-[6px]"
                style={{
                  background:
                    "conic-gradient(from 0deg, hsl(42 82% 55%), hsl(45 92% 70%), hsl(152 72% 45%), hsl(42 82% 55%))",
                  animation: "orbit-ring 6s linear infinite",
                }}
              />
              <div
                className="relative w-11 h-11 rounded-2xl overflow-hidden ring-1 ring-[hsl(var(--gold)/0.4)]"
                style={{ boxShadow: "0 10px 30px -8px hsl(42 82% 45% / 0.5)" }}
              >
                <img src={jhLogo} alt="Jeux d'Hazard" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-[19px] font-bold leading-tight tracking-tight">
                <span className="gold-text">Créer un compte</span>
              </h1>
              <p className="text-[11px] text-foreground/55 mt-0.5">
                Étape <span className="text-[hsl(var(--gold))] font-bold">{step}</span> / {STEPS.length} · {meta.title}
              </p>
            </div>
          </div>
        </div>

        {/* Connected stepper */}
        <div className="relative mt-7 mb-6 animate-blur-in" style={{ animationDelay: "60ms" }}>
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[2px] bg-border/70 rounded-full" />
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 h-[2px] rounded-full gold-gradient transition-[width] duration-500 ease-out"
            style={{ width: `calc(${progressPct}% - 2rem)` }}
          />
          <ol className="relative flex items-center justify-between">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              const Icon = s.icon;
              return (
                <li key={s.title} className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => n < step && goTo(n)}
                    disabled={n > step}
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      active
                        ? "gold-gradient text-[hsl(158_60%_8%)] scale-110 shadow-[0_10px_25px_-8px_hsl(42_82%_45%/0.6)]"
                        : done
                        ? "bg-[hsl(var(--gold)/0.15)] border border-[hsl(var(--gold)/0.5)] text-[hsl(var(--gold))]"
                        : "bg-foreground/[0.04] border border-border text-foreground/40"
                    }`}
                    aria-label={s.title}
                  >
                    {done ? (
                      <Check className="w-4 h-4" strokeWidth={3} />
                    ) : (
                      <Icon className="w-4 h-4" strokeWidth={2.4} />
                    )}
                    {active && (
                      <span className="absolute inset-0 rounded-full border-2 border-[hsl(var(--gold)/0.4)] animate-pulse-ring" />
                    )}
                  </button>
                  <span
                    className={`text-[9px] uppercase tracking-[0.15em] font-bold transition-colors ${
                      active
                        ? "text-[hsl(var(--gold))]"
                        : done
                        ? "text-foreground/70"
                        : "text-foreground/35"
                    }`}
                  >
                    {s.title}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Card */}
        <div className="relative flex-1 flex flex-col">
          <div className="p-[1.5px] rounded-[28px] bg-gradient-to-br from-[hsl(var(--gold)/0.55)] via-[hsl(var(--gold)/0.08)] to-[hsl(var(--gold)/0.55)] shadow-[0_40px_100px_-25px_hsl(158_80%_2%/0.9)]">
            <div className="relative rounded-[26.5px] bg-[hsl(158_60%_5%_/_0.85)] backdrop-blur-2xl border border-[hsl(var(--gold)/0.15)] p-5 flex flex-col gap-4 overflow-hidden">
              {/* Step header inline */}
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 gold-gradient shadow-lg"
                  style={{ boxShadow: "0 10px 25px -10px hsl(42 82% 45% / 0.6)" }}
                >
                  <StepIcon className="w-5 h-5 text-[hsl(158_60%_8%)]" strokeWidth={2.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[17px] font-bold leading-tight">{meta.title}</h2>
                  <p className="text-[11px] text-foreground/55 mt-0.5">{meta.desc}</p>
                </div>
                <Sparkles className="w-4 h-4 text-[hsl(var(--gold))] shrink-0" />
              </div>

              {/* Step body — CSS-only slide animation */}
              <div
                key={step}
                className="space-y-4"
                style={{
                  animation: `${direction > 0 ? "step-in-right" : "step-in-left"} 0.42s cubic-bezier(0.16, 1, 0.3, 1)`,
                }}
              >
                {step === 1 && (
                  <>
                    <div className="flex gap-1 p-1 rounded-2xl bg-foreground/[0.05] border border-border/60">
                      {(["email", "phone"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setSignupMethod(m)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-300 ${
                            signupMethod === m
                              ? "gold-gradient text-[hsl(158_60%_8%)] shadow-[0_6px_18px_-6px_hsl(42_82%_45%/0.55)]"
                              : "text-foreground/50 hover:text-foreground/80"
                          }`}
                        >
                          {m === "email" ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          {m === "email" ? "Email" : "Téléphone"}
                        </button>
                      ))}
                    </div>

                    {signupMethod === "email" ? (
                      <div className="space-y-1.5">
                        <Label className={labelClass}>
                          <Mail className="w-3 h-3" /> Email
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                          <Input
                            type="email"
                            autoComplete="email"
                            placeholder="vous@exemple.com"
                            value={formData.email}
                            onChange={(e) => updateField("email", e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className={labelClass}>
                          <Phone className="w-3 h-3" /> Téléphone
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                          <Input
                            type="tel"
                            autoComplete="tel"
                            placeholder="+261 34 00 000 00"
                            value={formData.phone}
                            onChange={(e) => updateField("phone", e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className={labelClass}>
                        <Lock className="w-3 h-3" /> Mot de passe
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="8 caractères minimum"
                          value={formData.password}
                          onChange={(e) => updateField("password", e.target.value)}
                          className={`${inputClass} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition p-1"
                          aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password strength meter */}
                      {formData.password.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          <div className="flex gap-1">
                            {[0, 1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-1 flex-1 rounded-full transition-all duration-500"
                                style={{
                                  background:
                                    i < pwScore.score
                                      ? pwScore.color
                                      : "hsl(var(--border) / 0.7)",
                                  boxShadow:
                                    i < pwScore.score ? `0 0 8px ${pwScore.color}80` : "none",
                                }}
                              />
                            ))}
                          </div>
                          <p
                            className="text-[10px] uppercase tracking-[0.2em] font-bold"
                            style={{ color: pwScore.color }}
                          >
                            {pwScore.label}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className={labelClass}>
                        <ShieldCheck className="w-3 h-3" /> Confirmer
                      </Label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="Retapez le mot de passe"
                          value={formData.confirmPassword}
                          onChange={(e) => updateField("confirmPassword", e.target.value)}
                          className={inputClass}
                        />
                        {formData.confirmPassword.length > 0 && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {formData.confirmPassword === formData.password ? (
                              <Check className="w-4 h-4 text-[hsl(152_72%_45%)]" strokeWidth={3} />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-destructive/70" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-1.5">
                      <Label className={labelClass}>
                        <User className="w-3 h-3" /> Nom complet
                      </Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                        <Input
                          autoComplete="name"
                          placeholder="Votre nom complet"
                          value={formData.fullName}
                          onChange={(e) => updateField("fullName", e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>


                    <div className="space-y-1.5">
                      <Label className={labelClass}>
                        <User className="w-3 h-3" /> Sexe
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { v: "male", l: "Homme" },
                          { v: "female", l: "Femme" },
                          { v: "other", l: "Autre" },
                        ] as const).map((g) => (
                          <button
                            key={g.v}
                            type="button"
                            onClick={() => updateField("gender", g.v)}
                            className={`h-11 rounded-2xl border text-[12px] font-bold transition ${
                              formData.gender === g.v
                                ? "border-[hsl(var(--gold)/0.7)] bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]"
                                : "border-border/60 bg-foreground/[0.04] text-foreground/70 hover:border-[hsl(var(--gold)/0.4)]"
                            }`}
                          >
                            {g.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className={labelClass}>
                        <Phone className="w-3 h-3" /> Téléphone
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                        <Input
                          type="tel"
                          autoComplete="tel"
                          placeholder="+261 34 00 000 00"
                          value={formData.profilePhone || (signupMethod === "phone" ? formData.phone : "")}
                          onChange={(e) => updateField("profilePhone", e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>



                    <div className="space-y-1.5">
                      <Label className={labelClass}>
                        <Globe2 className="w-3 h-3" /> Pays
                      </Label>
                      <div className="relative">
                        <Globe2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none z-10" />
                        <select
                          value={formData.country}
                          onChange={(e) => updateField("country", e.target.value)}
                          className="w-full h-12 rounded-2xl bg-foreground/[0.04] border border-border/60 pl-11 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gold)/0.15)] focus:border-[hsl(var(--gold)/0.6)] appearance-none"
                        >
                          <option value="">Sélectionner un pays</option>
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedCountry && (
                      <div className="space-y-1.5">
                        <Label className={labelClass}>
                          <MapPin className="w-3 h-3" /> Capitale / Région
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                          <Input
                            placeholder={`ex: ${selectedCountry.capital}`}
                            value={formData.region}
                            onChange={(e) => updateField("region", e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className={labelClass}>
                        <Calendar className="w-3 h-3" /> Date de naissance
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                        <Input
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => updateField("birthDate", e.target.value)}
                          className={inputClass}
                          max={
                            new Date(new Date().setFullYear(new Date().getFullYear() - 18))
                              .toISOString()
                              .split("T")[0]
                          }
                        />
                      </div>
                      <p className="text-[10px] text-foreground/45 flex items-center gap-1.5 ml-0.5">
                        <ShieldCheck className="w-3 h-3" />
                        Réservé aux 18 ans et plus
                      </p>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <div className="flex flex-col items-center gap-5 py-3">
                    <label htmlFor="photo-upload" className="relative cursor-pointer group">
                      <div
                        className="absolute inset-[-10px] rounded-full pointer-events-none"
                        style={{
                          background:
                            "conic-gradient(from 0deg, hsl(42 82% 55%), hsl(45 92% 70%), hsl(152 72% 45%), hsl(158 65% 30%), hsl(42 82% 55%))",
                          filter: "blur(14px)",
                          opacity: 0.7,
                          animation: "orbit-ring 6s linear infinite",
                        }}
                      />
                      <div
                        className={`relative w-36 h-36 rounded-full overflow-hidden border-2 transition-all duration-300 ${
                          formData.profilePhotoPreview
                            ? "border-[hsl(var(--gold))]"
                            : "border-border group-hover:border-[hsl(var(--gold)/0.6)]"
                        }`}
                        style={{ boxShadow: "0 25px 60px -20px hsl(42 82% 40% / 0.55)" }}
                      >
                        {formData.profilePhotoPreview ? (
                          <>
                            <img
                              src={formData.profilePhotoPreview}
                              alt="Profil"
                              className="w-full h-full object-cover"
                            />
                            {validatingPhoto && (
                              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-6 h-6 text-[hsl(var(--gold))] animate-spin" />
                                <span className="text-[10px] uppercase tracking-widest text-white font-bold">
                                  Analyse IA
                                </span>
                              </div>
                            )}
                            {/* Scan sweep animation while analysing */}
                            {validatingPhoto && (
                              <span className="pointer-events-none absolute inset-x-0 h-1/2 bg-gradient-to-b from-[hsl(var(--gold)/0.35)] to-transparent animate-scan-sweep" />
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full bg-foreground/[0.04] flex flex-col items-center justify-center gap-2">
                            <Camera className="w-10 h-10 text-foreground/50 group-hover:text-[hsl(var(--gold))] transition-colors" />
                            <span className="text-[10px] text-foreground/60 uppercase tracking-[0.2em] font-bold">
                              Choisir
                            </span>
                          </div>
                        )}
                      </div>
                      {formData.profilePhotoPreview && !validatingPhoto && (
                        <div
                          className={`absolute bottom-1 right-1 w-9 h-9 rounded-full flex items-center justify-center shadow-xl border-2 border-card ${
                            photoValidated
                              ? "bg-[hsl(152_72%_45%)]"
                              : "bg-destructive"
                          }`}
                        >
                          <Check className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                      )}
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    <div className="text-center space-y-1">
                      <p className="font-display text-sm font-bold">
                        Appuyez pour ajouter votre photo
                      </p>
                      <p className="text-xs text-foreground/55">
                        {validatingPhoto
                          ? "Analyse IA du visage en cours…"
                          : photoValidated && formData.profilePhotoPreview
                          ? "Visage authentifié · Prêt à continuer"
                          : "Une photo réelle de votre visage"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-foreground/50">
                      <ShieldCheck className="w-3 h-3 text-[hsl(var(--gold))]" />
                      Chiffré · Confidentiel
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="flex flex-col items-center gap-6 py-3">
                    <div
                      className={`relative w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-500 ${
                        formData.notRobot
                          ? "gold-gradient shadow-[0_20px_50px_-10px_hsl(42_82%_45%/0.6)] scale-105"
                          : "bg-foreground/[0.04] border border-border"
                      }`}
                    >
                      {formData.notRobot && (
                        <span className="absolute inset-0 rounded-3xl animate-pulse-ring bg-[hsl(var(--gold)/0.25)]" />
                      )}
                      <ShieldCheck
                        className={`w-12 h-12 transition-colors duration-300 ${
                          formData.notRobot ? "text-[hsl(158_60%_8%)]" : "text-foreground/50"
                        }`}
                        strokeWidth={2.4}
                      />
                    </div>

                    <button
                      onClick={() => updateField("notRobot", !formData.notRobot)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 active:scale-[0.98] ${
                        formData.notRobot
                          ? "border-[hsl(var(--gold)/0.6)] bg-[hsl(var(--gold)/0.08)] shadow-[0_10px_30px_-10px_hsl(42_82%_45%/0.35)]"
                          : "border-border bg-foreground/[0.03] hover:border-[hsl(var(--gold)/0.35)]"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                          formData.notRobot
                            ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]"
                            : "border-foreground/30"
                        }`}
                      >
                        {formData.notRobot && (
                          <Check className="w-4 h-4 text-[hsl(158_60%_8%)]" strokeWidth={3} />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p
                          className={`text-sm font-bold ${
                            formData.notRobot ? "text-[hsl(var(--gold))]" : "text-foreground"
                          }`}
                        >
                          Je ne suis pas un robot
                        </p>
                        <p className="text-[10px] text-foreground/50 mt-0.5">
                          Vérification anti-automatisation
                        </p>
                      </div>
                    </button>

                    {/* Summary preview */}
                    <div className="w-full rounded-2xl bg-foreground/[0.03] border border-border/70 p-3.5 space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/55 font-bold">
                        Récapitulatif
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <SummaryRow label="Nom" value={formData.fullName || "—"} />
                        <SummaryRow
                          label="Contact"
                          value={
                            signupMethod === "email" ? formData.email || "—" : formData.phone || "—"
                          }
                        />
                        <SummaryRow
                          label="Pays"
                          value={selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : "—"}
                        />
                        <SummaryRow label="Photo" value={photoValidated ? "Validée ✓" : "—"} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div
                  className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 animate-blur-in"
                  role="alert"
                >
                  <p className="text-destructive text-xs text-center font-medium">{error}</p>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleNext}
                disabled={loading}
                className="group relative w-full h-13 py-4 rounded-2xl gold-gradient text-[hsl(158_60%_8%)] font-bold shadow-[0_20px_45px_-14px_hsl(42_82%_45%/0.6)] transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {loading ? (
                  <span className="relative inline-flex items-center justify-center gap-2 text-[14px]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création en cours…
                  </span>
                ) : step === 4 ? (
                  <span className="relative inline-flex items-center justify-center gap-2 text-[14px]">
                    <UserPlus className="w-4 h-4" />
                    Créer mon compte
                  </span>
                ) : (
                  <span className="relative inline-flex items-center justify-center gap-2 text-[14px]">
                    Continuer
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </button>

              {/* Step 1 footer */}
              {step === 1 && (
                <>
                  <p className="text-center text-xs text-foreground/55">
                    Déjà un compte ?{" "}
                    <button
                      onClick={() => navigate("/login")}
                      className="text-[hsl(var(--gold))] font-bold hover:brightness-110 transition"
                    >
                      Se connecter
                    </button>
                  </p>

                  <div className="relative pt-3 border-t border-border/60">
                    <button
                      onClick={() => navigate("/login")}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-border hover:border-[hsl(var(--gold)/0.4)] transition active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[hsl(var(--gold)/0.15)] border border-[hsl(var(--gold)/0.3)] flex items-center justify-center shrink-0">
                        <Search className="w-4 h-4 text-[hsl(var(--gold))]" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold">Retrouver un compte existant</p>
                        <p className="text-[10px] text-foreground/50 leading-snug">
                          Comptes déjà utilisés sur cet appareil
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-foreground/40" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-foreground/40">
            <ShieldCheck className="w-3 h-3" /> Sécurisé · Chiffré · J&H
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <p className="text-[9px] uppercase tracking-widest text-foreground/45">{label}</p>
    <p className="text-[12px] font-semibold truncate">{value}</p>
  </div>
);

export default Signup;
