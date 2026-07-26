import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crown, CheckCircle2, Copy, ShieldCheck, Wallet, Phone, Upload, Clock,
  ArrowRight, ArrowLeft, Sparkles, Send, MessageSquare, Image as ImageIcon,
  Loader2, X, Infinity as InfinityIcon, BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { grantSubscriptionCoins } from "@/lib/coins";

export interface SubscriptionWizardProps {
  gameMode: string;
  gameName: string;
  days: number;         // 0 = à vie
  price: number;
  lifetime?: boolean;
  onAccessGranted: () => void;
  onCancel?: () => void;
}

type StepKey = "recap" | "pay" | "proof" | "track";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "recap", label: "Offre" },
  { key: "pay", label: "Paiement" },
  { key: "proof", label: "Preuve" },
  { key: "track", label: "Suivi" },
];

const OPERATORS = [
  { id: "airtel", name: "Airtel Money", number: "0336756185", display: "0336 756 185", tone: "amber" as const },
  { id: "yas", name: "Yas Money", number: "0383955105", display: "0383 955 105", tone: "emerald" as const },
];

interface ChatMessage {
  id: string;
  message: string | null;
  image_url: string | null;
  status: string;
  admin_response: string | null;
  created_at: string;
}

const SubscriptionWizard = ({
  gameMode, gameName, days, price, lifetime, onAccessGranted, onCancel,
}: SubscriptionWizardProps) => {
  const { user, isAdmin } = useAuth();
  const [step, setStep] = useState<StepKey>("recap");
  const [operator, setOperator] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [senderPhone, setSenderPhone] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofSent, setProofSent] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const reference = useMemo(
    () => (requestId ? requestId.slice(0, 8).toUpperCase() : null),
    [requestId]
  );
  const op = OPERATORS.find((o) => o.id === operator) ?? null;

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("game_mode", gameMode)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
  }, [user, gameMode]);

  // Accès admin : déblocage immédiat
  useEffect(() => { if (isAdmin) onAccessGranted(); }, [isAdmin]);

  // Reprise d'une demande en attente + temps réel
  useEffect(() => {
    if (!user) return;
    let alive = true;

    const restore = async () => {
      const { data: active } = await supabase
        .from("game_access").select("*")
        .eq("user_id", user.id).eq("game_mode", gameMode).eq("is_active", true)
        .order("granted_at", { ascending: false }).limit(1);
      const a = active?.[0];
      if (a && a.granted_by && (!a.expires_at || new Date(a.expires_at) > new Date())) {
        onAccessGranted();
        return;
      }
      const { data: pending } = await supabase
        .from("game_access").select("*")
        .eq("user_id", user.id).eq("game_mode", gameMode)
        .eq("is_active", false).is("granted_by", null)
        .order("granted_at", { ascending: false }).limit(1);
      if (alive && pending?.[0]) {
        setRequestId(pending[0].id);
        setProofSent(!!(pending[0] as any).payment_proof_url);
        setStep("track");
      }
    };
    restore();
    fetchMessages();

    const channel = supabase
      .channel(`sub-wizard-${gameMode}-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_access", filter: `user_id=eq.${user.id}` }, (payload) => {
        const rec = payload.new as any;
        if (rec?.game_mode !== gameMode) return;
        if (rec?.is_active && rec?.granted_by) {
          toast.success("Abonnement activé ! Bon jeu 🎉");
          const d = rec.expires_at
            ? Math.max(1, Math.ceil((new Date(rec.expires_at).getTime() - Date.now()) / 86400000))
            : 0;
          grantSubscriptionCoins(user.id, { days: d, lifetime: !rec.expires_at, expiresAt: rec.expires_at }).catch(() => {});
          onAccessGranted();
        } else if (rec?.rejection_reason) {
          toast.error("Demande refusée", { description: rec.rejection_reason });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `user_id=eq.${user.id}` }, () => fetchMessages())
      .subscribe();

    return () => { alive = false; supabase.removeChannel(channel); };
  }, [user, gameMode]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success("Copié !");
      setTimeout(() => setCopied(null), 1600);
    } catch { toast.error("Impossible de copier"); }
  };

  /** Crée la demande d'abonnement (statut : en attente de validation admin). */
  const createRequest = async () => {
    if (!user) { toast.error("Connectez-vous pour continuer"); return; }
    if (requestId) { setStep("pay"); return; }
    setCreating(true);
    const { data, error } = await supabase.from("game_access").insert({
      user_id: user.id,
      game_mode: gameMode,
      is_active: false,
      expires_at: lifetime ? null : new Date(Date.now() + days * 86400000).toISOString(),
      price_amount: price,
      days_requested: lifetime ? 0 : days,
    } as any).select().single();
    setCreating(false);
    if (error) { toast.error("Erreur", { description: error.message }); return; }
    setRequestId(data.id);
    setStep("pay");
  };

  const pickProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const sendProof = async () => {
    if (!user || !requestId || !proofFile) return;
    setUploading(true);
    const ext = proofFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/${requestId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("payment-proofs").upload(path, proofFile, { upsert: true });
    if (upErr) { toast.error("Envoi impossible", { description: upErr.message }); setUploading(false); return; }
    const { data: signed } = await supabase.storage
      .from("payment-proofs").createSignedUrl(path, 60 * 60 * 24 * 365);
    const proofUrl = signed?.signedUrl ?? null;

    await supabase.from("game_access")
      .update({ payment_proof_url: proofUrl } as any)
      .eq("id", requestId);

    await supabase.from("chat_messages").insert({
      user_id: user.id,
      game_mode: gameMode,
      message: `Preuve de paiement · ${gameName} · Réf ${reference}${senderPhone ? ` · Envoyé depuis ${senderPhone}` : ""}${op ? ` · ${op.name}` : ""}`,
      image_url: proofUrl,
      status: "pending",
    });

    setUploading(false);
    setProofSent(true);
    setStep("track");
    fetchMessages();
    toast.success("Preuve envoyée — validation en cours");
  };

  const sendChat = async () => {
    if (!user || !chatText.trim()) return;
    setSendingChat(true);
    await supabase.from("chat_messages").insert({
      user_id: user.id, game_mode: gameMode, message: chatText.trim(), image_url: null, status: "pending",
    });
    setChatText("");
    setSendingChat(false);
    fetchMessages();
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 pb-24">
      {/* En-tête + progression */}
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25">
          {lifetime ? <InfinityIcon className="w-3 h-3 text-primary" /> : <Crown className="w-3 h-3 text-primary" />}
          <span className="text-[10px] uppercase tracking-widest font-bold text-primary">
            {lifetime ? "Premium à vie" : `Premium ${days} jours`}
          </span>
        </div>
        {onCancel && step !== "track" && (
          <button onClick={onCancel} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary/60">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="h-1.5 w-full rounded-full bg-secondary/70 overflow-hidden">
          <div
            className="h-full gold-gradient transition-all duration-500"
            style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`text-[9px] uppercase tracking-widest font-bold ${
                i <= stepIdx ? "text-primary" : "text-muted-foreground/40"
              }`}
            >
              {i < stepIdx ? "✓ " : ""}{s.label}
            </span>
          ))}
        </div>
      </div>

      {/* ÉTAPE 1 — Récapitulatif */}
      {step === "recap" && (
        <div className="space-y-5 animate-fade-in">
          <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card/70 to-card p-5 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Votre formule</p>
            <h2 className="text-2xl font-black">{lifetime ? "Premium À Vie" : `Premium ${days} jours`}</h2>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black gold-text leading-none">{price.toLocaleString()}</span>
              <span className="text-sm font-semibold text-muted-foreground pb-1">Ar</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {lifetime
                ? "Paiement unique · accès permanent, sans expiration."
                : `Soit environ ${Math.round(price / Math.max(1, days)).toLocaleString()} Ar par jour.`}
            </p>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card/50 p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-bold text-primary">Inclus</p>
            {[
              "Tous les modes de prédiction Premium",
              "Prédictions illimitées et temps réel",
              "Support administrateur prioritaire",
              "Activation automatique dès validation",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border/40 bg-secondary/20 p-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Comment ça marche</p>
            <ol className="space-y-1.5 text-[11px] text-muted-foreground">
              <li>1. Vous validez la formule (aucun débit automatique).</li>
              <li>2. Vous payez via Mobile Money avec la référence fournie.</li>
              <li>3. Vous envoyez la capture de paiement.</li>
              <li>4. L'admin valide : votre accès s'active tout seul.</li>
            </ol>
          </div>

          <Button variant="premium" className="w-full h-14 text-base font-bold" onClick={createRequest} disabled={creating}>
            {creating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ArrowRight className="w-5 h-5 mr-2" />}
            {creating ? "Création de la demande…" : "Continuer"}
          </Button>
        </div>
      )}

      {/* ÉTAPE 2 — Paiement */}
      {step === "pay" && (
        <div className="space-y-5 animate-fade-in">
          <div className="rounded-2xl border border-primary/25 bg-card/60 p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Référence de commande</p>
              <p className="text-lg font-mono font-black text-primary tracking-widest">{reference ?? "—"}</p>
            </div>
            {reference && (
              <button onClick={() => copy(reference, "ref")} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/15 text-primary text-xs font-bold">
                {copied === "ref" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === "ref" ? "Copié" : "Copier"}
              </button>
            )}
          </div>

          <div>
            <p className="text-xs font-bold mb-2">1. Choisissez l'opérateur</p>
            <div className="grid grid-cols-2 gap-2.5">
              {OPERATORS.map((o) => {
                const selected = operator === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setOperator(o.id)}
                    className={`rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.97] ${
                      selected
                        ? o.tone === "amber"
                          ? "border-amber-500 bg-amber-500/15"
                          : "border-emerald-500 bg-emerald-500/15"
                        : "border-border/60 bg-card/60 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {o.tone === "amber" ? <Phone className="w-4 h-4 text-amber-300" /> : <Wallet className="w-4 h-4 text-emerald-300" />}
                      <span className="text-sm font-bold">{o.name}</span>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground mt-1 tracking-wider">{o.display}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {op && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-xs font-bold">2. Envoyez le paiement</p>
              <button
                onClick={() => copy(op.number, "num")}
                className="w-full flex items-center justify-between px-4 py-4 rounded-2xl bg-background/60 border border-primary/30 active:scale-[0.99] transition"
              >
                <div className="text-left">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Numéro {op.name}</p>
                  <p className="text-2xl font-mono font-black tracking-wider">{op.display}</p>
                </div>
                <span className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/15 text-primary text-xs font-bold">
                  {copied === "num" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied === "num" ? "Copié" : "Copier"}
                </span>
              </button>
              <button
                onClick={() => copy(String(price), "amt")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-background/60 border border-primary/30 active:scale-[0.99] transition"
              >
                <div className="text-left">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Montant exact</p>
                  <p className="text-xl font-black gold-text">{price.toLocaleString()} <span className="text-sm">Ar</span></p>
                </div>
                <span className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/15 text-primary text-xs font-bold">
                  {copied === "amt" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied === "amt" ? "Copié" : "Copier"}
                </span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span>Aucun paiement n'est prélevé dans l'application</span>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="h-12 px-4" onClick={() => setStep("recap")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button variant="premium" className="flex-1 h-12 font-bold" disabled={!op} onClick={() => setStep("proof")}>
              J'ai effectué le paiement <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ÉTAPE 3 — Preuve */}
      {step === "proof" && (
        <div className="space-y-5 animate-fade-in">
          <div className="text-center space-y-1">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 mx-auto flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold">Preuve de paiement</h2>
            <p className="text-xs text-muted-foreground">Capture du SMS ou de la confirmation Mobile Money</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Numéro utilisé pour payer</label>
            <Input
              inputMode="tel"
              placeholder="ex : 034 12 345 67"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              className="h-12"
            />
          </div>

          <label className="block w-full rounded-2xl border-2 border-dashed border-primary/30 bg-card/50 hover:border-primary/50 transition-all cursor-pointer text-center overflow-hidden">
            <input type="file" accept="image/*" className="hidden" onChange={pickProof} />
            {proofPreview ? (
              <div className="p-3 space-y-2">
                <img src={proofPreview} alt="Aperçu de la preuve" className="w-full max-h-60 object-contain rounded-xl" />
                <p className="text-[10px] text-muted-foreground">Appuyez pour changer</p>
              </div>
            ) : (
              <div className="p-8 space-y-2">
                <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Sélectionner la capture</p>
              </div>
            )}
          </label>

          <div className="flex gap-2">
            <Button variant="secondary" className="h-12 px-4" onClick={() => setStep("pay")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button variant="premium" className="flex-1 h-12 font-bold" onClick={sendProof} disabled={!proofFile || uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {uploading ? "Envoi…" : "Envoyer la preuve"}
            </Button>
          </div>
        </div>
      )}

      {/* ÉTAPE 4 — Suivi */}
      {step === "track" && (
        <div className="space-y-5 animate-fade-in">
          <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 to-card p-5 text-center space-y-2">
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-primary/15 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h2 className="text-base font-bold gold-text">Validation en cours</h2>
            <p className="text-xs text-muted-foreground">
              Votre accès s'active automatiquement dès l'approbation de l'administrateur.
            </p>
            {reference && (
              <p className="text-[11px] font-mono text-primary tracking-widest">Réf {reference}</p>
            )}
          </div>

          <div className="rounded-2xl border border-border/40 bg-card/50 p-4 space-y-3">
            {[
              { label: "Demande créée", done: !!requestId },
              { label: "Preuve de paiement envoyée", done: proofSent },
              { label: "Validation administrateur", done: false },
              { label: "Accès Premium activé", done: false },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-xs">
                {s.done
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  : <div className="w-4 h-4 rounded-full border border-muted-foreground/40 shrink-0" />}
                <span className={s.done ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
              </div>
            ))}
          </div>

          {!proofSent && (
            <Button variant="premium" className="w-full h-12 font-bold" onClick={() => setStep("proof")}>
              <Upload className="w-4 h-4 mr-2" /> Envoyer ma preuve de paiement
            </Button>
          )}

          <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 bg-secondary/20 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Assistance administrateur</h3>
            </div>
            <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-4">
                  Aucun message. Écrivez à l'administrateur si besoin.
                </p>
              )}
              {messages.map((m) => (
                <div key={m.id} className="space-y-1.5">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary/15 border border-primary/20 px-3 py-2">
                    {m.message && <p className="text-xs whitespace-pre-wrap">{m.message}</p>}
                    {m.image_url && <img src={m.image_url} alt="Pièce jointe" className="mt-1.5 rounded-lg max-h-40 object-contain" />}
                    <p className="text-[9px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString("fr")}</p>
                  </div>
                  {m.admin_response && (
                    <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-secondary/60 border border-border/40 px-3 py-2">
                      <p className="text-[9px] uppercase tracking-widest text-primary font-bold mb-0.5 flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" /> Admin
                      </p>
                      <p className="text-xs whitespace-pre-wrap">{m.admin_response}</p>
                    </div>
                  )}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="p-3 border-t border-border/30 flex gap-2">
              <Input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                placeholder="Écrire un message…"
                className="h-11"
              />
              <Button variant="premium" size="icon" className="h-11 w-11" onClick={sendChat} disabled={sendingChat || !chatText.trim()}>
                {sendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {onCancel && (
            <button onClick={onCancel} className="w-full text-[11px] text-muted-foreground hover:text-foreground py-2">
              Revenir à l'espace Premium
            </button>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary" /> Mise à jour en temps réel
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionWizard;
