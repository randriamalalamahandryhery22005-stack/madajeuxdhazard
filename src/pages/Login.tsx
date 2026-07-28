import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  Eye,
  EyeOff,
  Mail,
  Phone,
  Loader2,
  Lock,
  LogIn,
  UserPlus,
  ArrowLeft,
  ShieldCheck,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jhLogo from "@/assets/jh-logo.png";
import {
  getSavedAccounts,
  removeSavedAccount,
  rememberCurrentAccount,
  maskIdentifier,
  initialsFrom,
  type SavedAccount,
} from "@/lib/savedAccounts";


const emailSchema = z.object({
  identifier: z.string().trim().toLowerCase().email("Adresse email invalide").max(255, "Email trop long"),
  password: z.string().min(6, "Mot de passe : 6 caractères minimum").max(72, "Mot de passe trop long"),
});
const phoneSchema = z.object({
  identifier: z.string().trim().regex(/^\+?\d[\d\s().-]{6,20}$/, "Numéro de téléphone invalide"),
  password: z.string().min(6, "Mot de passe : 6 caractères minimum").max(72, "Mot de passe trop long"),
});

type View = "accounts" | "quick" | "other";

const Login = () => {
  const navigate = useNavigate();

  const [saved, setSaved] = useState<SavedAccount[]>([]);
  const [view, setView] = useState<View>("accounts");
  const [selected, setSelected] = useState<SavedAccount | null>(null);

  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // « Se souvenir de moi » : on restaure le choix + le dernier identifiant utilisé.
  useEffect(() => {
    const list = getSavedAccounts();
    setSaved(list);
    setView(list.length > 0 ? "accounts" : "other");
    try {
      const flag = localStorage.getItem("jh_remember_me");
      const remember = flag === null ? true : flag === "1";
      setRememberMe(remember);
      if (remember) {
        const last = localStorage.getItem("jh_last_identifier") || "";
        const lastMethod = localStorage.getItem("jh_last_method");
        if (last) setIdentifier(last);
        if (lastMethod === "phone" || lastMethod === "email") setLoginMethod(lastMethod);
      }
    } catch {
      /* no-op */
    }
  }, []);


  const heroTitle = useMemo(() => {
    if (view === "quick" && selected) return `Bonjour, ${selected.displayName.split(" ")[0]}`;
    if (view === "other") return saved.length ? "Nouveau compte" : "Se connecter";
    return "Vos comptes";
  }, [view, selected, saved.length]);

  const heroSub = useMemo(() => {
    if (view === "quick" && selected)
      return "Confirmez votre mot de passe pour continuer";
    if (view === "other") return "Entrez vos identifiants pour accéder à Jeux d'Hazard";
    return "Choisissez un compte pour vous reconnecter";
  }, [view, selected]);

  const doLogin = async (
    payload: { email?: string; phone?: string; password: string },
    fallback: { identifier: string; method: "email" | "phone"; displayName?: string }
  ) => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword(payload as any);
      if (error) throw error;
      if (data.user && rememberMe) {
        await rememberCurrentAccount(data.user.id, fallback);
      }
      if (data.user && !rememberMe) {
        removeSavedAccount(data.user.id);
      }
      try {
        localStorage.setItem("jh_remember_me", rememberMe ? "1" : "0");
        if (rememberMe) {
          localStorage.setItem("jh_last_identifier", fallback.identifier);
          localStorage.setItem("jh_last_method", fallback.method);
        } else {
          localStorage.removeItem("jh_last_identifier");
          localStorage.removeItem("jh_last_method");
        }
      } catch { /* no-op */ }

      toast.success("Connexion réussie !");
      navigate("/games");
    } catch (err: any) {
      setError(
        err.message === "Invalid login credentials"
          ? "Mot de passe incorrect"
          : err.message || "Connexion impossible"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (password.length < 6) {
      setError("Mot de passe : 6 caractères minimum");
      return;
    }
    const payload =
      selected.method === "email"
        ? { email: selected.identifier, password }
        : { phone: selected.identifier.replace(/[\s().-]/g, ""), password };
    await doLogin(payload, {
      identifier: selected.identifier,
      method: selected.method,
      displayName: selected.displayName,
    });
  };

  const handleOtherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const schema = loginMethod === "email" ? emailSchema : phoneSchema;
    const parsed = schema.safeParse({ identifier, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Données invalides");
      return;
    }
    const creds = parsed.data;
    const payload =
      loginMethod === "email"
        ? { email: creds.identifier, password: creds.password }
        : { phone: creds.identifier.replace(/[\s().-]/g, ""), password: creds.password };
    await doLogin(payload, { identifier: creds.identifier, method: loginMethod });
  };

  const handleRemove = (userId: string) => {
    removeSavedAccount(userId);
    const list = getSavedAccounts();
    setSaved(list);
    if (list.length === 0) setView("other");
    toast.success("Compte retiré de cet appareil");
  };

  const pickAccount = (acc: SavedAccount) => {
    setSelected(acc);
    setPassword("");
    setError("");
    setView("quick");
  };

  const goBackToAccounts = () => {
    setSelected(null);
    setPassword("");
    setError("");
    setIdentifier("");
    setView(saved.length > 0 ? "accounts" : "other");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden bg-[hsl(158_60%_3%)]">
      {/* Ambient — soft, less ornamental */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-[hsl(152_72%_28%_/_0.35)] blur-[110px] animate-aurora" />
        <div
          className="absolute -bottom-40 -left-24 w-[26rem] h-[26rem] rounded-full bg-[hsl(42_82%_45%_/_0.18)] blur-[120px] animate-aurora"
          style={{ animationDelay: "1.6s" }}
        />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5">
        <button
          onClick={view === "quick" || (view === "other" && saved.length > 0) ? goBackToAccounts : () => navigate("/")}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground/60 hover:text-[hsl(var(--gold))] transition p-2 -m-2"
          aria-label="Retour"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">
            {view === "quick" || (view === "other" && saved.length > 0) ? "Comptes" : "Accueil"}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl overflow-hidden ring-1 ring-[hsl(var(--gold)/0.4)] shadow-lg">
            <img src={jhLogo} alt="" className="w-full h-full object-cover" />
          </div>
          <span className="font-display text-[13px] font-bold gold-text">Jeux d'Hazard</span>
        </div>
        <span className="w-6" />
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-5 pt-8 pb-10">
        <div className="w-full max-w-[400px]">
          {/* Note discrète : comptes propres à cet appareil */}



          {/* Hero */}
          <div className="text-center mb-6 animate-blur-in">
            <h1 className="font-display text-[28px] font-bold tracking-tight leading-tight">
              <span className="gold-text">{heroTitle}</span>
            </h1>
            <p className="text-foreground/55 text-[13px] mt-1.5">{heroSub}</p>
          </div>

          {/* ============ VIEW: accounts list ============ */}
          {view === "accounts" && (
            <div className="space-y-3 stagger-up">
              <ul className="grid grid-cols-2 gap-3">
                {saved.map((acc) => (
                  <li key={acc.userId} className="relative group">
                    <button
                      onClick={() => pickAccount(acc)}
                      className="w-full flex flex-col items-center gap-3 p-4 rounded-3xl bg-[hsl(158_60%_6%_/_0.7)] backdrop-blur-xl border border-[hsl(var(--gold)/0.15)] hover:border-[hsl(var(--gold)/0.5)] hover:bg-[hsl(158_60%_8%_/_0.85)] transition-all active:scale-[0.97] shadow-lg"
                    >
                      <Avatar name={acc.displayName} url={acc.avatarUrl} />
                      <div className="min-w-0 w-full text-center">
                        <p className="text-[13px] font-bold truncate text-foreground">
                          {acc.displayName}
                        </p>
                        <p className="text-[10px] text-foreground/45 truncate mt-0.5">
                          {maskIdentifier(acc.identifier, acc.method)}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Retirer ${acc.displayName} de cet appareil ?`)) {
                          handleRemove(acc.userId);
                        }
                      }}
                      className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-[hsl(158_60%_5%)] border border-destructive/60 flex items-center justify-center text-destructive shadow-lg hover:bg-destructive hover:text-white active:scale-90 transition z-10"
                      aria-label={`Supprimer ${acc.displayName} de cet appareil`}
                      title="Supprimer ce compte de l'appareil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
                {/* Add-account tile */}
                <li>
                  <button
                    onClick={() => {
                      setView("other");
                      setIdentifier("");
                      setPassword("");
                      setError("");
                    }}
                    className="w-full h-full min-h-[136px] flex flex-col items-center justify-center gap-2.5 p-4 rounded-3xl border border-dashed border-[hsl(var(--gold)/0.35)] hover:border-[hsl(var(--gold)/0.7)] bg-[hsl(158_60%_6%_/_0.35)] hover:bg-[hsl(158_60%_8%_/_0.6)] transition active:scale-[0.97]"
                  >
                    <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center shadow-[0_10px_25px_-8px_hsl(42_82%_45%/0.55)]">
                      <Plus className="w-5 h-5 text-[hsl(158_60%_8%)]" strokeWidth={2.6} />
                    </div>
                    <span className="text-[12px] font-bold text-foreground/80 text-center leading-tight">
                      Se connecter avec<br />un autre compte
                    </span>
                  </button>
                </li>
              </ul>

              <button
                onClick={() => navigate("/signup")}
                className="w-full h-12 mt-4 rounded-2xl border border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.06)] hover:bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold-soft))] font-bold text-[14px] flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" />
                Créer un nouveau compte
              </button>
            </div>
          )}

          {/* ============ VIEW: quick login (known account) ============ */}
          {view === "quick" && selected && (
            <div className="space-y-4 animate-blur-in">
              <div className="flex items-center gap-4 p-4 rounded-3xl bg-[hsl(158_60%_6%_/_0.7)] backdrop-blur-xl border border-[hsl(var(--gold)/0.25)] shadow-xl">
                <Avatar name={selected.displayName} url={selected.avatarUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold truncate">{selected.displayName}</p>
                  <p className="text-[11px] text-foreground/55 truncate">
                    {maskIdentifier(selected.identifier, selected.method)}
                  </p>
                </div>
                <button
                  onClick={goBackToAccounts}
                  className="text-[11px] font-bold text-[hsl(var(--gold-soft))] hover:text-[hsl(var(--gold))] px-2 py-1"
                >
                  Changer
                </button>
              </div>

              <form onSubmit={handleQuickLogin} className="space-y-3">
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none group-focus-within:text-[hsl(var(--gold))] transition" />
                  <Input
                    autoFocus
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-13 bg-white/[0.04] border-[hsl(var(--gold)/0.15)] pl-11 pr-12 rounded-2xl text-[15px] placeholder:text-foreground/30 focus:border-[hsl(var(--gold)/0.6)] focus:ring-2 focus:ring-[hsl(var(--gold)/0.15)] py-3.5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-[hsl(var(--gold))] transition p-1"
                    aria-label={showPassword ? "Cacher" : "Afficher"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 animate-blur-in">
                    <p className="text-destructive text-[12px] text-center font-medium">{error}</p>
                  </div>
                )}

                <PrimaryButton loading={loading}>
                  <LogIn className="w-4 h-4" /> Continuer
                </PrimaryButton>

                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="w-full text-center text-[12px] font-semibold text-foreground/55 hover:text-[hsl(var(--gold))] transition py-2"
                >
                  Mot de passe oublié ?
                </button>
              </form>

              <button
                onClick={() => navigate("/signup")}
                className="w-full h-12 rounded-2xl border border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.06)] hover:bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold-soft))] font-bold text-[13px] flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" />
                Créer un nouveau compte
              </button>
            </div>
          )}

          {/* ============ VIEW: other / manual login ============ */}
          {view === "other" && (
            <div className="space-y-4 animate-blur-in">
              <div className="p-1 rounded-2xl bg-black/40 border border-[hsl(var(--gold)/0.15)] flex gap-1">
                {(["email", "phone"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLoginMethod(m)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                      loginMethod === m
                        ? "gold-gradient text-[hsl(158_60%_8%)] shadow-[0_6px_18px_-4px_hsl(42_82%_45%/0.55)]"
                        : "text-foreground/50 hover:text-foreground/80"
                    }`}
                  >
                    {m === "email" ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    {m === "email" ? "Email" : "Téléphone"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleOtherLogin} className="space-y-3">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none group-focus-within:text-[hsl(var(--gold))] transition">
                    {loginMethod === "email" ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </div>
                  <Input
                    type={loginMethod === "email" ? "email" : "tel"}
                    autoComplete={loginMethod === "email" ? "email" : "tel"}
                    placeholder={loginMethod === "email" ? "Adresse email" : "Numéro de téléphone"}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-13 bg-white/[0.04] border-[hsl(var(--gold)/0.15)] pl-11 rounded-2xl text-[15px] placeholder:text-foreground/30 focus:border-[hsl(var(--gold)/0.6)] focus:ring-2 focus:ring-[hsl(var(--gold)/0.15)] py-3.5"
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none group-focus-within:text-[hsl(var(--gold))] transition" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-13 bg-white/[0.04] border-[hsl(var(--gold)/0.15)] pl-11 pr-12 rounded-2xl text-[15px] placeholder:text-foreground/30 focus:border-[hsl(var(--gold)/0.6)] focus:ring-2 focus:ring-[hsl(var(--gold)/0.15)] py-3.5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-[hsl(var(--gold))] transition p-1"
                    aria-label={showPassword ? "Cacher" : "Afficher"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 animate-blur-in">
                    <p className="text-destructive text-[12px] text-center font-medium">{error}</p>
                  </div>
                )}

                <label className="flex items-center gap-2.5 px-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-[hsl(var(--gold))]"
                  />
                  <span className="text-[12px] font-semibold text-foreground/70">Se souvenir de moi</span>
                </label>


                <PrimaryButton loading={loading}>
                  <LogIn className="w-4 h-4" /> Se connecter
                </PrimaryButton>

                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="w-full text-center text-[12px] font-semibold text-foreground/55 hover:text-[hsl(var(--gold))] transition py-2"
                >
                  Mot de passe oublié ?
                </button>
              </form>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[hsl(var(--gold)/0.15)]" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-foreground/40 font-bold">ou</span>
                <div className="flex-1 h-px bg-[hsl(var(--gold)/0.15)]" />
              </div>

              <button
                onClick={() => navigate("/signup")}
                className="w-full h-12 rounded-2xl border border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.06)] hover:bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold-soft))] font-bold text-[14px] flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" />
                Créer un nouveau compte
              </button>
            </div>
          )}

          <p className="mt-8 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-foreground/40">
            <ShieldCheck className="w-3 h-3 text-[hsl(var(--gold))]" />
            Sécurisé · Chiffré · Jeux d'Hazard
          </p>
        </div>
      </main>
    </div>


  );
};

/* --------- Sub components --------- */

const Avatar = ({
  name,
  url,
  size = "md",
}: {
  name: string;
  url: string | null;
  size?: "md" | "lg";
}) => {
  const dim = size === "lg" ? "w-14 h-14 text-[16px]" : "w-16 h-16 text-[18px]";
  return (
    <div
      className={`${dim} rounded-full overflow-hidden ring-2 ring-[hsl(var(--gold)/0.4)] shadow-[0_10px_30px_-10px_hsl(42_82%_45%/0.45)] shrink-0`}
    >
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full gold-gradient flex items-center justify-center text-[hsl(158_60%_8%)] font-black">
          {initialsFrom(name)}
        </div>
      )}
    </div>
  );
};

const PrimaryButton = ({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="submit"
    disabled={loading}
    className="group relative w-full h-13 py-4 rounded-2xl gold-gradient text-[hsl(158_60%_8%)] font-bold shadow-[0_20px_40px_-12px_hsl(42_82%_45%_/_0.55)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden font-display"
  >
    <span className="pointer-events-none absolute -inset-y-2 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 group-hover:opacity-100 group-hover:[animation:premium-sweep_1.4s_ease-in-out_infinite]" />
    {loading ? (
      <Loader2 className="w-5 h-5 animate-spin mx-auto relative" />
    ) : (
      <span className="relative inline-flex items-center justify-center gap-2 text-[15px] uppercase tracking-[0.14em]">
        {children}
      </span>
    )}
  </button>
);

export default Login;
