import { useState, useEffect, useRef } from "react";
import { Crown, Phone, Upload, CheckCircle, Clock, Sparkles, ArrowRight, Shield, Hash, AlertCircle, Wallet, X, CalendarDays, Send, MessageSquare, Image as ImageIcon, Copy, Lock, BadgeCheck, Rocket, Zap, Star, Trophy, Gem, Flame, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { grantSubscriptionCoins } from "@/lib/coins";

interface SubscriptionFlowProps {
  gameMode: string;
  gameName: string;
  onAccessGranted: () => void;
  onCancel?: () => void;
  /** When set, hides the duration picker and uses this fixed value (0 for lifetime). */
  fixedDays?: number;
  /** When set, uses this fixed price instead of the computed one. */
  fixedPrice?: number;
  /** When true, the access is permanent (no expires_at). */
  lifetime?: boolean;
}

type Step = "choose" | "method" | "payment" | "upload" | "waiting" | "code";

interface ChatMessage {
  id: string;
  message: string | null;
  image_url: string | null;
  status: string;
  admin_response: string | null;
  created_at: string;
  responded_at: string | null;
}

const SubscriptionFlow = ({ gameMode, gameName, onAccessGranted, onCancel, fixedDays, fixedPrice, lifetime }: SubscriptionFlowProps) => {
  const { user, isAdmin } = useAuth();
  const [step, setStep] = useState<Step>("choose");

  // === Distinctive tier identity per game mode ===
  const tier = (() => {
    const m = gameMode.toLowerCase();
    if (m.includes("infinie")) return {
      label: "Édition Infinie",
      tagline: "Accès illimité aux modes prédictifs avancés",
      icon: InfinityIcon,
      accent: "from-amber-500 via-amber-500 to-emerald-500",
      ring: "ring-amber-500/40",
      glowClass: "shadow-amber-500/40",
      perks: ["Mode Infinie temps réel", "Prédictions HH:MM:SS", "Support prioritaire 24/7", "Mises à jour exclusives"],
    };
    if (m.includes("premium") || m.includes("studio")) return {
      label: "Édition Premium",
      tagline: "L'expérience pro signature",
      icon: Crown,
      accent: "from-amber-400 via-amber-500 to-amber-500",
      ring: "ring-amber-500/40",
      glowClass: "shadow-amber-500/40",
      perks: ["Algorithmes Pro", "Statistiques avancées", "Notifications instantanées", "Sans publicité"],
    };
    if (m.includes("spribe")) return {
      label: "Édition Spribe",
      tagline: "Précision Spribe à la seconde",
      icon: Rocket,
      accent: "from-emerald-400 via-emerald-500 to-emerald-600",
      ring: "ring-emerald-500/40",
      glowClass: "shadow-emerald-500/40",
      perks: ["Format HH:MM:SS", "Latence ultra-faible", "Historique étendu", "Multi-fenêtres"],
    };
    if (m.includes("penalty")) return {
      label: "Édition Champion",
      tagline: "Pour les passionnés de penalty",
      icon: Trophy,
      accent: "from-emerald-400 via-emerald-500 to-emerald-500",
      ring: "ring-emerald-500/40",
      glowClass: "shadow-emerald-500/40",
      perks: ["Prédictions tireur/gardien", "Statistiques équipes", "Mode multi-match", "Alertes en direct"],
    };
    if (m.includes("virtuel") || m.includes("virtual")) return {
      label: "Édition Stade",
      tagline: "8 ligues virtuelles maîtrisées",
      icon: Star,
      accent: "from-amber-400 via-amber-500 to-amber-500",
      ring: "ring-amber-500/40",
      glowClass: "shadow-amber-500/40",
      perks: ["8 ligues couvertes", "Pondération avancée", "Calendrier en direct", "Conseils pré-match"],
    };
    return {
      label: "Édition Pro",
      tagline: "Débloquez la pleine puissance",
      icon: Gem,
      accent: "from-emerald-500 via-amber-500 to-amber-500",
      ring: "ring-emerald-500/40",
      glowClass: "shadow-emerald-500/40",
      perks: ["Prédictions illimitées", "Support dédié", "Mises à jour incluses", "Sans publicité"],
    };
  })();
  const TierIcon = tier.icon;

  const [daysRequested, setDaysRequested] = useState(
    fixedDays !== undefined ? String(fixedDays) : "7"
  );
  const [requesting, setRequesting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"orange" | "airtel" | "yas" | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [premiumCode, setPremiumCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [existingAccess, setExistingAccess] = useState<{ granted_at: string; expires_at: string | null } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatImageFile, setChatImageFile] = useState<File | null>(null);
  const [chatImagePreview, setChatImagePreview] = useState<string | null>(null);
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isLifetime = !!lifetime;
  const days = isLifetime ? 0 : (fixedDays !== undefined ? fixedDays : (parseInt(daysRequested) || 2));
  const bonusDays = isLifetime ? 0 : days >= 31 ? 10 : days >= 15 ? 5 : 0;
  const totalDays = days + bonusDays;
  const price = fixedPrice !== undefined ? fixedPrice : Math.round(days * (30000 / 31));

  useEffect(() => {
    if (isAdmin) onAccessGranted();
  }, [isAdmin]);

  useEffect(() => {
    if (!user) return;
    checkExisting();
    fetchChatMessages();

    const channel = supabase
      .channel(`sub-${gameMode}-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_access', filter: `user_id=eq.${user.id}` }, (payload) => {
        const record = payload.new as any;
        if (record?.game_mode === gameMode && record?.is_active && record?.granted_by) {
          setPremiumCode(record.id.slice(0, 8).toUpperCase());
          setCodeInput(record.id.slice(0, 8).toUpperCase());
          setStep("code");
          toast.success("Accès approuvé ! Code reçu automatiquement.");
          // Convert subscription → coins
          const days = record.expires_at
            ? Math.max(1, Math.ceil((new Date(record.expires_at).getTime() - Date.now()) / 86400000))
            : 0;
          grantSubscriptionCoins(user.id, {
            days,
            lifetime: !record.expires_at,
            expiresAt: record.expires_at,
          }).catch(() => {});
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${user.id}` }, () => {
        fetchChatMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, gameMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fetchChatMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("game_mode", gameMode)
      .order("created_at", { ascending: true });
    if (data) setChatMessages(data as ChatMessage[]);
  };

  const checkExisting = async () => {
    if (!user) return;
    const { data: activeData } = await supabase.from("game_access").select("*").eq("user_id", user.id).eq("game_mode", gameMode).eq("is_active", true).order("granted_at", { ascending: false }).limit(1);
    if (activeData?.[0]) {
      const a = activeData[0];
      if (!a.expires_at || new Date(a.expires_at) > new Date()) {
        setExistingAccess({ granted_at: a.granted_at, expires_at: a.expires_at });
        onAccessGranted();
        return;
      }
    }
    const { data } = await supabase.from("game_access").select("*").eq("user_id", user.id).eq("game_mode", gameMode).eq("is_active", false).is("granted_by", null).order("granted_at", { ascending: false }).limit(1);
    if (data?.[0]) {
      setPendingRequestId(data[0].id);
      setStep("waiting");
    }
  };

  const handleRequest = async () => {
    if (!user) return;
    setRequesting(true);
    let d: number;
    let total: number;
    let computedPrice: number;
    if (isLifetime) {
      d = 0; total = 0;
      computedPrice = fixedPrice ?? 45000;
    } else if (fixedDays !== undefined) {
      d = fixedDays;
      const bonus = d >= 31 ? 10 : d >= 15 ? 5 : 0;
      total = d + bonus;
      computedPrice = fixedPrice ?? Math.round(d * (30000 / 31));
    } else {
      d = parseInt(daysRequested);
      if (isNaN(d) || d < 2 || d > 31) { toast.error("Durée entre 2 et 31 jours"); setRequesting(false); return; }
      const bonus = d >= 31 ? 10 : d >= 15 ? 5 : 0;
      total = d + bonus;
      computedPrice = Math.round(d * (30000 / 31));
    }
    const { data, error } = await supabase.from("game_access").insert({
      user_id: user.id,
      game_mode: gameMode,
      is_active: false,
      expires_at: isLifetime ? null : new Date(Date.now() + total * 86400000).toISOString(),
      price_amount: computedPrice,
      days_requested: d,
    } as any).select().single();
    if (error) { toast.error("Erreur: " + error.message); setRequesting(false); return; }
    setPendingRequestId(data.id);
    setStep("method");
    setRequesting(false);
  };

  const handleMethodSelect = (method: "orange" | "airtel" | "yas") => {
    setPaymentMethod(method);
    setStep("payment");
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success("Copié !");
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleChatImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setChatImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!screenshotFile || !pendingRequestId || !user) return;
    setUploading(true);
    const ext = screenshotFile.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${pendingRequestId}.${ext}`;
    
    const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, screenshotFile, { upsert: true });
    if (uploadError) { toast.error("Erreur d'upload: " + uploadError.message); setUploading(false); return; }
    
    // Le bucket "payment-proofs" est privé : on génère une URL signée longue durée
    const { data: urlData } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    const proofUrl = urlData?.signedUrl ?? null;
    if (proofUrl) {
      await supabase.from("game_access").update({ payment_proof_url: proofUrl } as any).eq("id", pendingRequestId);
    }

    // Also send as chat message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      game_mode: gameMode,
      message: `Preuve de paiement - ${gameName}`,
      image_url: proofUrl,
      status: "pending",
    });
    
    toast.success("Preuve envoyée ! En attente de validation.");
    setStep("waiting");
    setUploading(false);
    fetchChatMessages();
  };

  const handleSendChat = async () => {
    if (!user || (!chatText.trim() && !chatImageFile)) return;
    setSendingChat(true);

    let imageUrl: string | null = null;
    if (chatImageFile) {
      const ext = chatImageFile.name.split('.').pop() || 'jpg';
      const path = `${user.id}/chat-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, chatImageFile, { upsert: true });
      if (!upErr) {
        const { data: urlD } = await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        imageUrl = urlD?.signedUrl ?? null;
      }
    }

    await supabase.from("chat_messages").insert({
      user_id: user.id,
      game_mode: gameMode,
      message: chatText.trim() || null,
      image_url: imageUrl,
      status: "pending",
    });

    setChatText("");
    setChatImageFile(null);
    setChatImagePreview(null);
    setSendingChat(false);
    fetchChatMessages();
  };

  const handleCodeSubmit = () => {
    if (codeInput === premiumCode && premiumCode !== "") {
      onAccessGranted();
      toast.success("Accès activé !");
    } else {
      toast.error("Code invalide");
    }
  };

  const stepLabels = ["Choix", "Méthode", "Paiement", "Preuve", "Validation", "Activation"];
  const steps: Step[] = ["choose", "method", "payment", "upload", "waiting", "code"];
  const currentIdx = steps.indexOf(step);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6">
      {onCancel && step === "choose" && (
        <div className="flex justify-end mb-4">
          <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-destructive/10 hover:text-destructive text-muted-foreground text-xs font-medium transition-all active:scale-95">
            <X className="w-3.5 h-3.5" /> Annuler
          </button>
        </div>
      )}

      {existingAccess && (
        <div className="mb-4 p-3 rounded-xl bg-green-500/5 border border-green-500/20 space-y-1">
          <div className="flex items-center gap-2 text-xs text-green-400 font-semibold">
            <CalendarDays className="w-3.5 h-3.5" /> Abonnement actif
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Début : <span className="text-foreground font-medium">{new Date(existingAccess.granted_at).toLocaleDateString("fr")}</span></span>
            {existingAccess.expires_at && (
              <span>Expire : <span className="text-foreground font-medium">{new Date(existingAccess.expires_at).toLocaleDateString("fr")}</span></span>
            )}
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8 px-1">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
              i < currentIdx ? "bg-green-500 text-white" :
              i === currentIdx ? "gold-gradient text-primary-foreground shadow-lg shadow-primary/30" :
              "bg-secondary/80 text-muted-foreground"
            }`}>
              {i < currentIdx ? "✓" : i + 1}
            </div>
            <span className={`text-[7px] font-semibold uppercase tracking-wider ${
              i <= currentIdx ? "text-primary" : "text-muted-foreground/50"
            }`}>{label}</span>
          </div>
        ))}
      </div>

      {/* STEP: Choose */}
      {step === "choose" && (
        <div className="flex flex-col items-center gap-6" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          <div className="relative">
            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${tier.accent} flex items-center justify-center shadow-2xl ${tier.glowClass} ring-2 ${tier.ring}`}>
              <TierIcon className="w-12 h-12 text-white drop-shadow-lg" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 mb-1">
              <TierIcon className="w-3 h-3 text-primary" />
              <span className="text-[10px] uppercase tracking-widest font-bold spectrum-text">{tier.label}</span>
            </div>
            <h2 className="text-xl font-bold spectrum-text">{gameName}</h2>
            <p className="text-sm text-muted-foreground">{tier.tagline}</p>
          </div>

          {/* Distinctive perks list */}
          <div className={`w-full max-w-sm rounded-2xl p-4 border-2 bg-gradient-to-br ${tier.accent} bg-opacity-5 border-white/10`}
            style={{ backgroundImage: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)` }}>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-primary" /> Inclus dans cette édition
            </p>
            <ul className="space-y-1.5">
              {tier.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-xs text-foreground">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full max-w-sm space-y-4">
            {fixedDays === undefined && !isLifetime && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Durée souhaitée
                </Label>
                <Input type="number" min="2" max="31" value={daysRequested} onChange={(e) => setDaysRequested(e.target.value)}
                  className="h-14 bg-secondary/80 border-border/50 text-center text-2xl font-mono font-bold" />
                <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                  <span>2 jours min.</span><span>31 jours max.</span>
                </div>
                {bonusDays > 0 && (
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                    <p className="text-xs text-green-400 font-bold">🎁 Bonus : +{bonusDays} jours gratuits !</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Durée totale : {totalDays} jours</p>
                  </div>
                )}
              </div>
            )}

            {(fixedDays !== undefined || isLifetime) && (
              <div className="p-4 rounded-2xl bg-secondary/40 border border-border/40 text-center space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Formule sélectionnée</p>
                <p className="text-lg font-black">
                  {isLifetime ? "Premium À Vie" : `${fixedDays} jour${(fixedDays ?? 0) > 1 ? "s" : ""} Premium`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isLifetime ? "Accès permanent, sans expiration" : "Tous les services Premium inclus"}
                </p>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/8 to-primary/5 border border-primary/25 text-center space-y-1.5 glow-gold">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                {isLifetime ? "Paiement unique" : "Prix total"}
              </p>
              <p className="text-4xl font-black gold-text">{price.toLocaleString()} <span className="text-lg">Ar</span></p>
              {isLifetime ? (
                <p className="text-xs text-muted-foreground">Accès illimité à tous les services Premium</p>
              ) : totalDays > 0 ? (
                <p className="text-xs text-muted-foreground">≈ {Math.round(price / totalDays).toLocaleString()} Ar/jour ({totalDays}j)</p>
              ) : null}
            </div>

            <Button variant="premium" className="w-full h-14 text-base font-bold" onClick={handleRequest} disabled={requesting}>
              <Wallet className="w-5 h-5 mr-2" /> {requesting ? "Envoi..." : "Procéder au paiement"}
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Method Selection */}
      {step === "method" && (
        <div className="space-y-5" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          <div className="text-center space-y-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25">
              <Crown className="w-3 h-3 text-primary" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-primary">Paiement Premium sécurisé</span>
            </div>
            <h2 className="text-lg font-bold">Choisissez votre opérateur</h2>
            <p className="text-sm text-muted-foreground">Montant à payer : <span className="font-bold gold-text text-base">{price.toLocaleString()} Ar</span></p>
          </div>

          {/* Orange Money option removed per business decision */}



          <button onClick={() => handleMethodSelect("airtel")}
            className="w-full rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent hover:border-amber-500/60 transition-all active:scale-[0.98] shadow-lg">
            <div className="p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Phone className="w-7 h-7 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="text-lg font-bold text-amber-300">Airtel Money</p>
                <p className="text-xs text-muted-foreground mt-0.5">Transfert direct</p>
                <p className="text-[11px] text-amber-300/80 font-mono mt-1 tracking-wider">0336 756 185</p>
              </div>
              <ArrowRight className="w-5 h-5 text-amber-400" />
            </div>
          </button>

          <button onClick={() => handleMethodSelect("yas")}
            className="w-full rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent hover:border-emerald-500/60 transition-all active:scale-[0.98] shadow-lg">
            <div className="p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="text-lg font-bold text-emerald-300 flex items-center gap-1.5">Yas Money <BadgeCheck className="w-4 h-4 text-emerald-400" /></p>
                <p className="text-xs text-muted-foreground mt-0.5">Nouveau · Disponible</p>
                <p className="text-[11px] text-emerald-300/80 font-mono mt-1 tracking-wider">0383 955 105</p>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-400" />
            </div>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground pt-2">
            <Lock className="w-3 h-3" />
            <span>Transaction sécurisée — preuve requise après paiement</span>
          </div>
        </div>
      )}

      {/* STEP: Payment confirmation */}
      {step === "payment" && (
        (() => {
          const isOrange = paymentMethod === "orange";
          const isYas = paymentMethod === "yas";
          const provider = isOrange ? "Orange Money" : isYas ? "Yas Money" : "Airtel Money";
          const number = isOrange ? "0379594257" : isYas ? "0383955105" : "0336756185";
          const numberDisplay = isOrange ? "0379 594 257" : isYas ? "0383 955 105" : "0336 756 185";
          const c = isOrange ? {
            border: "border-amber-500/40",
            bg: "from-amber-500/15 via-card/90 to-amber-500/5",
            accent: "via-amber-400",
            iconBg: "from-amber-500 to-amber-600",
            text: "text-amber-300",
            text2: "text-amber-200",
            text3: "text-amber-400",
            innerBorder: "border-amber-500/30 hover:border-amber-500/60",
            chipBg: "bg-amber-500/15 text-amber-300",
          } : isYas ? {
            border: "border-emerald-500/40",
            bg: "from-emerald-500/15 via-card/90 to-emerald-500/5",
            accent: "via-emerald-400",
            iconBg: "from-emerald-500 to-emerald-600",
            text: "text-emerald-300",
            text2: "text-emerald-200",
            text3: "text-emerald-400",
            innerBorder: "border-emerald-500/30 hover:border-emerald-500/60",
            chipBg: "bg-emerald-500/15 text-emerald-300",
          } : {
            border: "border-amber-500/40",
            bg: "from-amber-500/15 via-card/90 to-amber-500/5",
            accent: "via-amber-400",
            iconBg: "from-amber-500 to-amber-600",
            text: "text-amber-300",
            text2: "text-amber-200",
            text3: "text-amber-400",
            innerBorder: "border-amber-500/30 hover:border-amber-500/60",
            chipBg: "bg-amber-500/15 text-amber-300",
          };
          return (
            <div className="space-y-5" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25">
                  <Crown className="w-3 h-3 text-primary" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-primary">Paiement Premium</span>
                </div>
                <h2 className="text-lg font-bold">Envoyez le paiement à</h2>
                <p className="text-xs text-muted-foreground">{provider}</p>
              </div>

              {/* Premium receipt-style card */}
              <div className={`relative rounded-3xl overflow-hidden border-2 ${c.border} bg-gradient-to-br ${c.bg} shadow-2xl`}>
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent ${c.accent} to-transparent`} />
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.iconBg} flex items-center justify-center shadow-lg`}>
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${c.text}`}>{provider}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Numéro destinataire</p>
                      </div>
                    </div>
                    <BadgeCheck className={`w-5 h-5 ${c.text3}`} />
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => copyToClipboard(number, "num")}
                      className={`w-full group flex items-center justify-between gap-2 px-4 py-4 rounded-2xl bg-background/60 border ${c.innerBorder} transition-all active:scale-[0.99]`}
                    >
                      <div className="text-left">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Numéro</p>
                        <p className={`text-2xl font-mono font-black ${c.text2} tracking-wider`}>{numberDisplay}</p>
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-2 rounded-xl ${c.chipBg} text-xs font-bold`}>
                        {copied === "num" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied === "num" ? "Copié" : "Copier"}
                      </div>
                    </button>

                    <button
                      onClick={() => copyToClipboard(String(price), "amt")}
                      className="w-full group flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-background/60 border border-primary/30 hover:border-primary/60 transition-all active:scale-[0.99]"
                    >
                      <div className="text-left">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Montant exact</p>
                        <p className="text-xl font-black gold-text">{price.toLocaleString()} <span className="text-sm">Ar</span></p>
                      </div>
                      <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/15 text-primary text-xs font-bold">
                        {copied === "amt" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied === "amt" ? "Copié" : "Copier"}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="rounded-2xl border border-border/40 bg-card/40 p-4 space-y-3">
                <p className="text-[10px] uppercase tracking-widest font-bold text-primary flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Étapes à suivre
                </p>
                <ol className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex gap-2"><span className="w-5 h-5 shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">1</span>Ouvrez l'application <b className="text-foreground">{provider}</b> sur votre téléphone.</li>
                  <li className="flex gap-2"><span className="w-5 h-5 shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">2</span>Effectuez un transfert de <b className="text-foreground">{price.toLocaleString()} Ar</b> vers le numéro <b className="text-foreground">{numberDisplay}</b>.</li>
                  <li className="flex gap-2"><span className="w-5 h-5 shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">3</span>Faites une capture d'écran de la confirmation.</li>
                  <li className="flex gap-2"><span className="w-5 h-5 shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">4</span>Envoyez la preuve à l'étape suivante pour activation.</li>
                </ol>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <Lock className="w-3 h-3 text-primary" />
                <span>Données chiffrées · Activation automatique après validation</span>
              </div>

              <Button variant="premium" className="w-full h-13 text-base font-bold" onClick={() => setStep("upload")}>
                <CheckCircle className="w-4 h-4 mr-2" /> J'ai effectué le paiement
              </Button>
            </div>
          );
        })()
      )}

      {/* STEP: Upload */}
      {step === "upload" && (
        <div className="flex flex-col items-center gap-6" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
            <Upload className="w-9 h-9 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold">Preuve de paiement</h2>
            <p className="text-sm text-muted-foreground mt-1">Envoyez la capture d'écran de votre transaction</p>
          </div>
          <div className="w-full max-w-sm space-y-4">
            <label className="block w-full rounded-2xl border-2 border-dashed border-primary/30 bg-card/50 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer text-center group overflow-hidden">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScreenshotSelect} />
              {screenshotPreview ? (
                <div className="space-y-2 p-3">
                  <img src={screenshotPreview} alt="Aperçu" className="w-full max-h-60 object-contain rounded-xl" />
                  <p className="text-[10px] text-muted-foreground">Appuyez pour changer</p>
                </div>
              ) : (
                <div className="space-y-2 p-8">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/80 flex items-center justify-center mx-auto group-hover:bg-primary/10 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm text-muted-foreground">Appuyez pour sélectionner l'image</p>
                </div>
              )}
            </label>
            <Button variant="premium" className="w-full h-13 text-base" onClick={handleUpload} disabled={!screenshotFile || uploading}>
              {uploading ? "Envoi en cours..." : "Envoyer la capture"}
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Waiting with Chat */}
      {step === "waiting" && (
        <div className="flex flex-col gap-5" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/15 border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold gold-text">En attente de validation</h2>
              <p className="text-xs text-muted-foreground">Le code sera envoyé <span className="font-semibold text-foreground">automatiquement</span></p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/30">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-muted-foreground font-medium">Temps réel actif</span>
            </div>
          </div>

          {/* Chat Section */}
          <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 bg-secondary/20 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Chat avec l'admin</h3>
            </div>

            {/* Messages */}
            <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-3">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Envoyez un message ou une preuve de paiement</p>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="space-y-2">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="max-w-[80%] space-y-1">
                        {msg.image_url && (
                          <div className="rounded-xl overflow-hidden border border-primary/20">
                            <img src={msg.image_url} alt="Preuve" className="w-full max-h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(msg.image_url!, '_blank')} />
                          </div>
                        )}
                        {msg.message && (
                          <div className="px-3 py-2 rounded-2xl rounded-br-md bg-primary/15 border border-primary/20">
                            <p className="text-xs">{msg.message}</p>
                          </div>
                        )}
                        <p className="text-[8px] text-muted-foreground text-right">{new Date(msg.created_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</p>
                      </div>
                    </div>

                    {/* Admin response */}
                    {msg.admin_response && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%]">
                          <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-secondary/60 border border-border/30">
                            <p className="text-[9px] text-primary font-semibold mb-0.5">Admin</p>
                            <p className="text-xs">{msg.admin_response}</p>
                          </div>
                          {msg.responded_at && (
                            <p className="text-[8px] text-muted-foreground mt-0.5">{new Date(msg.responded_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status badge */}
                    {msg.status === "approved" && (
                      <div className="flex justify-center">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">✓ Approuvé</span>
                      </div>
                    )}
                    {msg.status === "rejected" && (
                      <div className="flex justify-center">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">✗ Refusé</span>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat image preview */}
            {chatImagePreview && (
              <div className="px-4 py-2 border-t border-border/20">
                <div className="relative inline-block">
                  <img src={chatImagePreview} alt="Preview" className="h-16 rounded-lg object-cover" />
                  <button onClick={() => { setChatImageFile(null); setChatImagePreview(null); }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center text-[10px]">✕</button>
                </div>
              </div>
            )}

            {/* Chat input */}
            <div className="px-3 py-3 border-t border-border/30 flex items-center gap-2">
              <label className="p-2 rounded-lg bg-secondary/60 hover:bg-primary/10 transition-colors cursor-pointer active:scale-95">
                <input type="file" accept="image/*" className="hidden" onChange={handleChatImageSelect} />
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
              </label>
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Message..."
                className="flex-1 h-9 px-3 rounded-full bg-secondary/60 border border-border/30 text-sm focus:outline-none focus:border-primary/40"
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              />
              <button
                onClick={handleSendChat}
                disabled={sendingChat || (!chatText.trim() && !chatImageFile)}
                className="p-2 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary transition-colors disabled:opacity-40 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP: Code */}
      {step === "code" && (
        <div className="flex flex-col items-center gap-6 py-8" style={{ animation: "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          <div className="w-20 h-20 rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold gold-text">Accès approuvé !</h2>
            <p className="text-sm text-muted-foreground">Votre code a été rempli automatiquement</p>
          </div>
          <div className="w-full max-w-xs space-y-4">
            <Input value={codeInput} onChange={(e) => setCodeInput(e.target.value)}
              className="h-16 bg-secondary border-primary/30 text-center text-2xl font-mono font-black tracking-[0.3em] gold-text" readOnly />
            <Button variant="premium" className="w-full h-14 text-base font-bold" onClick={handleCodeSubmit}>
              <Crown className="w-5 h-5 mr-2" /> Activer l'accès
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionFlow;
