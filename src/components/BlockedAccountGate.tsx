import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SecurityChatPanel from "@/components/SecurityChatPanel";
import { ensureSecurityConversation } from "@/lib/accountSecurity";
import { ShieldAlert } from "lucide-react";

/**
 * Écran de blocage affiché lorsqu'un compte est bloqué par la sécurité.
 * L'utilisateur peut uniquement dialoguer avec l'administrateur.
 */
export default function BlockedAccountGate() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || isAdmin) { setBlocked(false); return; }
    let alive = true;
    const check = async () => {
      const { data } = await supabase.from("profiles").select("status,full_name,name").eq("user_id", user.id).maybeSingle();
      if (!alive) return;
      const row = data as { status?: string; full_name?: string | null; name?: string | null } | null;
      const isBlocked = row?.status === "blocked";
      setBlocked(isBlocked);
      if (isBlocked) {
        const id = await ensureSecurityConversation(user.id, row?.full_name || row?.name || "Compte Premium");
        if (alive) setConversationId(id);
      }
    };
    check();
    const ch = supabase
      .channel(`blocked-watch-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, check)
      .subscribe();
    return () => { alive = false; try { supabase.removeChannel(ch); } catch { /* noop */ } };
  }, [user, isAdmin, profile?.id]);

  if (!user || !blocked) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-md overflow-y-auto">
      <div className="max-w-md mx-auto px-4 py-10 space-y-4 text-white">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-rose-300" />
          </div>
          <h1 className="text-lg font-bold">Compte bloqué (sécurité Premium)</h1>
          <p className="text-sm text-slate-400">
            Votre abonnement Premium a été utilisé sur plus de 3 appareils différents.
            Seul l'administrateur peut réactiver le compte. Vous pouvez lui écrire ci-dessous.
          </p>
        </div>
        {conversationId ? (
          <SecurityChatPanel conversationId={conversationId} meId={user.id} height="22rem" />
        ) : (
          <p className="text-center text-sm text-slate-400">Ouverture du canal sécurisé...</p>
        )}
        <button
          onClick={() => void signOut()}
          className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
