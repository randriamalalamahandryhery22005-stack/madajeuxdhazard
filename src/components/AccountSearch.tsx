import { useState, useEffect, useRef } from "react";
import { Search, X, LogIn, KeyRound, User as UserIcon, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AccountResult {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  email_masked: string | null;
  phone_masked: string | null;
  email: string | null;
}

const AccountSearch = ({ onClose }: { onClose?: () => void }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AccountResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AccountResult | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

  // Esc to close
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const myId = ++reqIdRef.current;
    debounceRef.current = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("search-accounts", {
          body: { query: q },
        });
        if (myId !== reqIdRef.current) return; // stale
        if (error) throw error;
        setResults(data?.results || []);
      } catch (e: any) {
        if (myId !== reqIdRef.current) return;
        setError("Recherche indisponible. Réessayez.");
        setResults([]);
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSignIn = async () => {
    if (!selected?.email) { toast.error("Aucun email associé à ce compte"); return; }
    if (password.length < 6) { toast.error("Mot de passe trop court"); return; }
    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: selected.email, password });
      if (error) throw error;
      toast.success("Connexion réussie");
      navigate("/games");
    } catch (err: any) {
      toast.error(err.message === "Invalid login credentials" ? "Mot de passe incorrect" : err.message);
    } finally {
      setSigningIn(false);
    }
  };

  if (selected) {
    return (
      <div className="space-y-5">
        <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Retour à la recherche
        </button>

        <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-gradient-to-br from-primary/15 via-card/80 to-primary/5 border border-primary/30 backdrop-blur shadow-xl">
          {selected.avatar_url ? (
            <img src={selected.avatar_url} alt={selected.full_name}
              className="w-24 h-24 rounded-full object-cover border-2 border-primary/50 shadow-lg" />
          ) : (
            <div className="w-24 h-24 rounded-full gold-gradient flex items-center justify-center shadow-lg">
              <UserIcon className="w-12 h-12 text-primary-foreground" />
            </div>
          )}
          <div className="text-center">
            <p className="font-black text-xl">{selected.full_name}</p>
            {selected.email_masked && <p className="text-xs text-muted-foreground font-mono mt-1">{selected.email_masked}</p>}
            {selected.phone_masked && <p className="text-xs text-muted-foreground font-mono">{selected.phone_masked}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Mot de passe</Label>
          <div className="relative">
            <Input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" className="h-12 bg-secondary/80 border-border/50 pr-11"
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()} autoFocus />
            <button onClick={() => setShowPw(!showPw)} type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button variant="premium" className="w-full h-12" onClick={handleSignIn} disabled={signingIn}>
          {signingIn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
          {signingIn ? "Connexion..." : "Se connecter"}
        </Button>

      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, email ou téléphone..."
          className="h-12 bg-secondary/80 border-border/50 pl-11 pr-11 text-base" />
        {query && (
          <button onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="min-h-[180px]">
        {loading && (
          <ul className="space-y-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-card/60 border border-border/30 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded bg-secondary w-1/2" />
                  <div className="h-2 rounded bg-secondary/60 w-2/3" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && error && (
          <p className="text-center text-sm text-destructive py-8">{error}</p>
        )}

        {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-secondary/50 border border-border/40 flex items-center justify-center">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Aucun compte pour « {query} »</p>
          </div>
        )}

        {!loading && query.trim().length < 2 && (
          <p className="text-center text-xs text-muted-foreground py-8">
            Saisissez au moins 2 caractères pour rechercher
          </p>
        )}

        {!loading && results.length > 0 && (
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.user_id}>
                <button onClick={() => setSelected(r)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40 hover:border-primary/50 hover:bg-card/80 transition-all active:scale-[0.98]">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt={r.full_name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-sm truncate">{r.full_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate font-mono">
                      {r.email_masked || r.phone_masked}
                    </p>
                  </div>
                  <LogIn className="w-4 h-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AccountSearch;
