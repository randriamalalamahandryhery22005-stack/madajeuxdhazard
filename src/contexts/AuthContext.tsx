import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { usePresence } from "@/hooks/usePresence";

/** Appel d'une fonction sécurisée côté base (hors types générés). */
const rpc = (name: string, args?: Record<string, unknown>) =>
  (supabase.rpc as unknown as (n: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
    name,
    args,
  );



interface UserProfile {
  id: string;
  full_name: string;
  name?: string | null;
  email?: string | null;
  country_code: string | null;
  region: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  trial_started_at?: string | null;
}

export const TRIAL_DURATION_MS = 15 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  accessCodeRequired: boolean;
  accessCodeVerified: boolean;
  verifyAccessCode: (code: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isAdmin: false,
  loading: true,
  accessCodeRequired: false,
  accessCodeVerified: false,
  verifyAccessCode: async () => false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessCodeRequired, setAccessCodeRequired] = useState(false);
  const [accessCodeVerified, setAccessCodeVerified] = useState(false);
  const [currentAccessCode, setCurrentAccessCode] = useState("");

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) setProfile(data as UserProfile);
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const admin = !!data;
    setIsAdmin(admin);
    return admin;
  };

  // Le code d'accès application est un secret : il n'est jamais téléchargé
  // côté client. On interroge uniquement « un code est-il exigé ? » puis on
  // fait vérifier la saisie par le serveur (fonction sécurisée).
  const checkAccessCode = async () => {
    const { data, error } = await rpc("app_access_code_required");
    if (!error) {
      const required = data === true;
      setAccessCodeRequired(required);
      return required ? "required" : "";
    }
    // Repli tant que la fonction sécurisée n'est pas déployée.
    const { data: row } = await supabase
      .from("activation_codes")
      .select("code_value")
      .eq("code_name", "app_access")
      .maybeSingle();
    const code = row?.code_value || "";
    setCurrentAccessCode(code);
    setAccessCodeRequired(code.length > 0);
    return code;
  };

  const verifyAccessCode = async (code: string): Promise<boolean> => {
    const { data, error } = await rpc("verify_app_access_code", { _code: code });
    if (!error) {
      const ok = data === true;
      if (ok) setAccessCodeVerified(true);
      return ok;
    }
    if (currentAccessCode && code === currentAccessCode) {
      setAccessCodeVerified(true);
      return true;
    }
    return false;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await checkAdmin(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            await fetchProfile(session.user.id);
            const admin = await checkAdmin(session.user.id);
            await checkAccessCode();
            // Admins bypass access code
            if (admin) setAccessCodeVerified(true);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setAccessCodeVerified(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // « Se souvenir de moi » : sans cette option, la session n'est pas
      // réutilisée à la réouverture de l'application (nouvel onglet/lancement).
      let remembered = true;
      let firstOpen = false;
      try {
        remembered = localStorage.getItem("jh_remember_me") !== "0";
        firstOpen = sessionStorage.getItem("jh_app_open") !== "1";
        sessionStorage.setItem("jh_app_open", "1");
      } catch { /* no-op */ }

      if (session && !remembered && firstOpen) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setAccessCodeVerified(false);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // On attend la vérification du rôle avant de lever l'état de chargement,
        // sinon les routes protégées (ex. /admin) redirigent trop tôt.
        await fetchProfile(session.user.id);
        const admin = await checkAdmin(session.user.id);
        if (admin) setAccessCodeVerified(true);
        await checkAccessCode();
      }
      setLoading(false);
    });


    // Listen for access code changes in realtime
    const codeChannel = supabase
      .channel('access-code-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activation_codes' }, async () => {
        const code = await checkAccessCode();
        // If code changed, reset verification for non-admins
        if (code && !isAdmin) {
          setAccessCodeVerified(false);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(codeChannel);
    };
  }, []);

  const signOut = async () => {
    if (user) {
      await supabase.from("online_users").delete().eq("user_id", user.id);
      // Log logout event
      await supabase.from("login_history").insert({
        user_id: user.id,
        event_type: "logout",
        device_info: `${navigator.platform || ""} · ${navigator.userAgent.slice(0, 90)}`,
      });
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setAccessCodeVerified(false);
  };

  usePresence(user?.id ?? null);

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, loading, accessCodeRequired, accessCodeVerified, verifyAccessCode, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
