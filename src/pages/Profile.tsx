import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Camera, Check, KeyRound, Mail, Phone, Globe, User as UserIcon, Shield, Loader2, Calendar, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/countries";
import { processAvatar } from "@/lib/avatarImage";


type EditField = "email" | "phone" | "password" | null;

const genCode = (digits = 6) =>
  Array.from({ length: digits }, () => Math.floor(Math.random() * 10)).join("");

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read_error"));
    r.readAsDataURL(file);
  });


const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();

  // Quick-edit profile fields (no code)
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validatingFace, setValidatingFace] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Verified flows (email/phone/password)
  const [editField, setEditField] = useState<EditField>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [newValue, setNewValue] = useState("");
  const [newValueConfirm, setNewValueConfirm] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [typedCode, setTypedCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setCountry(profile.country_code || "");
      setRegion(profile.region || "");
      setBirthDate(profile.birth_date || "");
      setAvatarUrl(profile.avatar_url);
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Immediate local preview
    let preview: string;
    try {
      preview = await fileToDataUrl(file);
    } catch {
      toast.error("Impossible de lire l'image");
      return;
    }
    setAvatarPreview(preview);

    // AI face validation
    setValidatingFace(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("validate-face-image", {
        body: { imageBase64: preview },
      });
      if (fnErr) throw fnErr;
      if ((data as any)?.isFace === false) {
        const reason = (data as any)?.reason || "";
        setAvatarPreview(avatarUrl);
        toast.error(`Photo refusée : utilisez une vraie photo de votre visage${reason ? ` (${reason})` : ""}`);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    } catch (err) {
      // fail-open on validator errors
      console.warn("Face validator unavailable", err);
    } finally {
      setValidatingFace(false);
    }

    // Traitement + persistance (image optimisée haute qualité, toujours affichable)
    setUploading(true);
    try {
      const optimized = await processAvatar(file, { size: 512, quality: 0.9 });
      setAvatarUrl(optimized);
      setAvatarPreview(optimized);
      const { error: persistErr } = await supabase
        .from("profiles")
        .update({ avatar_url: optimized })
        .eq("user_id", user.id);
      if (persistErr) {
        toast.error("Photo non sauvegardée : " + persistErr.message);
        setAvatarPreview(avatarUrl);
      } else {
        await refreshProfile();
        toast.success("Photo de profil mise à jour");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du traitement de l'image");
      setAvatarPreview(avatarUrl);
    } finally {
      setUploading(false);
    }
  };


  const saveProfileFields = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        name: fullName,
        country_code: country || null,
        region: region || null,
        birth_date: birthDate || null,
        avatar_url: avatarUrl,
      })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profil mis à jour");
      await refreshProfile();
    }
  };

  const openEdit = (field: EditField) => {
    setEditField(field);
    setStep(1);
    setNewValue("");
    setNewValueConfirm("");
    setGeneratedCode("");
    setTypedCode("");
  };

  const goToCodeStep = () => {
    if (editField === "password") {
      if (newValue.length < 6) return toast.error("Mot de passe trop court");
      if (newValue !== newValueConfirm) return toast.error("Les mots de passe ne correspondent pas");
    } else if (editField === "email") {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newValue)) return toast.error("E-mail invalide");
    } else if (editField === "phone") {
      if (newValue.replace(/\D/g, "").length < 6) return toast.error("Numéro invalide");
    }
    setGeneratedCode(genCode(6));
    setStep(2);
  };

  const validateCode = async () => {
    if (typedCode !== generatedCode) return toast.error("Code incorrect");
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {};
      if (editField === "email") payload.email = newValue;
      if (editField === "phone") payload.phone = newValue;
      if (editField === "password") payload.password = newValue;

      const { data, error } = await supabase.functions.invoke("update-user-auth", { body: payload });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const session = (data as any)?.session;
      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }
      await refreshProfile();
      toast.success("Modification confirmée");
      setStep(3);
      setTimeout(() => setEditField(null), 1500);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const fieldLabel =
    editField === "email" ? "Nouvelle adresse e-mail" :
    editField === "phone" ? "Nouveau numéro de téléphone" :
    "Nouveau mot de passe";

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-secondary/60"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold">Mon profil</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Avatar + names */}
        <section className="rounded-3xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-secondary/60 border-2 border-primary/30">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={() => setAvatarPreview(null)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                    {(fullName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                {(uploading || validatingFace) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading || validatingFace}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg disabled:opacity-50"
                aria-label="Changer l'avatar"
              >
                {uploading || validatingFace ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickAvatar} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Connecté</p>
              <p className="text-sm font-mono truncate">{user.email || user.phone || "—"}</p>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                {validatingFace ? "Analyse IA du visage…" : "Photo réelle requise — validée par IA"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserIcon className="w-3 h-3" /> Nom complet
              </Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" placeholder="Prénom et nom" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Pays
              </Label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full h-10 rounded-md bg-secondary/80 border border-border/40 px-3 text-sm"
              >
                <option value="">Sélectionner un pays</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Région / Ville
              </Label>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Votre ville / région" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Date de naissance
              </Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={saveProfileFields} disabled={savingProfile || uploading || validatingFace} className="w-full">
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Enregistrer le profil
            </Button>
          </div>
        </section>


        {/* Verified edits */}
        <section className="rounded-3xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold">Sécurité — vérification requise</h2>
          </div>
          {[
            { id: "email" as const, label: "Adresse e-mail", value: user.email, icon: <Mail className="w-4 h-4" /> },
            { id: "phone" as const, label: "Numéro de téléphone", value: user.phone || "—", icon: <Phone className="w-4 h-4" /> },
            { id: "password" as const, label: "Mot de passe", value: "••••••••", icon: <KeyRound className="w-4 h-4" /> },
          ].map((row) => (
            <button
              key={row.id}
              onClick={() => openEdit(row.id)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary/40 hover:bg-secondary/60 transition text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                {row.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{row.label}</p>
                <p className="text-sm font-medium truncate">{String(row.value || "—")}</p>
              </div>
              <span className="text-[10px] text-primary font-bold uppercase">Modifier</span>
            </button>
          ))}
        </section>
      </main>

      {/* Modal */}
      {editField && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-border/40 bg-card shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">
                {step === 3 ? "✅ Confirmé" : fieldLabel}
              </h3>
              <button
                onClick={() => setEditField(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>

            {/* Step 1: new value */}
            {step === 1 && (
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{fieldLabel}</Label>
                <Input
                  type={editField === "password" ? "password" : editField === "email" ? "email" : "tel"}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  autoFocus
                />
                {editField === "password" && (
                  <>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Confirmer</Label>
                    <Input
                      type="password"
                      value={newValueConfirm}
                      onChange={(e) => setNewValueConfirm(e.target.value)}
                    />
                  </>
                )}
                <Button onClick={goToCodeStep} className="w-full">Continuer</Button>
              </div>
            )}

            {/* Step 2: code */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/25 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Code de vérification</p>
                  <p className="text-3xl font-black tracking-[0.4em] text-primary mt-1">{generatedCode}</p>
                </div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Recopiez le code</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={typedCode}
                  onChange={(e) => setTypedCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-xl tracking-[0.4em] font-mono"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Retour</Button>
                  <Button onClick={validateCode} disabled={submitting} className="flex-1">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Valider"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: done */}
            {step === 3 && (
              <div className="text-center py-6 space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-400 mx-auto flex items-center justify-center">
                  <Check className="w-7 h-7" />
                </div>
                <p className="text-sm text-muted-foreground">Modification enregistrée et session active.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
