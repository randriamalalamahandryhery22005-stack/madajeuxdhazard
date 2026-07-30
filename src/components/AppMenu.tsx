import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { readSoundSettings, writeSoundSettings, playNotificationSound } from "@/lib/notificationSound";
import {
  User,
  Info,
  Settings,
  Bell,
  History as HistoryIcon,
  Star,
  Languages,
  Palette,
  Shield,
  HelpCircle,
  Phone,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  Trash2,
  MessageCircle,
  Mail,
  LogOut,
  Moon,
  Sun,
  Volume2,
  RotateCcw,
  Video as VideoIcon,
  Globe,
  Store,
  Crown,
  Gamepad2,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import {
  readPersonalization,
  writePersonalization,
  subscribePersonalization,
  applyPalette,
  applyBackground,
  applyStoredImageBackground,
  type Palette as PaletteT,
  type Personalization,
} from "@/lib/appPersonalization";
import {
  saveVideoBlob,
  deleteVideoBlob,
  applyStoredVideoBackground,
  applyBackgroundVideo,
} from "@/lib/videoBackground";
import { saveMediaBlob, deleteMediaBlob } from "@/lib/mediaStore";
import { applyBackgroundMusic, applyStoredBackgroundMusic } from "@/lib/backgroundMusic";


const WHATSAPP_LINK = "https://wa.me/261379594257";
const EMAIL_LINK = "mailto:jeuxdhazardmada@gmail.com";
const APP_NAME = "Jeux d'Hazard";
const APP_VERSION = "0.0.1";

type PanelKey =
  | "root"
  | "profile"
  | "about"
  | "settings"
  | "notifications"
  | "history"
  | "favorites"
  
  | "theme"
  | "privacy"
  | "help"
  | "contact";

export default function AppMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [panel, setPanel] = useState<PanelKey>("root");
  useEffect(() => { if (!open) setPanel("root"); }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[92vw] max-w-md p-0 border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden"
      >
        <div className="flex flex-col h-full">
          <Header panel={panel} onBack={() => setPanel("root")} />
          <div className="flex-1 overflow-y-auto p-4 pb-8">
            {panel === "root" && <RootPanel goto={setPanel} onClose={() => onOpenChange(false)} />}
            {panel === "profile" && <ProfilePanel onClose={() => onOpenChange(false)} />}
            {panel === "about" && <AboutPanel />}
            {panel === "settings" && <SettingsPanel />}
            {panel === "notifications" && <NotificationsPanel />}
            {panel === "history" && <HistoryPanel onClose={() => onOpenChange(false)} />}
            {panel === "favorites" && <FavoritesPanel onClose={() => onOpenChange(false)} />}
            
            {panel === "theme" && <ThemePanel />}
            {panel === "privacy" && <PrivacyPanel />}
            {panel === "help" && <HelpPanel />}
            {panel === "contact" && <ContactPanel />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const PANEL_TITLES: Record<PanelKey, string> = {
  root: "Menu",
  profile: "Profil",
  about: "À propos",
  settings: "Paramètres",
  notifications: "Notifications",
  history: "Historique",
  favorites: "Favoris",
  
  theme: "Thème",
  privacy: "Confidentialité",
  help: "Aide",
  contact: "Contact",
};

function Header({ panel, onBack }: { panel: PanelKey; onBack: () => void }) {
  return (
    <SheetHeader className="px-4 py-4 border-b border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-2">
        {panel !== "root" && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-white/10 transition -ml-1"
            aria-label="Retour"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <SheetTitle className="text-white text-base flex items-center gap-2">
          {PANEL_TITLES[panel]}
        </SheetTitle>
      </div>
      <SheetDescription className="sr-only">{PANEL_TITLES[panel]}</SheetDescription>
    </SheetHeader>
  );
}

function Row({
  icon,
  label,
  sublabel,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  badge?: string | number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-3.5 hover:bg-white/[0.05] transition text-left active:scale-[0.99]"
    >
      <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-[14px] leading-tight">{label}</p>
        {sublabel && <p className="text-[11px] text-slate-400 truncate mt-0.5">{sublabel}</p>}
      </div>
      {badge !== undefined && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 font-bold">
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-slate-500" />
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mt-4 mb-2 px-1 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
        {title}
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/* ------------------- Root Panel ------------------- */
function RootPanel({
  goto,
  onClose,
}: {
  goto: (p: PanelKey) => void;
  onClose: () => void;
}) {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState<Personalization>(() => readPersonalization());
  useEffect(() => subscribePersonalization(setP), []);

  const displayName = profile?.full_name || profile?.name || user?.email?.split("@")[0] || "Invité";
  const initial = (displayName || "?").charAt(0).toUpperCase();

  // Informations manquantes du profil → notification dans Paramètres > Compte
  const missingProfileFields = useMemo(() => {
    if (!user || !profile) return [] as string[];
    const checks: Array<[string, unknown]> = [
      ["nom complet", profile.full_name],
      ["photo de profil", profile.avatar_url],
      ["date de naissance", (profile as any).birth_date],
      ["pays", (profile as any).country_code],
      ["région", (profile as any).region],
      ["téléphone", (profile as any).phone],
      ["sexe", (profile as any).gender],
    ];
    return checks.filter(([, v]) => !v || String(v).trim() === "").map(([k]) => k);
  }, [user, profile]);


  return (
    <div className="space-y-1">
      <button
        onClick={() => { onClose(); navigate(user ? "/profile" : "/login"); }}
        className="mb-2 w-full flex items-center gap-3 rounded-2xl p-3.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : initial}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-[15px] truncate">{displayName}</p>
          <p className="text-[11px] text-slate-400 truncate">{user?.email || "Non connecté"}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>

      {user && missingProfileFields.length > 0 && (
        <button
          onClick={() => { onClose(); navigate("/profile"); }}
          className="mb-2 w-full flex items-start gap-3 rounded-2xl p-3.5 bg-amber-500/10 border border-amber-400/30 hover:bg-amber-500/15 transition text-left"
        >
          <span className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-amber-300" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-semibold text-amber-100">
              Profil incomplet
            </span>
            <span className="block text-[11px] text-amber-200/70 mt-0.5">
              À compléter : {missingProfileFields.join(", ")}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-amber-300 mt-1" />
        </button>
      )}

      <Group title="Compte">
        <Row icon={<User className="w-[18px] h-[18px] text-amber-300" />} label="Profil" onClick={() => goto("profile")} />

        <Row icon={<Settings className="w-[18px] h-[18px] text-emerald-300" />} label="Paramètres" onClick={() => goto("settings")} />
        <Row icon={<Bell className="w-[18px] h-[18px] text-amber-300" />} label="Notifications" onClick={() => goto("notifications")} />
        {user && (
          <Row
            icon={<Trash2 className="w-[18px] h-[18px] text-red-400" />}
            label="Supprimer mon compte"
            sublabel="Suppression définitive des données"
            onClick={() => { onClose(); navigate("/profile#danger"); }}
          />
        )}
      </Group>

      <Group title="Application">
        
        <Row icon={<MessageCircle className="w-[18px] h-[18px] text-sky-300" />} label="Chat & Support" sublabel="Discuter avec l'équipe" onClick={() => { onClose(); navigate("/chat"); }} />
        <Row icon={<Store className="w-[18px] h-[18px] text-amber-300" />} label="J&H Store" sublabel="Contenus et publications" onClick={() => { onClose(); navigate("/gen-store"); }} />
        <Row icon={<Crown className="w-[18px] h-[18px] text-yellow-300" />} label="Abonnement Premium" sublabel="Gérer votre accès premium" onClick={() => { onClose(); navigate("/premium"); }} />
        <Row icon={<Gamepad2 className="w-[18px] h-[18px] text-emerald-300" />} label="Jeux & prédictions" sublabel="Accéder au hub des jeux" onClick={() => { onClose(); navigate("/games"); }} />
        {isAdmin && (
          <Row icon={<Shield className="w-[18px] h-[18px] text-sky-300" />} label="Administration" sublabel="Console d'administration" onClick={() => { onClose(); navigate("/admin"); }} />
        )}
      </Group>


      <Group title="Contenu">
        <Row icon={<HistoryIcon className="w-[18px] h-[18px] text-amber-300" />} label="Historique" badge={(p.history?.length ?? 0) || undefined} onClick={() => goto("history")} />
        <Row icon={<Star className="w-[18px] h-[18px] text-yellow-300" />} label="Favoris" badge={(p.favorites?.length ?? 0) || undefined} onClick={() => goto("favorites")} />
      </Group>

      <Group title="Assistance">
        <Row icon={<Info className="w-[18px] h-[18px] text-amber-300" />} label="À propos" sublabel={`Version ${APP_VERSION}`} onClick={() => goto("about")} />
        <Row icon={<HelpCircle className="w-[18px] h-[18px] text-emerald-300" />} label="Aide & FAQ" onClick={() => goto("help")} />
        <Row icon={<Phone className="w-[18px] h-[18px] text-emerald-300" />} label="Contact & Support" onClick={() => goto("contact")} />
        <Row icon={<Shield className="w-[18px] h-[18px] text-sky-300" />} label="Confidentialité" onClick={() => goto("privacy")} />
      </Group>

      {user && (
        <button
          onClick={async () => {
            try { await signOut(); onClose(); navigate("/login"); toast.success("Déconnexion réussie"); }
            catch { toast.error("Erreur"); }
          }}
          className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/15 transition font-semibold"
        >
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
      )}

      <p className="text-center text-[10px] text-slate-600 mt-4">{APP_NAME} · v{APP_VERSION}</p>
    </div>
  );
}

/* ------------------- Profile ------------------- */
function ProfilePanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs text-slate-400 mb-1">Nom</p>
        <p className="font-semibold">{profile?.full_name || profile?.name || "—"}</p>
        <Separator className="my-3 bg-white/10" />
        <p className="text-xs text-slate-400 mb-1">E-mail</p>
        <p className="font-semibold text-sm break-all">{user?.email || "Non connecté"}</p>
      </div>
      <Button
        className="w-full"
        onClick={() => { onClose(); navigate(user ? "/profile" : "/login"); }}
      >
        {user ? "Modifier mon profil" : "Se connecter"}
      </Button>
    </div>
  );
}

/* ------------------- About ------------------- */
function AboutPanel() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-600/20 to-emerald-600/10 p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">{APP_NAME}</p>
            <p className="text-xs">Version {APP_VERSION}</p>
          </div>
        </div>
      </div>
      <p className="leading-relaxed">
        {APP_NAME} est une application premium de prédictions et d'analyses avancées pour les jeux crash (Aviator, JetX, CosmoX) sur les plateformes Bet261 et 1xBet. Interface luxe, analyses en temps réel, IA embarquée.
      </p>
      <p className="text-xs text-slate-500">© {new Date().getFullYear()} J&H Studio — Antananarivo, Madagascar.</p>
    </div>
  );
}

/* ------------------- Settings ------------------- */
function SettingsPanel() {
  const [p, setP] = useState<Personalization>(() => readPersonalization());
  useEffect(() => subscribePersonalization(setP), []);
  const [notif, setNotif] = useState<boolean>(() => localStorage.getItem("jh.notif") !== "0");
  const [soundOn, setSoundOn] = useState<boolean>(() => readSoundSettings().enabled);
  const [soundVol, setSoundVol] = useState<number>(() => readSoundSettings().volume);
  const [sound, setSound] = useState<boolean>(() => localStorage.getItem("jh.sound") !== "0");

  return (
    <div className="space-y-2">
      <Group title="Préférences">
        <SwitchRow icon={<Bell className="w-5 h-5 text-amber-300" />} label="Notifications" checked={notif} onCheckedChange={(v) => { setNotif(v); localStorage.setItem("jh.notif", v ? "1" : "0"); toast.success(v ? "Activées" : "Désactivées"); }} />
        <SwitchRow icon={<Bell className="w-5 h-5 text-emerald-300" />} label="Sons de notification" checked={soundOn} onCheckedChange={(v) => { setSoundOn(v); writeSoundSettings({ enabled: v }); if (v) playNotificationSound("message", { force: true }); toast.success(v ? "Sons activés" : "Sons désactivés"); }} />
        {soundOn && (
          <div className="px-1 pb-1">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Volume des sons</span><span>{Math.round(soundVol * 100)}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={Math.round(soundVol * 100)}
              onChange={(e) => { const v = Number(e.target.value) / 100; setSoundVol(v); writeSoundSettings({ volume: v }); }}
              onMouseUp={() => playNotificationSound("message", { force: true })}
              onTouchEnd={() => playNotificationSound("message", { force: true })}
              className="w-full accent-emerald-400"
            />
          </div>
        )}
        <SwitchRow icon={<Volume2 className="w-5 h-5 text-amber-300" />} label="Sons" checked={sound} onCheckedChange={(v) => { setSound(v); localStorage.setItem("jh.sound", v ? "1" : "0"); toast.success(v ? "Activés" : "Désactivés"); }} />
        <SwitchRow icon={p.darkMode !== false ? <Moon className="w-5 h-5 text-amber-300" /> : <Sun className="w-5 h-5 text-amber-300" />} label="Mode sombre" checked={p.darkMode !== false} onCheckedChange={(v) => { writePersonalization({ darkMode: v }); toast.success(v ? "Sombre" : "Clair"); }} />
      </Group>
    </div>
  );
}

function SwitchRow({ icon, label, checked, onCheckedChange }: { icon: React.ReactNode; label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3.5">
      <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">{icon}</div>
      <p className="flex-1 font-medium text-[14px]">{label}</p>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/* ------------------- Notifications ------------------- */
function NotificationsPanel() {
  // Local notification center reuse: point users to the bell icon.
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
        <Bell className="w-10 h-10 mx-auto text-amber-300 mb-3" />
        <p className="font-semibold text-white">Centre de notifications</p>
        <p className="text-xs text-slate-400 mt-1">
          Vos alertes en temps réel sont accessibles via l'icône <Bell className="w-3 h-3 inline" /> en haut de l'écran.
        </p>
      </div>
    </div>
  );
}

/* ------------------- History ------------------- */
function HistoryPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [p, setP] = useState<Personalization>(() => readPersonalization());
  useEffect(() => subscribePersonalization(setP), []);
  const items = p.history ?? [];
  if (items.length === 0) {
    return <EmptyState icon={<HistoryIcon className="w-8 h-8" />} label="Aucune page visitée" />;
  }
  return (
    <div className="space-y-2">
      <button
        onClick={() => { writePersonalization({ history: [] }); toast.success("Historique effacé"); }}
        className="text-xs text-amber-300 hover:underline flex items-center gap-1 ml-1"
      >
        <Trash2 className="w-3 h-3" /> Effacer l'historique
      </button>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 overflow-hidden">
        {items.map((h) => (
          <button
            key={h.ts}
            onClick={() => { onClose(); navigate(h.path); }}
            className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-white/[0.05] text-left"
          >
            <HistoryIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{h.title || h.path}</p>
              <p className="text-[10px] text-slate-500">{new Date(h.ts).toLocaleString("fr-FR")}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------- Favorites ------------------- */
const FAVORABLE = [
  { path: "/games", title: "Jeux" },
  { path: "/aviator", title: "Aviator" },
  { path: "/jetx", title: "JetX" },
  { path: "/cosmox", title: "CosmoX" },
  { path: "/premium", title: "Premium" },
  { path: "/gen-store", title: "Boutique" },
  { path: "/chat", title: "Chat" },
];

function FavoritesPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [p, setP] = useState<Personalization>(() => readPersonalization());
  useEffect(() => subscribePersonalization(setP), []);
  const favSet = new Set(p.favorites ?? []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">Épinglez vos écrans préférés pour y accéder rapidement.</p>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 overflow-hidden">
        {FAVORABLE.map((f) => {
          const isFav = favSet.has(f.path);
          return (
            <div key={f.path} className="flex items-center gap-2 px-3.5 py-3">
              <button
                onClick={() => { onClose(); navigate(f.path); }}
                className="flex-1 text-left"
              >
                <p className="font-medium text-sm">{f.title}</p>
                <p className="text-[10px] text-slate-500">{f.path}</p>
              </button>
              <button
                onClick={() => {
                  const cur = readPersonalization().favorites ?? [];
                  const next = cur.includes(f.path) ? cur.filter((x) => x !== f.path) : [...cur, f.path];
                  writePersonalization({ favorites: next });
                }}
                aria-label="Toggle favori"
                className={`p-2 rounded-lg transition ${isFav ? "text-yellow-300 bg-yellow-400/10" : "text-slate-500 hover:bg-white/5"}`}
              >
                <Star className="w-4 h-4" fill={isFav ? "currentColor" : "none"} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ------------------- Theme (AI background + AI palette) ------------------- */
function ThemePanel() {
  const [p, setP] = useState<Personalization>(() => readPersonalization());
  useEffect(() => subscribePersonalization(setP), []);

  const [bgPrompt, setBgPrompt] = useState("");
  const [bgLoading, setBgLoading] = useState(false);

  const [palPrompt, setPalPrompt] = useState("");
  const [palLoading, setPalLoading] = useState(false);

  const generateBg = async () => {
    if (!bgPrompt.trim()) { toast.error("Décrivez le fond souhaité"); return; }
    setBgLoading(true);
    try {
      const res = await fetch("/api/ai-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: bgPrompt }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { dataUrl } = (await res.json()) as { dataUrl: string };
      writePersonalization({ bgUrl: dataUrl, bgImageSource: "ai", bgImageName: "fond IA" });
      applyBackground(dataUrl, { opacity: p.bgOpacity ?? 1, blur: p.bgBlur ?? 0 });
      toast.success("Fond appliqué");
    } catch (e: any) {
      toast.error("Échec", { description: e?.message?.slice(0, 120) });
    } finally { setBgLoading(false); }
  };

  const generatePalette = async () => {
    if (!palPrompt.trim()) { toast.error("Décrivez la palette souhaitée"); return; }
    setPalLoading(true);
    try {
      const res = await fetch("/api/ai-palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: palPrompt }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { palette } = (await res.json()) as { palette: PaletteT };
      writePersonalization({ palette });
      applyPalette(palette);
      toast.success("Palette appliquée");
    } catch (e: any) {
      toast.error("Échec", { description: e?.message?.slice(0, 120) });
    } finally { setPalLoading(false); }
  };

  const resetAll = () => {
    writePersonalization({ bgUrl: null, bgImageSource: null, bgImageName: null, palette: null });
    applyBackground(null);
    applyPalette(null);
    toast.success("Thème réinitialisé");
  };

  /* ---- Fond d'écran vidéo ---- */
  const [videoBusy, setVideoBusy] = useState(false);
  const [remoteVideo, setRemoteVideo] = useState("");

  /* ---- Fond d'écran image (réelle) ---- */
  const [imgBusy, setImgBusy] = useState(false);
  const [remoteImage, setRemoteImage] = useState("");

  const imageOpts = (over: Partial<typeof p> = {}) => {
    const n = { ...p, ...over };
    return { opacity: n.bgOpacity ?? 1, blur: n.bgBlur ?? 0 };
  };

  const pickImage = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Choisissez une image"); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Image trop lourde (15 Mo max)"); return; }
    setImgBusy(true);
    try {
      await saveMediaBlob("bg-image", file);
      writePersonalization({ bgImageSource: "local", bgUrl: null, bgImageName: file.name });
      await applyStoredImageBackground(imageOpts());
      toast.success("Image appliquée en fond d'écran");
    } catch (e: any) {
      toast.error("Échec", { description: e?.message?.slice(0, 120) });
    } finally { setImgBusy(false); }
  };

  const applyRemoteImage = () => {
    const url = remoteImage.trim();
    if (!url) { toast.error("Collez un lien d'image"); return; }
    writePersonalization({ bgImageSource: "remote", bgUrl: url, bgImageName: url.split("/").pop() || "image" });
    applyBackground(url, imageOpts());
    setRemoteImage("");
    toast.success("Image appliquée en fond d'écran");
  };

  const removeImage = async () => {
    await deleteMediaBlob("bg-image");
    writePersonalization({ bgImageSource: null, bgUrl: null, bgImageName: null });
    applyBackground(null);
    toast.success("Fond image supprimé");
  };

  const updateImageOpts = (patch: Partial<typeof p>) => {
    const next = { ...p, ...patch };
    writePersonalization(patch);
    const opts = imageOpts(patch);
    if (next.bgImageSource === "local") void applyStoredImageBackground(opts);
    else applyBackground(next.bgUrl, opts);
  };

  /* ---- Musique de fond ---- */
  const [musicBusy, setMusicBusy] = useState(false);
  const [remoteMusic, setRemoteMusic] = useState("");

  const musicOpts = (over: Partial<typeof p> = {}) => {
    const n = { ...p, ...over };
    return { volume: n.bgMusicVolume ?? 0.4, paused: n.bgMusicPaused === true };
  };

  const pickMusic = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) { toast.error("Choisissez un fichier audio"); return; }
    if (file.size > 30 * 1024 * 1024) { toast.error("Musique trop lourde (30 Mo max)"); return; }
    setMusicBusy(true);
    try {
      await saveMediaBlob("bg-music", file);
      writePersonalization({ bgMusicSource: "local", bgMusicUrl: null, bgMusicName: file.name, bgMusicPaused: false });
      await applyStoredBackgroundMusic(musicOpts({ bgMusicPaused: false }));
      toast.success("Musique de fond appliquée");
    } catch (e: any) {
      toast.error("Échec", { description: e?.message?.slice(0, 120) });
    } finally { setMusicBusy(false); }
  };

  const applyRemoteMusic = () => {
    const url = remoteMusic.trim();
    if (!url) { toast.error("Collez un lien audio (mp3, ogg…)"); return; }
    writePersonalization({ bgMusicSource: "remote", bgMusicUrl: url, bgMusicName: url.split("/").pop() || "musique", bgMusicPaused: false });
    applyBackgroundMusic(url, musicOpts({ bgMusicPaused: false }));
    setRemoteMusic("");
    toast.success("Musique de fond appliquée");
  };

  const removeMusic = async () => {
    await deleteMediaBlob("bg-music");
    writePersonalization({ bgMusicSource: null, bgMusicUrl: null, bgMusicName: null });
    applyBackgroundMusic(null);
    toast.success("Musique de fond supprimée");
  };

  const updateMusicOpts = (patch: Partial<typeof p>) => {
    const next = { ...p, ...patch };
    writePersonalization(patch);
    const opts = musicOpts(patch);
    if (next.bgMusicSource === "remote" && next.bgMusicUrl) applyBackgroundMusic(next.bgMusicUrl, opts);
    else if (next.bgMusicSource === "local") void applyStoredBackgroundMusic(opts);
  };




  const pickVideo = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Choisissez un fichier vidéo"); return; }
    if (file.size > 60 * 1024 * 1024) { toast.error("Vidéo trop lourde (60 Mo max)"); return; }
    setVideoBusy(true);
    try {
      await saveVideoBlob(file);
      writePersonalization({ bgVideoSource: "local", bgVideoUrl: null, bgVideoName: file.name });
      await applyStoredVideoBackground(videoOpts());
      toast.success("Vidéo appliquée en fond d'écran");
    } catch (e: any) {
      toast.error("Échec", { description: e?.message?.slice(0, 120) });
    } finally { setVideoBusy(false); }
  };

  const applyRemoteVideo = () => {
    const url = remoteVideo.trim();
    if (!url) { toast.error("Collez un lien vidéo (mp4, webm…)"); return; }
    writePersonalization({ bgVideoSource: "remote", bgVideoUrl: url, bgVideoName: url.split("/").pop() || "vidéo" });
    applyBackgroundVideo(url, videoOpts());
    setRemoteVideo("");
    toast.success("Vidéo appliquée en fond d'écran");
  };

  const removeVideo = async () => {
    await deleteVideoBlob();
    writePersonalization({ bgVideoSource: null, bgVideoUrl: null, bgVideoName: null });
    applyBackgroundVideo(null);
    toast.success("Fond vidéo supprimé");
  };

  const videoOpts = (over: Partial<typeof p> = {}) => {
    const n = { ...p, ...over };
    return {
      opacity: n.bgVideoOpacity ?? 1,
      blur: n.bgVideoBlur ?? 0,
      muted: n.bgVideoMuted !== false,
      volume: n.bgVideoVolume ?? 0.7,
      paused: n.bgVideoPaused === true,
    };
  };

  const updateVideoOpts = (patch: Partial<typeof p>) => {
    const next = { ...p, ...patch };
    writePersonalization(patch);
    const opts = videoOpts(patch);
    if (next.bgVideoSource === "remote" && next.bgVideoUrl) applyBackgroundVideo(next.bgVideoUrl, opts);
    else if (next.bgVideoSource === "local") void applyStoredVideoBackground(opts);
  };

  return (
    <div className="space-y-5">
      {/* Fond d'écran image (réelle) */}
      <section className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-4">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon className="w-4 h-4 text-amber-300" />
          <h3 className="font-bold text-sm">Fond d'écran image</h3>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          Choisissez une vraie photo depuis votre appareil (ou collez un lien) : elle habillera
          toute l'application. Intensité et flou réglables.
        </p>

        <label className="block w-full rounded-xl border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 transition-colors cursor-pointer px-3 py-4 text-center">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={imgBusy}
            onChange={(e) => { void pickImage(e.target.files?.[0]); e.currentTarget.value = ""; }}
          />
          <span className="text-xs text-slate-300 inline-flex items-center gap-2">
            {imgBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4 text-amber-300" />}
            {imgBusy ? "Application…" : (p.bgImageSource || p.bgUrl) ? "Remplacer l'image" : "Sélectionner une image"}
          </span>
        </label>

        <div className="flex gap-2 mt-2">
          <input
            value={remoteImage}
            onChange={(e) => setRemoteImage(e.target.value)}
            placeholder="ou collez un lien .jpg / .png"
            className="flex-1 h-9 rounded-lg bg-black/30 border border-white/10 px-3 text-xs outline-none focus:border-amber-500/50"
          />
          <Button size="sm" variant="secondary" className="h-9" onClick={applyRemoteImage}>Appliquer</Button>
        </div>

        {(p.bgImageSource || p.bgUrl) && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="truncate pr-2">Image active : {p.bgImageName || "fond IA"}</span>
              <button onClick={() => void removeImage()} className="text-amber-300 hover:underline shrink-0">Supprimer</button>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Intensité</span><span>{Math.round((p.bgOpacity ?? 1) * 100)}%</span>
              </div>
              <input
                type="range" min={20} max={100} step={5}
                value={Math.round((p.bgOpacity ?? 1) * 100)}
                onChange={(e) => updateImageOpts({ bgOpacity: Number(e.target.value) / 100 })}
                className="w-full accent-amber-400"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Flou</span><span>{p.bgBlur ?? 0}px</span>
              </div>
              <input
                type="range" min={0} max={20} step={1}
                value={p.bgBlur ?? 0}
                onChange={(e) => updateImageOpts({ bgBlur: Number(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>
          </div>
        )}
      </section>

      {/* Fond d'écran vidéo */}
      <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-4">
        <div className="flex items-center gap-2 mb-2">
          <VideoIcon className="w-4 h-4 text-emerald-300" />
          <h3 className="font-bold text-sm">Fond d'écran vidéo</h3>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          Choisissez une vidéo depuis votre appareil (ou un lien) : elle sera lue en boucle,
          elle sera lue en boucle derrière toute l'application, avec son son si vous l'activez
          (lecture, pause, volume et remplacement disponibles ci-dessous).
        </p>

        <label className="block w-full rounded-xl border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 transition-colors cursor-pointer px-3 py-4 text-center">
          <input
            type="file"
            accept="video/*"
            className="hidden"
            disabled={videoBusy}
            onChange={(e) => { void pickVideo(e.target.files?.[0]); e.currentTarget.value = ""; }}
          />
          <span className="text-xs text-slate-300 inline-flex items-center gap-2">
            {videoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <VideoIcon className="w-4 h-4 text-emerald-300" />}
            {videoBusy ? "Application…" : p.bgVideoSource ? "Remplacer la vidéo" : "Sélectionner une vidéo"}
          </span>
        </label>

        <div className="flex gap-2 mt-2">
          <input
            value={remoteVideo}
            onChange={(e) => setRemoteVideo(e.target.value)}
            placeholder="ou collez un lien .mp4 / .webm"
            className="flex-1 h-9 rounded-lg bg-black/30 border border-white/10 px-3 text-xs outline-none focus:border-emerald-500/50"
          />
          <Button size="sm" variant="secondary" className="h-9" onClick={applyRemoteVideo}>Appliquer</Button>
        </div>




        {p.bgVideoSource && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="truncate pr-2">Vidéo active : {p.bgVideoName || "vidéo"}</span>
              <button onClick={() => void removeVideo()} className="text-amber-300 hover:underline shrink-0">Supprimer</button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 flex-1 text-xs"
                onClick={() => updateVideoOpts({ bgVideoPaused: !(p.bgVideoPaused === true) })}
              >
                {p.bgVideoPaused ? "Lecture" : "Pause"}
              </Button>
              <Button
                size="sm"
                variant={p.bgVideoMuted === false ? "default" : "secondary"}
                className="h-8 flex-1 text-xs"
                onClick={() => updateVideoOpts({ bgVideoMuted: !(p.bgVideoMuted === false) })}
              >
                {p.bgVideoMuted === false ? "Son activé" : "Son coupé"}
              </Button>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Volume de la vidéo</span><span>{Math.round((p.bgVideoVolume ?? 0.7) * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={100} step={5}
                disabled={p.bgVideoMuted !== false}
                value={Math.round((p.bgVideoVolume ?? 0.7) * 100)}
                onChange={(e) => updateVideoOpts({ bgVideoVolume: Number(e.target.value) / 100 })}
                className="w-full accent-emerald-400 disabled:opacity-40"
              />
              {p.bgVideoMuted === false && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Si le son ne démarre pas, touchez l'écran une fois (sécurité du navigateur).
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Intensité</span><span>{Math.round((p.bgVideoOpacity ?? 1) * 100)}%</span>
              </div>
              <input
                type="range" min={20} max={100} step={5}
                value={Math.round((p.bgVideoOpacity ?? 1) * 100)}
                onChange={(e) => updateVideoOpts({ bgVideoOpacity: Number(e.target.value) / 100 })}
                className="w-full accent-emerald-400"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Flou</span><span>{p.bgVideoBlur ?? 0}px</span>
              </div>
              <input
                type="range" min={0} max={20} step={1}
                value={p.bgVideoBlur ?? 0}
                onChange={(e) => updateVideoOpts({ bgVideoBlur: Number(e.target.value) })}
                className="w-full accent-emerald-400"
              />
            </div>
          </div>
        )}
      </section>

      {/* Musique de fond */}
      <section className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-transparent p-4">
        <div className="flex items-center gap-2 mb-2">
          <Volume2 className="w-4 h-4 text-sky-300" />
          <h3 className="font-bold text-sm">Musique de fond</h3>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          Ajoutez votre propre musique : elle sera jouée en boucle pendant l'utilisation de
          l'application (lecture, pause et volume réglables).
        </p>

        <label className="block w-full rounded-xl border-2 border-dashed border-sky-500/30 hover:border-sky-500/60 transition-colors cursor-pointer px-3 py-4 text-center">
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            disabled={musicBusy}
            onChange={(e) => { void pickMusic(e.target.files?.[0]); e.currentTarget.value = ""; }}
          />
          <span className="text-xs text-slate-300 inline-flex items-center gap-2">
            {musicBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4 text-sky-300" />}
            {musicBusy ? "Application…" : p.bgMusicSource ? "Remplacer la musique" : "Sélectionner une musique"}
          </span>
        </label>

        <div className="flex gap-2 mt-2">
          <input
            value={remoteMusic}
            onChange={(e) => setRemoteMusic(e.target.value)}
            placeholder="ou collez un lien .mp3 / .ogg"
            className="flex-1 h-9 rounded-lg bg-black/30 border border-white/10 px-3 text-xs outline-none focus:border-sky-500/50"
          />
          <Button size="sm" variant="secondary" className="h-9" onClick={applyRemoteMusic}>Appliquer</Button>
        </div>

        {p.bgMusicSource && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="truncate pr-2">Musique active : {p.bgMusicName || "musique"}</span>
              <button onClick={() => void removeMusic()} className="text-amber-300 hover:underline shrink-0">Supprimer</button>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-full text-xs"
              onClick={() => updateMusicOpts({ bgMusicPaused: !(p.bgMusicPaused === true) })}
            >
              {p.bgMusicPaused ? "Lecture" : "Pause"}
            </Button>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Volume</span><span>{Math.round((p.bgMusicVolume ?? 0.4) * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={100} step={5}
                value={Math.round((p.bgMusicVolume ?? 0.4) * 100)}
                onChange={(e) => updateMusicOpts({ bgMusicVolume: Number(e.target.value) / 100 })}
                className="w-full accent-sky-400"
              />
            </div>
          </div>
        )}
      </section>

      {/* AI Background */}
      <section className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 to-transparent p-4">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon className="w-4 h-4 text-fuchsia-300" />
          <h3 className="font-bold text-sm">Fond d'écran IA</h3>
        </div>
        <p className="text-[11px] text-slate-400 mb-2">
          Décrivez l'ambiance visuelle et l'IA génèrera un fond adapté.
        </p>
        <Textarea
          rows={3}
          placeholder="ex : galaxie violette avec étoiles dorées, ambiance cosmique premium"
          value={bgPrompt}
          onChange={(e) => setBgPrompt(e.target.value)}
          disabled={bgLoading}
          className="bg-black/30 border-white/10 text-sm"
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {[
            "aurore boréale émeraude et or, minimaliste",
            "cristaux noirs et reflets dorés, luxueux",
            "brume violette, étoiles filantes, mystique",
            "vagues abstraites vert émeraude, calme",
          ].map((s) => (
            <button key={s} onClick={() => setBgPrompt(s)} className="text-[10px] px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300">
              {s.slice(0, 34)}…
            </button>
          ))}
        </div>
        <Button onClick={generateBg} disabled={bgLoading} className="w-full mt-3">
          {bgLoading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> Génération…</>) : (<><Sparkles className="w-4 h-4 mr-2" /> Générer et appliquer</>)}
        </Button>
        {p.bgUrl && (
          <div className="mt-3">
            <img src={p.bgUrl} alt="fond actuel" className="w-full h-28 object-cover rounded-lg border border-white/10" />
            <button onClick={() => { writePersonalization({ bgUrl: null }); applyBackground(null); }} className="text-[11px] text-amber-300 mt-1 hover:underline">
              Supprimer le fond
            </button>
          </div>
        )}
      </section>

      {/* AI Palette */}
      <section className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-transparent p-4">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="w-4 h-4 text-sky-300" />
          <h3 className="font-bold text-sm">Palette de couleurs IA</h3>
        </div>
        <p className="text-[11px] text-slate-400 mb-2">
          Décrivez l'humeur ou un thème, l'IA crée les couleurs de l'app.
        </p>
        <Textarea
          rows={3}
          placeholder="ex : néon cyberpunk rose et cyan sur fond très sombre"
          value={palPrompt}
          onChange={(e) => setPalPrompt(e.target.value)}
          disabled={palLoading}
          className="bg-black/30 border-white/10 text-sm"
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {[
            "or royal et velours noir",
            "menthe fraîche et charbon",
            "coucher de soleil orange magenta",
            "bleu nuit et argent glacial",
          ].map((s) => (
            <button key={s} onClick={() => setPalPrompt(s)} className="text-[10px] px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300">
              {s}
            </button>
          ))}
        </div>
        <Button onClick={generatePalette} disabled={palLoading} className="w-full mt-3">
          {palLoading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> Génération…</>) : (<><Sparkles className="w-4 h-4 mr-2" /> Générer et appliquer</>)}
        </Button>
        {p.palette && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {(["primary","background","accent","foreground","card"] as const).map((k) => (
              <div key={k} className="text-center">
                <div className="w-full aspect-square rounded-lg border border-white/20" style={{ background: p.palette?.[k] ? `hsl(${p.palette[k]})` : undefined }} />
                <p className="text-[9px] text-slate-500 mt-1 truncate">{k}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        onClick={resetAll}
        className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white py-2"
      >
        <RotateCcw className="w-4 h-4" /> Réinitialiser le thème
      </button>
    </div>
  );
}

/* ------------------- Privacy ------------------- */
function PrivacyPanel() {
  return (
    <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="font-semibold text-white mb-1">Vos données vous appartiennent</p>
        <p className="text-xs">
          Nous ne stockons que les informations nécessaires au fonctionnement de l'application (compte, préférences, historique local). Aucune donnée n'est vendue à des tiers.
        </p>
      </div>
      <ul className="space-y-2 text-xs">
        <li className="flex gap-2"><Shield className="w-4 h-4 text-emerald-300 shrink-0" /> Chiffrement en transit (HTTPS).</li>
        <li className="flex gap-2"><Shield className="w-4 h-4 text-emerald-300 shrink-0" /> Historique et favoris stockés localement sur votre appareil.</li>
        <li className="flex gap-2"><Shield className="w-4 h-4 text-emerald-300 shrink-0" /> Suppression du compte disponible sur simple demande via WhatsApp.</li>
      </ul>
      <button
        onClick={() => {
          try {
            // Preserve saved-accounts of OTHER users on this shared device.
            const preserved = localStorage.getItem("jh.savedAccounts.v1");
            const keysToClear: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k !== "jh.savedAccounts.v1") keysToClear.push(k);
            }
            keysToClear.forEach((k) => localStorage.removeItem(k));
            if (preserved) localStorage.setItem("jh.savedAccounts.v1", preserved);
          } catch { /* no-op */ }
          toast.success("Vos données locales ont été effacées");
          setTimeout(() => location.reload(), 400);
        }}
        className="w-full mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 py-3 text-sm font-semibold hover:bg-amber-500/15"
      >
        Effacer toutes mes données locales
      </button>
    </div>
  );
}

/* ------------------- Help ------------------- */
function HelpPanel() {
  const faq = [
    { q: "Comment activer le mode Premium ?", a: "Rendez-vous sur l'onglet Premium, choisissez votre plan et envoyez la preuve de paiement Mobile Money — l'activation est automatique." },
    { q: "Les prédictions sont-elles garanties ?", a: "Non. Il s'agit d'analyses statistiques : jouez de manière responsable." },
    { q: "Comment changer mon mot de passe ?", a: "Menu → Profil → Modifier mon profil, ou utilisez « Mot de passe oublié » sur l'écran de connexion." },
    { q: "Comment contacter le support ?", a: "Menu → Contact & Support, ou touchez le bouton WhatsApp." },
  ];
  return (
    <div className="space-y-2">
      {faq.map((f) => (
        <details key={f.q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 group">
          <summary className="cursor-pointer font-medium text-sm flex items-center justify-between">
            {f.q}
            <ChevronRight className="w-4 h-4 group-open:rotate-90 transition" />
          </summary>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/* ------------------- Contact ------------------- */
function ContactPanel() {
  return (
    <div className="space-y-3">
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 hover:bg-emerald-500/15 transition"
      >
        <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-emerald-300" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">WhatsApp</p>
          <p className="text-xs text-slate-400">Ouvrir la conversation avec le support</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </a>
      <a
        href={EMAIL_LINK}
        className="w-full flex items-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 hover:bg-sky-500/15 transition"
      >
        <div className="w-11 h-11 rounded-xl bg-sky-500/20 flex items-center justify-center">
          <Mail className="w-6 h-6 text-sky-300" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">E-mail</p>
          <p className="text-xs text-slate-400">Écrire au support</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </a>
      <p className="text-[11px] text-slate-500 text-center mt-2">Réponse moyenne sous quelques heures, 7j/7.</p>
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <div className="mb-2 opacity-40">{icon}</div>
      <p className="text-sm">{label}</p>
    </div>
  );
}
