import { useNavigate, useLocation } from "react-router-dom";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import {
  Home,
  ShoppingBag,
  Crown,
  Shield,
  Menu as MenuIcon,
  User,
  Info,
  Settings,
  MessageCircle,
  LogOut,
  Bell,
  Volume2,
  Moon,
  Sun,
  ChevronRight,
  Mail,
  Sparkles,
  KeyRound,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import AppMenu from "@/components/AppMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { useUnreadStore } from "@/hooks/useUnreadStore";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const WHATSAPP_NUMBER = "+261 37 95 942 57";
const WHATSAPP_RAW = "261379594257";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_RAW}`;
const APP_NAME = "Jeux d'Hazard";
const APP_VERSION = "0.0.1";

type SettingKey = "notifications" | "sound" | "darkMode";

const readBool = (key: string, fallback: boolean) => {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(`webify.${key}`);
  return v === null ? fallback : v === "1";
};

const writeBool = (key: string, v: boolean) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`webify.${key}`, v ? "1" : "0");
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, user, profile, signOut } = useAuth();
  const unreadChats = useUnreadChats(user?.id ?? null);
  const { count: unreadStore } = useUnreadStore(user?.id ?? null);
  const unreadNotifs = useUnreadNotifications(user?.id ?? null);
  const [ripple, setRipple] = useState<{ id: string; x: number; y: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setNotifications(readBool("notifications", true));
    setSound(readBool("sound", true));
    setDarkMode(readBool("darkMode", true));
  }, []);

  const toggleSetting = (key: SettingKey, next: boolean) => {
    if (key === "notifications") setNotifications(next);
    if (key === "sound") setSound(next);
    if (key === "darkMode") {
      setDarkMode(next);
      document.documentElement.classList.toggle("dark", next);
    }
    writeBool(key, next);
    toast.success(next ? "Activé" : "Désactivé");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setMenuOpen(false);
      setSettingsOpen(false);
      toast.success("Déconnexion réussie");
      navigate("/login");
    } catch {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const copyWhatsapp = async () => {
    try {
      await navigator.clipboard.writeText(WHATSAPP_NUMBER);
      setCopied(true);
      toast.success("Numéro copié");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const navItems: Array<{ label: string; icon: typeof Home; path: string }> = [
    { label: "Accueil", icon: Home, path: "/games" },
    { label: "Chat", icon: MessageCircle, path: "/chat" },
    { label: "Boutique", icon: ShoppingBag, path: "/gen-store" },
    { label: "Notifs", icon: Bell, path: "/notifications" },
    { label: "Premium", icon: Crown, path: "/premium" },
    ...(isAdmin ? [{ label: "Admin", icon: Shield, path: "/admin" }] : []),
  ];

  const isActive = (path: string) => {
    const [p, hash] = path.split("#");
    if (location.pathname !== p) return false;
    if (!hash) return location.hash === "" || (p === "/premium" && location.hash === "");
    return location.hash.replace("#", "") === hash;
  };

  const handleClick = (path: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (path === "/admin" && !isAdmin) {
      toast.error("Accès réservé aux administrateurs");
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({ id: path + Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setRipple(null), 500);
    navigate(path);
  };

  const menuBtnClass = (active: boolean) =>
    `relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-2xl overflow-hidden transition-all duration-300 active:scale-90 min-h-[52px] ${
      active ? "text-white" : "text-slate-400 hover:text-white"
    }`;

  const displayName = profile?.full_name || profile?.name || user?.email?.split("@")[0] || "Invité";
  const initial = (displayName || "?").charAt(0).toUpperCase();

  return (
    <>
      <nav
        className="fixed bottom-3 left-3 right-3 z-50 safe-area-bottom rounded-[26px]"
        style={{
          background: "linear-gradient(180deg, hsl(0 0% 6% / 0.85), hsl(0 0% 3% / 0.95))",
          backdropFilter: "blur(28px) saturate(160%)",
          border: "1.5px solid hsl(42 55% 45% / 0.35)",
          boxShadow:
            "0 20px 50px -18px hsl(152 70% 30% / 0.35), 0 -8px 30px -12px hsl(42 82% 50% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
        }}
      >
        <div className="flex items-stretch justify-around gap-0.5 px-1.5 py-1.5 max-w-md mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const activeAccent = item.path === "/premium"
              ? "hsl(45 90% 65%)"
              : "hsl(152 80% 55%)";
            return (
              <button
                key={item.label}
                onClick={(e) => handleClick(item.path, e)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={menuBtnClass(active)}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-1 rounded-2xl pointer-events-none"
                    style={{
                      background: `radial-gradient(80% 80% at 50% 30%, ${activeAccent}30, transparent 70%)`,
                      boxShadow: `inset 0 0 0 1px ${activeAccent}55, 0 6px 18px -8px ${activeAccent}`,
                    }}
                  />
                )}
                {ripple?.id.startsWith(item.path) && (
                  <span
                    className="pointer-events-none absolute rounded-full bg-white/25"
                    style={{
                      top: ripple.y,
                      left: ripple.x,
                      width: 8,
                      height: 8,
                      transform: "translate(-50%,-50%)",
                      animation: "pm-scale-in 0.5s ease-out forwards",
                    }}
                  />
                )}
                <div className="relative">
                  <item.icon
                    className={`w-[19px] h-[19px] shrink-0 transition-transform ${active ? "scale-110" : ""}`}
                    style={active ? { color: activeAccent, filter: `drop-shadow(0 0 6px ${activeAccent})` } : undefined}
                  />
                  {item.path === "/chat" && unreadChats > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white bg-gradient-to-br from-rose-500 to-rose-600 ring-2 ring-black/90 shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-[scale-in_0.25s_ease-out]"
                      aria-label={`${unreadChats} messages non lus`}
                    >
                      {unreadChats > 99 ? "99+" : unreadChats}
                    </span>
                  )}
                  {item.path === "/gen-store" && unreadStore > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white bg-gradient-to-br from-amber-500 to-amber-600 ring-2 ring-black/90 shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-[scale-in_0.25s_ease-out]"
                      aria-label={`${unreadStore} nouvelles publications`}
                    >
                      {unreadStore > 99 ? "99+" : unreadStore}
                    </span>
                  )}
                  {item.path === "/notifications" && unreadNotifs > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white bg-gradient-to-br from-rose-500 to-rose-600 ring-2 ring-black/90 shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-[scale-in_0.25s_ease-out]"
                      aria-label={`${unreadNotifs} notifications non lues`}
                    >
                      {unreadNotifs > 99 ? "99+" : unreadNotifs}
                    </span>
                  )}
                </div>
                <span
                  className="text-[9.5px] font-bold leading-none tracking-tight truncate max-w-full relative"
                  style={active ? { color: activeAccent } : undefined}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          <button
            aria-label="Menu"
            onClick={() => setMenuOpen(true)}
            className={menuBtnClass(false)}
          >
            <MenuIcon className="w-[19px] h-[19px] shrink-0" />
            <span className="text-[9.5px] font-bold leading-none tracking-tight truncate max-w-full">
              Menu
            </span>
          </button>
        </div>
      </nav>
      <AppMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>

  );
};


const MenuRow = ({
  icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3.5 py-3.5 hover:bg-white/[0.04] transition text-left active:scale-[0.99]"
  >
    <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-white text-[14px] leading-tight">{label}</p>
      {sublabel && <p className="text-[11px] text-slate-400 truncate mt-0.5">{sublabel}</p>}
    </div>
    <ChevronRight className="w-4 h-4 text-slate-500" />
  </button>
);


const ActionRow = ({
  icon,
  label,
  sublabel,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  danger?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 transition text-left ${danger ? "text-amber-300" : ""}`}
  >
    <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
      {danger ? <Trash2 className="w-5 h-5 text-amber-400" /> : icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium">{label}</p>
      {sublabel && <p className="text-xs text-slate-400 truncate">{sublabel}</p>}
    </div>
    <ChevronRight className="w-4 h-4 text-slate-400" />
  </button>
);

const ToggleRow = ({
  icon,
  label,
  sublabel,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) => (
  <div className="flex items-center gap-3 px-3 py-3">
    <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-white">{label}</p>
      {sublabel && <p className="text-xs text-slate-400 truncate">{sublabel}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

export default BottomNav;
