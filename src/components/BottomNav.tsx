import { useNavigate, useLocation } from "react-router-dom";
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
    `relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-2xl overflow-hidden transition-all duration-300 active:scale-90 min-h-[48px] ${
      active
        ? "text-white bg-gradient-to-br from-[hsl(var(--sunset-orange)/0.35)] via-[hsl(var(--sunset-magenta)/0.30)] to-[hsl(var(--sunset-violet)/0.35)] shadow-inner"
        : "text-slate-400 hover:text-white hover:bg-white/5"
    }`;

  const displayName = profile?.full_name || profile?.name || user?.email?.split("@")[0] || "Invité";
  const initial = (displayName || "?").charAt(0).toUpperCase();

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
        style={{
          background: "linear-gradient(180deg, hsl(258 45% 6% / 0.85), hsl(258 45% 5% / 0.96))",
          backdropFilter: "blur(24px) saturate(160%)",
          borderTop: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 -12px 40px -10px hsl(18 100% 55% / 0.28)",
        }}
      >
        <div className="flex items-stretch justify-around gap-0.5 px-1.5 py-1.5 sm:py-2 max-w-md mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
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
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: "linear-gradient(90deg, hsl(var(--sunset-orange)), hsl(var(--sunset-magenta)), hsl(var(--sunset-violet)))" }}
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
                  <item.icon className={`w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0 transition-transform ${active ? "scale-110" : ""}`} />
                  {item.path === "/chat" && unreadChats > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white bg-gradient-to-br from-amber-500 to-amber-600 ring-2 ring-slate-900 shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-[scale-in_0.25s_ease-out]"
                      aria-label={`${unreadChats} messages non lus`}
                    >
                      {unreadChats > 99 ? "99+" : unreadChats}
                    </span>
                  )}
                  {item.path === "/gen-store" && unreadStore > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white bg-gradient-to-br from-amber-500 to-amber-600 ring-2 ring-slate-900 shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-[scale-in_0.25s_ease-out]"
                      aria-label={`${unreadStore} nouvelles publications`}
                    >
                      {unreadStore > 99 ? "99+" : unreadStore}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-bold leading-none tracking-tight truncate max-w-full">
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
            <MenuIcon className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[9px] font-bold leading-none tracking-tight truncate max-w-full">
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
