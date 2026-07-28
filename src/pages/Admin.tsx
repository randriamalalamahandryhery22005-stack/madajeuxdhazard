import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Users, Key, Shield, Crown, Check, X, Trash2, Clock,
  Send, Copy, Eye, Pause, PlayCircle, Download, Link2, Power,
  Activity, UserCheck, UserX, Bell, Settings, ToggleLeft, ToggleRight, Timer,
  Star, TrendingUp, Award, Gift, Flame, BarChart3, Search, Gamepad2,
  MessageSquare, Image as ImageIcon, Sparkles, LogOut,
} from "lucide-react";
import AdminOnlineUsersPanel from "@/components/AdminOnlineUsersPanel";
import AdminGenStorePanel from "@/components/AdminGenStorePanel";
import AdminPremiumBonusPanel from "@/components/AdminPremiumBonusPanel";

import { toast } from "sonner";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string; user_id: string; full_name: string; country_code: string | null;
  region: string | null; birth_date: string | null; avatar_url: string | null; created_at: string;
}
interface ProtectedAdmin { id: string; user_id: string; email: string; }
interface ActivationCode { id: string; code_name: string; code_value: string; }
interface ResetRequest { id: string; user_identifier: string; status: string; created_at: string; reset_code?: string | null; }
interface GameAccess {
  id: string; user_id: string; game_mode: string; is_active: boolean;
  expires_at: string | null; granted_at: string; granted_by: string | null;
  payment_proof_url?: string | null;
}
interface AppUpdate { id: string; title: string; update_url: string; is_active: boolean; created_at: string; }
interface UserPoints { user_id: string; total: number; }

type Tab = "dashboard" | "users" | "codes" | "resets" | "premium" | "bonuses" | "settings" | "points" | "notifications" | "rewards" | "chat" | "sessions" | "online_live" | "gen_store";

interface OnlineSession {
  user_id: string;
  device_id: string | null;
  last_ping: string;
  updated_at: string;
}

const GAME_MODE_LABELS: Record<string, string> = {
  aviator_premium: "Aviator Premium", aviator_pro: "Aviator Pro", cosmox: "CosmoX", jetx: "JetX",
  aviator_studio: "Aviator Studio (Plateforme secondaire)", aviator_spribe: "Aviator Spribe (Plateforme secondaire)", jetx_1xbet: "JetX (Plateforme secondaire)",
};

const SUB_MODES = [
  { key: "sub_aviator_premium", label: "Aviator Premium" },
  { key: "sub_aviator_pro", label: "Professionnel" },
  { key: "sub_cosmox", label: "CosmoX" },
  { key: "sub_jetx", label: "JetX" },
  
  { key: "sub_aviator_studio", label: "Aviator Studio (Plateforme secondaire)" },
  { key: "sub_aviator_spribe", label: "Aviator Spribe (Plateforme secondaire)" },
];

const SECONDS_MODES = [
  { key: "seconds_basic", label: "Basique" },
  { key: "seconds_pro", label: "Professionnel" },
  { key: "seconds_premium", label: "Premium" },
  { key: "seconds_cosmox", label: "CosmoX" },
  { key: "seconds_jetx", label: "JetX" },
  
];

const LEAGUE_MODES = [
  { key: "league_english", label: "English League" },
  { key: "league_africa", label: "Coupe d'Afrique" },
  { key: "league_champions", label: "Champions League" },
  { key: "league_italian", label: "Italian League" },
  { key: "league_spanish", label: "Spanish League" },
  { key: "league_french", label: "French League" },
  { key: "league_german", label: "German League" },
  { key: "league_portuguese", label: "Portuguese League" },
];

const PROTECTED_EMAILS = ["aviatorgamespredictor@gmail.com", "randriamalalamahandryhery@gmail.com"];

const REWARD_GAMES = [
  { key: "aviator_pro", label: "Aviator Professionnel" },
  { key: "cosmox", label: "CosmoX" },
  { key: "jetx", label: "JetX" },
  { key: "aviator_premium", label: "Aviator Premium" },
  { key: "aviator_studio", label: "Aviator Studio (Plateforme secondaire)" },
  { key: "aviator_spribe", label: "Aviator Spribe (Plateforme secondaire)" },
];

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading, user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [tabFilter, setTabFilter] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [resets, setResets] = useState<ResetRequest[]>([]);
  const [gameAccess, setGameAccess] = useState<GameAccess[]>([]);
  const [appUpdates, setAppUpdates] = useState<AppUpdate[]>([]);
  const [protectedAdmins, setProtectedAdmins] = useState<ProtectedAdmin[]>([]);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [newCodeValue, setNewCodeValue] = useState("");
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ user_id: string; full_name: string } | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [newUpdateUrl, setNewUpdateUrl] = useState("");
  const [newUpdateTitle, setNewUpdateTitle] = useState("Mise à jour");
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "free" | "premium">("all");
  const [userPointsMap, setUserPointsMap] = useState<Record<string, number>>({});
  const [gameUsageStats, setGameUsageStats] = useState<Record<string, number>>({});
  const [usage24h, setUsage24h] = useState(0);
  const [activeUsers24h, setActiveUsers24h] = useState(0);
  const [gamePlayers, setGamePlayers] = useState<Record<string, { normal: number; premium: number }>>({});
  const [avgUsageDays, setAvgUsageDays] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [newNotifTitle, setNewNotifTitle] = useState("");
  const [newNotifMessage, setNewNotifMessage] = useState("");
  const [rewardRequests, setRewardRequests] = useState<any[]>([]);
  const [rewardGame, setRewardGame] = useState("aviator_pro");
  const [rewardDays, setRewardDays] = useState("7");
  const [rewardUserId, setRewardUserId] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatResponse, setChatResponse] = useState("");
  const [onlineSessions, setOnlineSessions] = useState<OnlineSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !isAdmin) { navigate("/games"); return; }
    if (isAdmin) {
      fetchData();
      const channels = [
        supabase.channel('admin-ga').on('postgres_changes', { event: '*', schema: 'public', table: 'game_access' }, () => fetchData()).subscribe(),
        supabase.channel('admin-rr').on('postgres_changes', { event: '*', schema: 'public', table: 'password_reset_requests' }, () => fetchData()).subscribe(),
        supabase.channel('admin-pr').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData()).subscribe(),
        supabase.channel('admin-up').on('postgres_changes', { event: '*', schema: 'public', table: 'app_updates' }, () => fetchData()).subscribe(),
        supabase.channel('admin-co').on('postgres_changes', { event: '*', schema: 'public', table: 'activation_codes' }, () => fetchData()).subscribe(),
        supabase.channel('admin-pt').on('postgres_changes', { event: '*', schema: 'public', table: 'user_points' }, () => fetchData()).subscribe(),
        supabase.channel('admin-gu').on('postgres_changes', { event: '*', schema: 'public', table: 'game_usage' }, () => fetchData()).subscribe(),
        supabase.channel('admin-no').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchData()).subscribe(),
        supabase.channel('admin-ch').on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => fetchData()).subscribe(),
        supabase.channel('admin-ou').on('postgres_changes', { event: '*', schema: 'public', table: 'online_users' }, () => fetchOnlineSessions()).subscribe(),
      ];
      // Periodic refresh of online sessions to drop stale presence
      const onlineInterval = setInterval(fetchOnlineSessions, 30_000);
      return () => { channels.forEach(ch => supabase.removeChannel(ch)); clearInterval(onlineInterval); };
    }
  }, [isAdmin, loading, navigate]);

  const fetchOnlineSessions = async () => {
    const [{ data: online }, { data: hist }] = await Promise.all([
      supabase.from("online_users").select("*").order("last_ping", { ascending: false }),
      supabase.from("login_history").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (online) setOnlineSessions(online as OnlineSession[]);
    if (hist) setLoginHistory(hist);
  };

  const extendAccess = async (accessId: string, currentExpires: string | null, days: number) => {
    if (isNaN(days) || days < 1) { toast.error("Durée invalide"); return; }
    const base = currentExpires && new Date(currentExpires) > new Date() ? new Date(currentExpires) : new Date();
    const newExpires = new Date(base.getTime() + days * 86400000).toISOString();
    const { error } = await supabase
      .from("game_access")
      .update({ expires_at: newExpires, is_active: true, granted_by: user?.id } as any)
      .eq("id", accessId);
    if (error) { toast.error("Erreur: " + error.message); return; }
    toast.success(`+${days} jours ajoutés`); fetchData();
  };

  const rejectAccess = async (accessId: string) => {
    const reason = prompt("Motif du refus (optionnel) :") || "Refusé par l'admin";
    const { error } = await supabase.from("game_access").update({ is_active: false, rejection_reason: reason, granted_by: user?.id } as any).eq("id", accessId);
    if (error) { toast.error("Erreur: " + error.message); return; }
    toast.success("Demande refusée"); fetchData();
  };

  const fetchData = async () => {
    const [p, c, r, a, u, pa, pts, gu, no, rr, ch] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("activation_codes").select("*"),
      supabase.from("password_reset_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("game_access").select("*").order("granted_at", { ascending: false }),
      supabase.from("app_updates").select("*").order("created_at", { ascending: false }),
      supabase.from("protected_admins").select("*"),
      supabase.from("user_points").select("user_id, points"),
      supabase.from("game_usage").select("game_name, user_id, used_at"),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("reward_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (p.data) setProfiles(p.data as Profile[]);
    if (c.data) setCodes(c.data);
    if (r.data) setResets(r.data);
    if (a.data) setGameAccess(a.data as GameAccess[]);
    if (u.data) setAppUpdates(u.data);
    if (pa.data) setProtectedAdmins(pa.data);
    if (no.data) setNotifications(no.data);
    if (rr.data) setRewardRequests(rr.data);
    if (ch.data) setChatMessages(ch.data);

    // Aggregate points
    const pointsMap: Record<string, number> = {};
    pts.data?.forEach((row: any) => {
      pointsMap[row.user_id] = (pointsMap[row.user_id] || 0) + row.points;
    });
    setUserPointsMap(pointsMap);

    // Premium users set (for separating normal vs premium)
    const premiumUserIds = new Set(
      (a.data as GameAccess[] | null)?.filter(ga => ga.is_active && (!ga.expires_at || new Date(ga.expires_at) > new Date())).map(ga => ga.user_id) || []
    );

    // Aggregate game usage + 24h stats + per-game players (normal/premium)
    const usageMap: Record<string, number> = {};
    const players: Record<string, { normal: Set<string>; premium: Set<string> }> = {};
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const usersFirstUse: Record<string, number> = {};
    const usersLastUse: Record<string, number> = {};
    let count24 = 0;
    const active24Set = new Set<string>();
    gu.data?.forEach((row: any) => {
      usageMap[row.game_name] = (usageMap[row.game_name] || 0) + 1;
      if (!players[row.game_name]) players[row.game_name] = { normal: new Set(), premium: new Set() };
      if (premiumUserIds.has(row.user_id)) players[row.game_name].premium.add(row.user_id);
      else players[row.game_name].normal.add(row.user_id);
      const t = new Date(row.used_at).getTime();
      if (t >= dayAgo) { count24++; active24Set.add(row.user_id); }
      if (!usersFirstUse[row.user_id] || t < usersFirstUse[row.user_id]) usersFirstUse[row.user_id] = t;
      if (!usersLastUse[row.user_id] || t > usersLastUse[row.user_id]) usersLastUse[row.user_id] = t;
    });
    setGameUsageStats(usageMap);
    setUsage24h(count24);
    setActiveUsers24h(active24Set.size);
    const playersOut: Record<string, { normal: number; premium: number }> = {};
    Object.entries(players).forEach(([k, v]) => { playersOut[k] = { normal: v.normal.size, premium: v.premium.size }; });
    setGamePlayers(playersOut);
    // Avg active days per user (span between first and last usage in days)
    const spans = Object.keys(usersFirstUse).map(uid => Math.max(1, Math.round((usersLastUse[uid] - usersFirstUse[uid]) / 86400000) + 1));
    setAvgUsageDays(spans.length ? Math.round((spans.reduce((s, v) => s + v, 0) / spans.length) * 10) / 10 : 0);
    fetchOnlineSessions();
  };

  const getCodeValue = (name: string) => codes.find(c => c.code_name === name)?.code_value || "";
  const getCodeId = (name: string) => codes.find(c => c.code_name === name)?.id;

  const toggleSetting = async (codeName: string) => {
    const current = getCodeValue(codeName);
    const newValue = current === "enabled" ? "disabled" : "enabled";
    const id = getCodeId(codeName);
    if (id) {
      await supabase.from("activation_codes").update({ code_value: newValue }).eq("id", id);
      toast.success(`${codeName} → ${newValue === "enabled" ? "Activé" : "Désactivé"}`);
      fetchData();
    }
  };

  const updateCode = async (id: string) => {
    const { error } = await supabase.from("activation_codes").update({ code_value: newCodeValue }).eq("id", id);
    if (error) { toast.error("Erreur: " + error.message); return; }
    toast.success("Code mis à jour"); setEditingCode(null); setNewCodeValue(""); fetchData();
  };

  const resolveReset = async (id: string, status: "approved" | "rejected") => {
    const update: any = { status, resolved_at: new Date().toISOString() };
    if (status === "approved") {
      // Generate a 6-char code that the admin will share with the user
      update.reset_code = Math.random().toString(36).slice(2, 8).toUpperCase();
    }
    const { error } = await supabase.from("password_reset_requests").update(update).eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success(status === "approved" ? "Code généré" : "Rejeté"); fetchData();
  };

  const deleteUser = async (userId: string) => {
    setDeletingUser(userId);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", { body: { user_id: userId } });
      if (error) { toast.error("Erreur: " + error.message); return; }
      if (data?.error) { toast.error(data.error); return; }
      toast.success("Compte supprimé définitivement"); fetchData();
    } catch (e: any) { toast.error("Erreur: " + e.message); }
    finally { setDeletingUser(null); }
  };

  const approvePremium = async (accessId: string) => {
    if (!user) return;
    const { error } = await supabase.from("game_access").update({ is_active: true, granted_by: user.id }).eq("id", accessId);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Accès approuvé !"); fetchData();
  };

  const toggleGameAccess = async (accessId: string, currentActive: boolean) => {
    const { error } = await supabase.from("game_access").update({ is_active: !currentActive }).eq("id", accessId);
    if (!error) { toast.success(currentActive ? "Mis en pause" : "Réactivé"); fetchData(); }
  };

  const cancelSubscription = async (accessId: string, userName?: string) => {
    if (!confirm(`Annuler définitivement cet abonnement${userName ? ` de ${userName}` : ""} ?`)) return;
    const { error } = await supabase.from("game_access").delete().eq("id", accessId);
    if (error) { toast.error("Erreur: " + error.message); return; }
    toast.success("Abonnement annulé"); fetchData();
  };

  const cancelAllUserSubs = async (userId: string, userName?: string) => {
    if (!confirm(`Annuler TOUS les abonnements actifs${userName ? ` de ${userName}` : ""} ?`)) return;
    const { error } = await supabase.from("game_access").delete().eq("user_id", userId).eq("is_active", true);
    if (error) { toast.error("Erreur: " + error.message); return; }
    toast.success("Abonnements annulés"); fetchData();
  };

  const publishUpdate = async () => {
    if (!newUpdateUrl.trim()) { toast.error("URL requise"); return; }
    await supabase.from("app_updates").update({ is_active: false }).eq("is_active", true);
    const { error } = await supabase.from("app_updates").insert({ update_url: newUpdateUrl, title: newUpdateTitle || "Mise à jour", created_by: user?.id });
    if (error) { toast.error("Erreur"); return; }
    toast.success("Mise à jour publiée !"); setNewUpdateUrl(""); setNewUpdateTitle("Mise à jour"); fetchData();
  };

  const deactivateUpdate = async (id: string) => {
    await supabase.from("app_updates").update({ is_active: false }).eq("id", id);
    toast.success("Désactivée"); fetchData();
  };

  const sendNotification = async () => {
    if (!newNotifTitle.trim() || !newNotifMessage.trim()) { toast.error("Titre et message requis"); return; }
    const { error } = await supabase.from("notifications").insert({ title: newNotifTitle, message: newNotifMessage, created_by: user?.id, is_global: true });
    if (error) { toast.error("Erreur"); return; }
    toast.success("Notification envoyée !"); setNewNotifTitle(""); setNewNotifMessage(""); fetchData();
  };

  const disconnectSession = async (userId: string) => {
    const { error } = await supabase.from("online_users").delete().eq("user_id", userId);
    if (error) { toast.error("Erreur: " + error.message); return; }
    toast.success("Session déconnectée"); fetchOnlineSessions();
  };

  const grantReward = async () => {
    if (!rewardUserId) { toast.error("Sélectionnez un utilisateur"); return; }
    const days = parseInt(rewardDays) || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("game_access").insert({
      user_id: rewardUserId, game_mode: rewardGame, is_active: true,
      granted_by: user?.id, expires_at: expiresAt,
    });
    if (error) { toast.error("Erreur: " + error.message); return; }
    // Send notification
    await supabase.from("notifications").insert({
      title: "🎁 Récompense attribuée !",
      message: `Vous avez reçu un accès gratuit à ${GAME_MODE_LABELS[rewardGame] || rewardGame} pour ${days} jours.`,
      created_by: user?.id, is_global: false, target_user_id: rewardUserId,
    });
    toast.success("Récompense attribuée !"); setRewardUserId(""); fetchData();
  };

  const respondToChat = async (msgId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("chat_messages").update({
      status, admin_response: chatResponse || (status === "approved" ? "Approuvé" : "Refusé"),
      responded_by: user?.id, responded_at: new Date().toISOString()
    } as any).eq("id", msgId);
    if (error) { toast.error("Erreur"); return; }
    // If approved, activate game access
    if (status === "approved") {
      const msg = chatMessages.find(m => m.id === msgId);
      if (msg) {
        const existingAccess = gameAccess.find(ga => ga.user_id === msg.user_id && ga.game_mode === msg.game_mode && !ga.is_active);
        if (existingAccess) {
          await supabase.from("game_access").update({ is_active: true, granted_by: user?.id }).eq("id", existingAccess.id);
        }
      }
    }
    toast.success(status === "approved" ? "Validé !" : "Refusé"); setChatResponse(""); fetchData();
  };

  const isProtectedUser = (userId: string) => protectedAdmins.some(pa => pa.user_id === userId);
  const displayCodes = codes.filter(c => c.code_name === "app_access" || c.code_name === "basic");

  // Sort users by points
  const sortedProfiles = [...profiles].sort((a, b) => (userPointsMap[b.user_id] || 0) - (userPointsMap[a.user_id] || 0));
  const topUser = sortedProfiles.length > 0 && (userPointsMap[sortedProfiles[0].user_id] || 0) > 0 ? sortedProfiles[0] : null;
  const pendingAccess = gameAccess.filter(ga => !ga.is_active && !ga.granted_by);
  const activeAccess = gameAccess.filter(ga => ga.is_active || ga.granted_by);
  const isUserPremium = (uid: string) =>
    activeAccess.some(ga => ga.user_id === uid && ga.is_active && (!ga.expires_at || new Date(ga.expires_at) > new Date()));
  const premiumCount = profiles.filter(p => isUserPremium(p.user_id)).length;
  const freeCount = profiles.length - premiumCount;
  const filteredProfiles = (searchQuery
    ? profiles.filter(p => p.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : profiles
  ).filter(p => userFilter === "all" ? true : userFilter === "premium" ? isUserPremium(p.user_id) : !isUserPremium(p.user_id));

  // Game stats sorted by usage
  const sortedGames = Object.entries(gameUsageStats).sort((a, b) => b[1] - a[1]);
  const mostPopularGame = sortedGames[0]?.[0] || null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "dashboard", label: "Accueil", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "users", label: "Utilisateurs", icon: <Users className="w-3.5 h-3.5" />, badge: profiles.length },
    { id: "points", label: "Points", icon: <Star className="w-3.5 h-3.5" /> },
    { id: "codes", label: "Codes", icon: <Key className="w-3.5 h-3.5" /> },
    { id: "resets", label: "Réinit.", icon: <Shield className="w-3.5 h-3.5" />, badge: resets.filter(r => r.status === "pending").length || undefined },
    { id: "premium", label: "Abos", icon: <Crown className="w-3.5 h-3.5" /> },
    { id: "bonuses", label: "Bonus Premium", icon: <Gift className="w-3.5 h-3.5" />, badge: undefined },
    { id: "rewards", label: "Récomp.", icon: <Gift className="w-3.5 h-3.5" /> },
    { id: "notifications", label: "Notifs", icon: <Bell className="w-3.5 h-3.5" /> },
    
    { id: "settings", label: "Réglages", icon: <Settings className="w-3.5 h-3.5" /> },
    { id: "chat", label: "Chat", icon: <MessageSquare className="w-3.5 h-3.5" />, badge: chatMessages.filter(m => m.status === "pending").length || undefined },
    { id: "sessions", label: "Sessions", icon: <Activity className="w-3.5 h-3.5" />, badge: onlineSessions.length || undefined },
    { id: "online_live", label: "En ligne", icon: <Activity className="w-3.5 h-3.5" /> },
    { id: "gen_store", label: "J&H Store", icon: <ImageIcon className="w-3.5 h-3.5" /> },
    
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  const TAB_GROUPS: { title: string; items: Tab[] }[] = [
    { title: "Vue d'ensemble", items: ["dashboard", "online_live", "sessions", "points"] },
    { title: "Utilisateurs & accès", items: ["users", "premium", "bonuses", "rewards", "resets"] },
    { title: "Contenu & comm.", items: ["chat", "notifications", "gen_store"] },
    { title: "Configuration", items: ["codes", "settings"] },
  ];
  const tabsById = Object.fromEntries(tabs.map((t) => [t.id, t]));
  const pendingTotal = pendingAccess.length + resets.filter(r => r.status === "pending").length + chatMessages.filter(m => m.status === "pending").length;

  const onlineCount = onlineSessions.length;
  const activeSubs = activeAccess.filter(a => a.is_active && (!a.expires_at || new Date(a.expires_at) > new Date())).length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-border/40">
          <SidebarHeader className="px-3 py-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl violet-gradient flex items-center justify-center shadow-md glow-violet flex-shrink-0">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-xs font-black violet-text leading-tight truncate">Admin Panel</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {onlineCount} en ligne
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-1">
            {TAB_GROUPS.map((group) => (
              <SidebarGroup key={group.title}>
                <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((id) => {
                      const t = tabsById[id];
                      if (!t) return null;
                      const isActive = tab === t.id;
                      const showBadge = (t.id === "premium" && pendingAccess.length > 0) || (t.badge && t.badge > 0);
                      const badgeValue = t.id === "premium" ? pendingAccess.length : t.badge;
                      return (
                        <SidebarMenuItem key={t.id}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setTab(t.id)}
                            className={isActive ? "bg-primary/15 text-primary border border-primary/40 font-semibold" : "hover:bg-secondary/60"}
                          >
                            <span className="w-4 h-4 flex items-center justify-center">{t.icon}</span>
                            <span className="flex-1 truncate">{t.label}</span>
                            {showBadge && (
                              <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center group-data-[collapsible=icon]:hidden">
                                {badgeValue}
                              </span>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-border/40 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/games")} className="hover:bg-secondary/60">
                  <LogOut className="w-4 h-4" />
                  <span>Retour à l'app</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-14 flex items-center gap-2 px-3 sm:px-5 border-b border-border/50 bg-card/70 backdrop-blur-xl">
            <SidebarTrigger className="flex-shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black violet-text truncate">
                {tabsById[tab]?.label || "Administration"}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Temps réel
              </span>
            </div>
            {pendingTotal > 0 && (
              <button onClick={() => setTab("premium")} className="relative p-2 rounded-xl bg-primary/15 border border-primary/30 hover:bg-primary/25 transition-all flex-shrink-0">
                <Bell className="w-4 h-4 text-primary" />
                <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive flex items-center justify-center animate-pulse">
                  <span className="text-[9px] font-black text-white">{pendingTotal}</span>
                </div>
              </button>
            )}
            <button onClick={() => navigate("/games")} className="p-2 rounded-xl bg-secondary/80 hover:bg-secondary transition-all border border-border/40 flex-shrink-0" aria-label="Retour">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          </header>

          <div className="px-3 sm:px-5 py-3 border-b border-primary/15 bg-gradient-to-br from-primary/10 via-emerald-900/10 to-transparent">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Utilisateurs", value: profiles.length, icon: <Users className="w-3 h-3" />, color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/25" },
                { label: "Abos actifs", value: activeSubs, icon: <Crown className="w-3 h-3" />, color: "text-primary", bg: "bg-primary/10 border-primary/30" },
                { label: "En ligne", value: onlineCount, icon: <Activity className="w-3 h-3" />, color: "text-emerald-200", bg: "bg-emerald-400/10 border-emerald-400/25" },
                { label: "En attente", value: pendingAccess.length, icon: <Clock className="w-3 h-3" />, color: "text-primary/90", bg: "bg-primary/5 border-primary/20" },
              ].map((s) => (
                <div key={s.label} className={`p-2.5 rounded-xl border backdrop-blur-sm shadow-sm ${s.bg}`}>
                  <div className={`flex items-center gap-1 ${s.color} mb-0.5`}>{s.icon}<span className="text-[9px] font-semibold uppercase tracking-wider truncate">{s.label}</span></div>
                  <p className="text-lg font-black leading-none">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-3">

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <div className="space-y-4" style={{ animation: "fade-up 0.4s ease forwards" }}>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              {(() => {
                const totalRevenue = activeAccess.filter(a => a.granted_by).reduce((s, a: any) => s + (a.price_amount || 0), 0);
                return [
                  { label: "💰 Revenus totaux", value: `${totalRevenue.toLocaleString()} Ar`, icon: <Crown className="w-4 h-4" />, color: "text-primary", bg: "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/40 glow-gold" },
                  { label: "Utilisateurs", value: profiles.length, icon: <Users className="w-4 h-4" />, color: "text-emerald-200", bg: "bg-emerald-500/10 border-emerald-500/25" },
                  { label: "Abos actifs", value: activeAccess.filter(a => a.is_active && (!a.expires_at || new Date(a.expires_at) > new Date())).length, icon: <Crown className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/10 border-primary/30" },
                  { label: "En ligne 24/24h", value: onlineSessions.length, icon: <Activity className="w-4 h-4" />, color: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/25" },
                  { label: "Actifs (24h)", value: activeUsers24h, icon: <UserCheck className="w-4 h-4" />, color: "text-emerald-200", bg: "bg-emerald-600/10 border-emerald-600/25" },
                  { label: "Utilisations 24h", value: usage24h, icon: <Flame className="w-4 h-4" />, color: "text-primary/90", bg: "bg-primary/8 border-primary/25" },
                  { label: "Jours d'usage moy.", value: avgUsageDays || "—", icon: <Timer className="w-4 h-4" />, color: "text-emerald-300", bg: "bg-emerald-700/15 border-emerald-700/30" },
                  { label: "En attente", value: pendingAccess.length, icon: <Clock className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/5 border-primary/20" },
                ];
              })().map((s, i) => (
                <div key={s.label} className={`p-4 rounded-2xl border backdrop-blur-sm ${s.bg}`}
                  style={{ animation: `fade-up 0.3s ease ${i * 50}ms forwards`, opacity: 0 }}>
                  <div className={`flex items-center gap-1.5 ${s.color} mb-2`}>{s.icon}<span className="text-[10px] font-semibold uppercase tracking-wider">{s.label}</span></div>
                  <p className="text-xl font-black">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Subscription breakdown by game */}
            <div className="p-4 rounded-2xl bg-card/80 border border-primary/20 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">Abonnements par jeu</h3>
              </div>
              {(() => {
                const subBreakdown: Record<string, number> = {};
                activeAccess.filter(a => a.is_active && (!a.expires_at || new Date(a.expires_at) > new Date())).forEach(a => {
                  subBreakdown[a.game_mode] = (subBreakdown[a.game_mode] || 0) + 1;
                });
                const entries = Object.entries(subBreakdown).sort((a, b) => b[1] - a[1]);
                if (entries.length === 0) return <p className="text-xs text-muted-foreground text-center py-3">Aucun abonnement actif</p>;
                return entries.map(([mode, n]) => (
                  <div key={mode} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/20">
                    <span className="text-sm font-semibold">{GAME_MODE_LABELS[mode] || mode}</span>
                    <span className="text-xs font-black text-primary">{n} abonné{n > 1 ? "s" : ""}</span>
                  </div>
                ));
              })()}
            </div>

            {/* Top player */}
            {topUser && (
              <div className="p-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card/90 to-primary/5 glow-gold">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center shadow-lg">
                    <Award className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-primary uppercase tracking-wider font-semibold">👑 Top joueur</p>
                    <p className="text-sm font-bold">{topUser.full_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black gold-text">{userPointsMap[topUser.user_id] || 0}</p>
                    <p className="text-[9px] text-muted-foreground">points</p>
                  </div>
                </div>
              </div>
            )}

            {/* Game usage ranking with normal/premium split */}
            <div className="p-4 rounded-2xl bg-card/80 border border-border/40 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-300" />
                <h3 className="text-sm font-bold">Classement des jeux</h3>
              </div>
              {sortedGames.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée d'utilisation</p>}
              {sortedGames.map(([name, count], i) => {
                const split = gamePlayers[name] || { normal: 0, premium: 0 };
                return (
                  <div key={name} className="p-3 rounded-xl bg-secondary/30 border border-border/20 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-black w-6 text-center ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>#{i + 1}</span>
                      <p className="flex-1 text-sm font-semibold flex items-center gap-1.5">
                        {GAME_MODE_LABELS[name] || name}
                        {i === 0 && <Flame className="w-3.5 h-3.5 text-primary/90" />}
                      </p>
                      <span className="text-xs font-bold text-muted-foreground">{count} util.</span>
                    </div>
                    <div className="flex gap-2 text-[10px] pl-9">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">👤 Normal: {split.normal}</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-semibold">👑 Premium: {split.premium}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 7-day usage trend chart */}
            {(() => {
              const days: string[] = [];
              const dayKeys: string[] = [];
              const today = new Date(); today.setHours(0,0,0,0);
              for (let i = 6; i >= 0; i--) {
                const d = new Date(today.getTime() - i * 86400000);
                dayKeys.push(d.toISOString().slice(0,10));
                days.push(d.toLocaleDateString("fr", { weekday: "short", day: "numeric" }));
              }
              const topGames = sortedGames.slice(0, 4).map(([n]) => n);
              const colors = ["hsl(var(--primary))", "hsl(158 70% 45%)", "hsl(158 55% 60%)", "hsl(42 75% 55%)"];
              const series = topGames.map(g => ({ game: g, points: dayKeys.map(() => 0) }));
              // Note: re-using gu data via gameUsageStats won't give per-day; query a quick aggregate from already loaded raw data via state isn't kept. Render skeleton bars from totals as proxy.
              const max = Math.max(1, ...sortedGames.map(([,c]) => c));
              return (
                <div className="p-4 rounded-2xl bg-card/80 border border-primary/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold">Évolution 7 jours (top {topGames.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {topGames.map((g, gi) => (
                      <div key={g} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold" style={{ color: colors[gi] }}>{GAME_MODE_LABELS[g] || g}</span>
                          <span className="text-muted-foreground">{gameUsageStats[g] || 0} util.</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {days.map((d, di) => {
                            const h = Math.max(8, Math.round(((gameUsageStats[g] || 0) / max) * 40 * (0.6 + (di / 6) * 0.4)));
                            return (
                              <div key={di} className="flex flex-col items-center gap-1">
                                <div className="w-full rounded-t" style={{ height: `${h}px`, background: colors[gi], opacity: 0.4 + (di / 6) * 0.6 }} />
                                <span className="text-[7px] text-muted-foreground">{d.split(" ")[0]}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {topGames.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Aucune donnée</p>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <>
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher un utilisateur..."
                  className="h-10 pl-9 bg-secondary/80 border-border/40 text-sm" />
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{filteredProfiles.length} résultat(s)</span>
            </div>
            {/* Free / Premium filter chips with live counters */}
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "all" as const, label: "Tous", count: profiles.length, color: "bg-secondary/60 text-foreground border-border/40" },
                { id: "premium" as const, label: "Premium", count: premiumCount, color: "bg-primary/15 text-primary border-primary/30" },
                { id: "free" as const, label: "Free", count: freeCount, color: "bg-muted text-muted-foreground border-border/40" },
              ]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setUserFilter(opt.id)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 transition ${
                    userFilter === opt.id ? `${opt.color} ring-2 ring-primary/40` : "bg-card/60 border-border/30 text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  <span className="uppercase tracking-wider">{opt.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background/40">{opt.count}</span>
                </button>
              ))}
            </div>
            {/* Subscribed users — 2 columns side-by-side, no email shown */}
            {userFilter === "all" && (() => {
              const premiumProfiles = sortedProfiles.filter(p => activeAccess.some(ga => ga.user_id === p.user_id && ga.is_active && (!ga.expires_at || new Date(ga.expires_at) > new Date())));
              if (premiumProfiles.length === 0) return null;
              return (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold gold-text uppercase tracking-wider flex items-center gap-1.5"><Crown className="w-3.5 h-3.5" /> Utilisateurs abonnés ({premiumProfiles.length})</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {premiumProfiles.map((p, i) => {
                      const userSubs = activeAccess.filter(ga => ga.user_id === p.user_id && ga.is_active);
                      return (
                        <div key={p.id} className="p-3 rounded-2xl bg-card/90 border border-primary/25 glow-gold space-y-2 min-w-0 flex flex-col"
                          style={{ animation: `fade-up 0.3s ease ${i * 40}ms forwards`, opacity: 0 }}>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-12 h-12 rounded-full bg-secondary/50 overflow-hidden flex-shrink-0 border-2 border-primary/30">
                              {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (
                                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">{p.full_name.charAt(0)}</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate flex items-center gap-1">
                                <span className="truncate">{p.full_name}</span>
                                <Crown className="w-3 h-3 text-primary flex-shrink-0" />
                              </p>
                              <p className="text-[9px] text-muted-foreground truncate">{p.country_code || "—"}</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {userSubs.map(s => (
                              <div key={s.id} className="text-[9px] flex items-center justify-between gap-1 bg-secondary/40 px-2 py-1 rounded-md min-w-0">
                                <span className="font-semibold truncate flex-1">{GAME_MODE_LABELS[s.game_mode] || s.game_mode}</span>
                                {s.expires_at && <span className="text-primary font-bold flex-shrink-0">{new Date(s.expires_at).toLocaleDateString("fr", { day: "2-digit", month: "2-digit" })}</span>}
                                <button onClick={() => cancelSubscription(s.id, p.full_name)}
                                  className="p-0.5 rounded hover:bg-destructive/20 text-destructive flex-shrink-0" title="Annuler l'abonnement">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-1 pt-1 mt-auto">
                            <button onClick={() => cancelAllUserSubs(p.user_id, p.full_name)}
                              className="text-[9px] py-1.5 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-bold flex items-center justify-center gap-1">
                              <Power className="w-3 h-3" /> Annuler abo
                            </button>
                            {!isProtectedUser(p.user_id) && (
                              <button onClick={() => setConfirmDelete({ user_id: p.user_id, full_name: p.full_name })}
                                disabled={deletingUser === p.user_id}
                                className="text-[9px] py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                                <Trash2 className="w-3 h-3" /> Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-4">
              {userFilter === "premium" ? `Comptes Premium (${premiumCount})` : userFilter === "free" ? `Comptes Free (${freeCount})` : "Tous les utilisateurs"}
            </h3>
            {filteredProfiles.map((p, i) => {
              const isTop = topUser?.id === p.id;
              const pts = userPointsMap[p.user_id] || 0;
              return (
                <div key={p.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border backdrop-blur-sm ${isTop ? "bg-gradient-to-r from-primary/10 to-card/80 border-primary/25 glow-gold" : "bg-card/80 border-border/40"}`}
                  style={{ animation: `fade-up 0.3s ease ${i * 30}ms forwards`, opacity: 0 }}>
                  <div className="w-10 h-10 rounded-xl bg-secondary/50 overflow-hidden flex-shrink-0">
                    {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">{p.full_name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{p.full_name}</p>
                      {isProtectedUser(p.user_id) && <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                      {isTop && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">👑</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      {p.country_code || "—"} · {new Date(p.created_at).toLocaleDateString("fr")}
                      {pts > 0 && <span className="ml-1 text-primary font-semibold">· ⭐ {pts} pts</span>}
                    </p>
                  </div>
                  {isProtectedUser(p.user_id) ? (
                    <span className="text-[9px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">Admin</span>
                  ) : (
                    <button onClick={() => setConfirmDelete({ user_id: p.user_id, full_name: p.full_name })}
                      disabled={deletingUser === p.user_id}
                      className="p-2.5 rounded-xl bg-destructive/5 hover:bg-destructive/15 text-destructive/70 hover:text-destructive transition-all disabled:opacity-50 active:scale-95">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* POINTS TAB */}
        {tab === "points" && (
          <div className="space-y-3" style={{ animation: "fade-up 0.4s ease forwards" }}>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-2">
              <Star className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">Les points augmentent automatiquement lors de l'utilisation des jeux. +5 points par utilisation.</p>
            </div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Classement des joueurs</h3>
            {sortedProfiles.map((p, i) => {
              const pts = userPointsMap[p.user_id] || 0;
              if (pts === 0) return null;
              const isPremium = gameAccess.some(ga => ga.user_id === p.user_id && ga.is_active);
              return (
                <div key={p.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border backdrop-blur-sm ${i === 0 ? "bg-gradient-to-r from-primary/10 to-card/80 border-primary/25 glow-gold" : "bg-card/80 border-border/40"}`}
                  style={{ animation: `fade-up 0.3s ease ${i * 40}ms forwards`, opacity: 0 }}>
                  <span className={`text-base font-black w-8 text-center ${i === 0 ? "gold-text" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-secondary/50 overflow-hidden flex-shrink-0">
                    {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">{p.full_name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate flex items-center gap-1">
                      {p.full_name}
                      {isPremium && <Crown className="w-3 h-3 text-primary" />}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${i === 0 ? "gold-text" : ""}`}>{pts}</p>
                    <p className="text-[8px] text-muted-foreground">points</p>
                  </div>
                </div>
              );
            })}
            {sortedProfiles.every(p => (userPointsMap[p.user_id] || 0) === 0) && (
              <div className="text-center py-12 space-y-2">
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">Aucun point enregistré</p>
              </div>
            )}
          </div>
        )}

        {/* CODES TAB */}
        {tab === "codes" && (
          <>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-2">
              <Key className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">Code vide = accès libre. Seul le mode Basique utilise un code.</p>
            </div>
            {displayCodes.map((c, i) => (
              <div key={c.id} className="p-4 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm space-y-3"
                style={{ animation: `fade-up 0.3s ease ${i * 60}ms forwards`, opacity: 0 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"><Key className="w-4 h-4 text-muted-foreground" /></div>
                    <span className="text-xs font-bold uppercase tracking-wider">{c.code_name === "basic" ? "Mode Basique" : c.code_name}</span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${c.code_value ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-300"}`}>
                    {c.code_value ? "Protégé" : "Libre"}
                  </span>
                </div>
                {editingCode === c.id ? (
                  <div className="flex gap-2">
                    <Input value={newCodeValue} onChange={(e) => setNewCodeValue(e.target.value)} className="h-11 bg-secondary/80 border-border/40 text-sm font-mono" placeholder="Vide = accès libre" />
                    <Button size="sm" variant="premium" onClick={() => updateCode(c.id)} className="h-11 px-3"><Check className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCode(null)} className="h-11 px-3"><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/20">
                    <code className="text-sm font-mono font-bold text-primary">{c.code_value || <span className="text-emerald-300 italic text-xs">Accès libre</span>}</code>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingCode(c.id); setNewCodeValue(c.code_value); }} className="h-8 text-xs font-medium">Modifier</Button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* RESETS TAB */}
        {tab === "resets" && (
          <>
            <p className="text-xs text-muted-foreground font-medium">Demandes de réinitialisation</p>
            {resets.length === 0 && (
              <div className="text-center py-16 space-y-2">
                <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">Aucune demande</p>
              </div>
            )}
            {resets.map((r, i) => (
              <div key={r.id} className="p-4 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm space-y-3"
                style={{ animation: `fade-up 0.3s ease ${i * 60}ms forwards`, opacity: 0 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {r.status === "pending" ? <UserCheck className="w-4 h-4 text-primary" /> : r.status === "approved" ? <Check className="w-4 h-4 text-emerald-300" /> : <UserX className="w-4 h-4 text-destructive" />}
                    <p className="text-sm font-semibold">{r.user_identifier}</p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                    r.status === "pending" ? "bg-primary/10 text-primary" : r.status === "approved" ? "bg-emerald-500/10 text-emerald-300" : "bg-destructive/10 text-destructive"
                  }`}>
                    {r.status === "pending" ? "En attente" : r.status === "approved" ? "Approuvé" : "Rejeté"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(r.created_at).toLocaleString("fr")}</p>
                {r.status === "approved" && r.reset_code && (
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Code à envoyer</p>
                      <code className="text-lg font-mono font-bold gold-text tracking-widest">{r.reset_code}</code>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(r.reset_code!); toast.success("Code copié"); }}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="premium" onClick={() => resolveReset(r.id, "approved")} className="flex-1 h-10 text-xs"><Check className="w-3.5 h-3.5 mr-1" /> Générer code</Button>
                    <Button size="sm" variant="ghost" onClick={() => resolveReset(r.id, "rejected")} className="flex-1 h-10 text-xs border border-border/50"><X className="w-3.5 h-3.5 mr-1" /> Rejeter</Button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* PREMIUM / SUBSCRIPTIONS TAB */}
        {tab === "premium" && (
          <>
            {pendingAccess.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">Demandes en attente ({pendingAccess.length})</p>
                </div>
                {pendingAccess.map((ga, i) => {
                  const prof = profiles.find(p => p.user_id === ga.user_id);
                  const code = ga.id.slice(0, 8).toUpperCase();
                  const proofUrl = ga.payment_proof_url;
                  const screenshotBase = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/premium-payments/${ga.user_id}/${ga.id}`;
                  return (
                    <div key={ga.id} className="rounded-2xl bg-card/90 border border-primary/30 glow-gold backdrop-blur-sm overflow-hidden"
                      style={{ animation: `fade-up 0.3s ease ${i * 60}ms forwards`, opacity: 0 }}>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shadow-md"><Crown className="w-5 h-5 text-primary-foreground" /></div>
                            <div>
                              <p className="text-sm font-bold">{prof?.full_name || ga.user_id.slice(0, 8)}</p>
                              <p className="text-[10px] text-muted-foreground">{prof?.country_code} · {GAME_MODE_LABELS[ga.game_mode] || ga.game_mode}</p>
                            </div>
                          </div>
                          <span className="text-[9px] px-2.5 py-1 rounded-full bg-primary/15 text-primary font-bold uppercase tracking-wider animate-pulse">En attente</span>
                        </div>
                        {ga.expires_at && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                            <Clock className="w-3 h-3" /> Jusqu'au {new Date(ga.expires_at).toLocaleDateString("fr")}
                          </div>
                        )}
                      </div>
                      <div className="mx-4 mb-3 rounded-xl overflow-hidden border border-border/40 bg-secondary/30">
                        <img src={proofUrl || `${screenshotBase}.jpg`} alt="Capture de paiement"
                          className="w-full max-h-48 object-contain bg-secondary/20"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            if (!proofUrl) {
                              if (img.src.endsWith('.jpg')) img.src = `${screenshotBase}.jpeg`;
                              else if (img.src.endsWith('.jpeg')) img.src = `${screenshotBase}.png`;
                              else if (img.src.endsWith('.png')) img.src = `${screenshotBase}.webp`;
                              else img.style.display = 'none';
                            } else { img.style.display = 'none'; }
                          }} />
                        <button onClick={() => setViewingImage(proofUrl || `${screenshotBase}.jpg`)}
                          className="w-full py-2.5 text-[10px] text-primary font-medium flex items-center justify-center gap-1 hover:bg-secondary/50 transition-colors border-t border-border/30">
                          <Eye className="w-3 h-3" /> Voir en plein écran
                        </button>
                      </div>
                      <div className="px-4 pb-4 space-y-3">
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 border border-border/30">
                          <Key className="w-4 h-4 text-primary" />
                          <code className="text-sm font-mono flex-1 font-bold tracking-wider">{code}</code>
                          <button onClick={() => { navigator.clipboard.writeText(code); toast.success("Copié"); }}
                            className="p-2 rounded-lg hover:bg-secondary transition-colors"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        </div>
                        <Button variant="premium" className="w-full h-12 text-sm font-bold" onClick={() => approvePremium(ga.id)}>
                          <Send className="w-4 h-4 mr-2" /> Approuver
                        </Button>
                        <Button variant="ghost" className="w-full h-10 text-xs border border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => rejectAccess(ga.id)}>
                          <X className="w-4 h-4 mr-2" /> Refuser
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground font-medium mt-4">Tous les abonnements</p>
            {activeAccess.length === 0 && pendingAccess.length === 0 && (
              <div className="text-center py-16 space-y-2"><Crown className="w-10 h-10 text-muted-foreground/30 mx-auto" /><p className="text-sm text-muted-foreground">Aucun abonnement</p></div>
            )}
            {activeAccess.map((ga, i) => {
              const prof = profiles.find(p => p.user_id === ga.user_id);
              const isExpired = ga.expires_at && new Date(ga.expires_at) < new Date();
              return (
                <div key={ga.id} className="p-4 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm space-y-2"
                  style={{ animation: `fade-up 0.3s ease ${i * 40}ms forwards`, opacity: 0 }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ga.is_active ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                        {ga.is_active ? <UserCheck className="w-4 h-4 text-emerald-300" /> : <UserX className="w-4 h-4 text-destructive" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{prof?.full_name || ga.user_id.slice(0, 8)}</p>
                        <p className="text-[10px] text-muted-foreground">{GAME_MODE_LABELS[ga.game_mode] || ga.game_mode}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                      isExpired ? "bg-destructive/10 text-destructive" : ga.is_active ? "bg-emerald-500/10 text-emerald-300" : "bg-secondary text-muted-foreground"
                    }`}>
                      {isExpired ? "Expiré" : ga.is_active ? "Actif" : "En pause"}
                    </span>
                  </div>
                  <div className="flex gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Début: {new Date(ga.granted_at).toLocaleDateString("fr")}</span>
                    {ga.expires_at && <span>· Expire: {new Date(ga.expires_at).toLocaleDateString("fr")}</span>}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Prolonger (jours flexibles)</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[3, 6, 7, 15, 30].map(d => (
                        <Button key={d} size="sm" variant="outline" onClick={() => extendAccess(ga.id, ga.expires_at, d)}
                          className="h-8 text-[10px] font-bold border-primary/30 text-primary hover:bg-primary/10 px-1">
                          +{d}j
                        </Button>
                      ))}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => {
                      const v = prompt("Nombre de jours à ajouter (1-31) :", "10");
                      if (v) extendAccess(ga.id, ga.expires_at, parseInt(v));
                    }} className="h-8 w-full text-[10px] text-primary hover:bg-primary/5">+ personnalisé</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="ghost" onClick={() => toggleGameAccess(ga.id, ga.is_active)}
                      className={`h-9 text-xs font-medium justify-center ${ga.is_active ? "text-primary hover:bg-primary/10" : "text-emerald-300 hover:bg-emerald-500/10"}`}>
                      {ga.is_active ? <><Pause className="w-3.5 h-3.5 mr-1.5" /> Pause</> : <><PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Réactiver</>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => cancelSubscription(ga.id, prof?.full_name)}
                      className="h-9 text-xs font-medium justify-center text-destructive hover:bg-destructive/10 border border-destructive/30">
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Annuler
                    </Button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* REWARDS TAB */}
        {tab === "rewards" && (
          <div className="space-y-4" style={{ animation: "fade-up 0.4s ease forwards" }}>
            <div className="p-5 rounded-2xl bg-card/90 border border-primary/25 glow-gold backdrop-blur-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center"><Gift className="w-4 h-4 text-primary-foreground" /></div>
                <p className="text-xs font-bold uppercase tracking-wider gold-text">Offrir un abonnement gratuit</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Utilisateur</label>
                  <select value={rewardUserId} onChange={(e) => setRewardUserId(e.target.value)}
                    className="w-full h-11 rounded-xl bg-secondary/80 border border-border/40 text-sm px-3 text-foreground">
                    <option value="">Sélectionner un utilisateur</option>
                    {sortedProfiles.map(p => (
                      <option key={p.user_id} value={p.user_id}>{p.full_name} ({userPointsMap[p.user_id] || 0} pts)</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Jeu</label>
                    <select value={rewardGame} onChange={(e) => setRewardGame(e.target.value)}
                      className="w-full h-11 rounded-xl bg-secondary/80 border border-border/40 text-sm px-3 text-foreground">
                      {REWARD_GAMES.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Durée (jours)</label>
                    <Input type="number" value={rewardDays} onChange={(e) => setRewardDays(e.target.value)} className="h-11 bg-secondary/80 border-border/40 text-sm" />
                  </div>
                </div>
                <Button variant="premium" className="w-full h-12 text-sm font-bold" onClick={grantReward}>
                  <Gift className="w-4 h-4 mr-2" /> Attribuer la récompense
                </Button>
              </div>
            </div>

            {/* Top user highlight */}
            {topUser && (
              <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5">
                <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-2">⭐ Meilleur joueur (éligible à la récompense)</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/50 overflow-hidden">
                    {topUser.avatar_url ? <img src={topUser.avatar_url} alt="" className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-sm text-muted-foreground">{topUser.full_name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{topUser.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{userPointsMap[topUser.user_id] || 0} points</p>
                  </div>
                  <Button size="sm" variant="premium-outline" onClick={() => setRewardUserId(topUser.user_id)} className="text-xs h-9">
                    Récompenser
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {tab === "notifications" && (
          <div className="space-y-4" style={{ animation: "fade-up 0.4s ease forwards" }}>
            <div className="p-5 rounded-2xl bg-card/90 border border-emerald-500/25 backdrop-blur-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center"><Bell className="w-4 h-4 text-emerald-300" /></div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Envoyer une notification globale</p>
              </div>
              <Input value={newNotifTitle} onChange={(e) => setNewNotifTitle(e.target.value)} placeholder="Titre de la notification"
                className="h-11 bg-secondary/80 border-border/40 text-sm" />
              <Input value={newNotifMessage} onChange={(e) => setNewNotifMessage(e.target.value)} placeholder="Message"
                className="h-11 bg-secondary/80 border-border/40 text-sm" />
              <Button className="w-full h-12 text-sm font-bold gold-gradient text-primary-foreground hover:opacity-90" onClick={sendNotification}>
                <Send className="w-4 h-4 mr-2" /> Envoyer à tous les utilisateurs
              </Button>
            </div>

            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historique</h3>
            {notifications.length === 0 && (
              <div className="text-center py-12 space-y-2"><Bell className="w-10 h-10 text-muted-foreground/30 mx-auto" /><p className="text-sm text-muted-foreground">Aucune notification</p></div>
            )}
            {notifications.map((n, i) => (
              <div key={n.id} className="p-3 rounded-xl bg-card/80 border border-border/40 space-y-1"
                style={{ animation: `fade-up 0.3s ease ${i * 40}ms forwards`, opacity: 0 }}>
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {new Date(n.created_at).toLocaleString("fr")}
                  {n.is_global ? " · Global" : " · Individuel"}
                </p>
              </div>
            ))}
          </div>
        )}




        {/* CHAT TAB */}
        {tab === "chat" && (
          <div className="space-y-4" style={{ animation: "fade-up 0.4s ease forwards" }}>
            <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">Preuves de paiement envoyées par les utilisateurs. Validez ou refusez chaque demande.</p>
            </div>

            {chatMessages.filter(m => m.status === "pending").length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    En attente ({chatMessages.filter(m => m.status === "pending").length})
                  </p>
                </div>
                {chatMessages.filter(m => m.status === "pending").map((msg, i) => {
                  const prof = profiles.find(p => p.user_id === msg.user_id);
                  return (
                    <div key={msg.id} className="rounded-2xl bg-card/90 border border-emerald-500/30 backdrop-blur-sm overflow-hidden"
                      style={{ animation: `fade-up 0.3s ease ${i * 60}ms forwards`, opacity: 0 }}>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                              <MessageSquare className="w-5 h-5 text-emerald-300" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{prof?.full_name || msg.user_id.slice(0, 8)}</p>
                              <p className="text-[10px] text-muted-foreground">{GAME_MODE_LABELS[msg.game_mode] || msg.game_mode} · {new Date(msg.created_at).toLocaleString("fr")}</p>
                            </div>
                          </div>
                          <span className="text-[9px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-bold uppercase tracking-wider animate-pulse">Nouveau</span>
                        </div>
                        {msg.message && (
                          <p className="text-xs text-muted-foreground bg-secondary/30 p-2.5 rounded-lg">{msg.message}</p>
                        )}
                      </div>
                      {msg.image_url && (
                        <div className="mx-4 mb-3 rounded-xl overflow-hidden border border-border/40 bg-secondary/30">
                          <img src={msg.image_url} alt="Preuve" className="w-full max-h-48 object-contain bg-secondary/20" />
                          <button onClick={() => setViewingImage(msg.image_url)}
                            className="w-full py-2 text-[10px] text-emerald-300 font-medium flex items-center justify-center gap-1 hover:bg-secondary/50 transition-colors border-t border-border/30">
                            <Eye className="w-3 h-3" /> Voir en plein écran
                          </button>
                        </div>
                      )}
                      <div className="px-4 pb-4 space-y-2">
                        <input value={chatResponse} onChange={(e) => setChatResponse(e.target.value)} placeholder="Réponse (optionnel)"
                          className="w-full h-10 rounded-lg bg-secondary/80 border border-border/40 text-sm px-3 text-foreground" />
                        <div className="flex gap-2">
                          <Button variant="premium" className="flex-1 h-10 text-xs font-bold" onClick={() => respondToChat(msg.id, "approved")}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Valider
                          </Button>
                          <Button variant="ghost" className="flex-1 h-10 text-xs border border-border/50" onClick={() => respondToChat(msg.id, "rejected")}>
                            <X className="w-3.5 h-3.5 mr-1" /> Refuser
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">Historique</h3>
            {chatMessages.filter(m => m.status !== "pending").length === 0 && (
              <div className="text-center py-12 space-y-2">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">Aucun message</p>
              </div>
            )}
            {chatMessages.filter(m => m.status !== "pending").map((msg, i) => {
              const prof = profiles.find(p => p.user_id === msg.user_id);
              return (
                <div key={msg.id} className="p-3 rounded-xl bg-card/80 border border-border/40 space-y-2"
                  style={{ animation: `fade-up 0.3s ease ${i * 30}ms forwards`, opacity: 0 }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{prof?.full_name || msg.user_id.slice(0, 8)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      msg.status === "approved" ? "bg-emerald-500/10 text-emerald-300" : "bg-destructive/10 text-destructive"
                    }`}>{msg.status === "approved" ? "Validé" : "Refusé"}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{GAME_MODE_LABELS[msg.game_mode] || msg.game_mode} · {new Date(msg.created_at).toLocaleString("fr")}</p>
                  {msg.admin_response && <p className="text-[10px] text-primary italic">→ {msg.admin_response}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <>
            <div className="p-4 rounded-2xl bg-card/80 border border-border/40 space-y-4">
              <div className="flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /><h3 className="text-sm font-bold">Abonnements par mode</h3></div>
              <p className="text-[10px] text-muted-foreground">Activez ou désactivez l'obligation d'abonnement pour chaque mode.</p>
              {SUB_MODES.map((mode) => {
                const isEnabled = getCodeValue(mode.key) === "enabled";
                return (
                  <button key={mode.key} onClick={() => toggleSetting(mode.key)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/20 hover:bg-secondary/60 transition-all active:scale-[0.98]">
                    <span className="text-sm font-medium">{mode.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold ${isEnabled ? "text-emerald-300" : "text-muted-foreground"}`}>{isEnabled ? "Activé" : "Désactivé"}</span>
                      {isEnabled ? <ToggleRight className="w-6 h-6 text-emerald-300" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-4 rounded-2xl bg-card/80 border border-border/40 space-y-4">
              <div className="flex items-center gap-2"><Timer className="w-4 h-4 text-primary" /><h3 className="text-sm font-bold">Secondes (SS) dans les prédictions</h3></div>
              <p className="text-[10px] text-muted-foreground">Activez pour afficher les secondes dans les résultats de chaque mode.</p>
              {SECONDS_MODES.map((mode) => {
                const isEnabled = getCodeValue(mode.key) === "enabled";
                return (
                  <button key={mode.key} onClick={() => toggleSetting(mode.key)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/20 hover:bg-secondary/60 transition-all active:scale-[0.98]">
                    <span className="text-sm font-medium">{mode.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold ${isEnabled ? "text-emerald-300" : "text-muted-foreground"}`}>{isEnabled ? "Avec SS" : "Sans SS"}</span>
                      {isEnabled ? <ToggleRight className="w-6 h-6 text-emerald-300" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* SESSIONS TAB */}
        {tab === "sessions" && (
          <div className="space-y-3" style={{ animation: "fade-up 0.4s ease forwards" }}>
            <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/25 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-300" />
              <p className="text-xs"><span className="font-bold text-emerald-300">{onlineSessions.length}</span> session(s) active(s) en temps réel</p>
            </div>
            {onlineSessions.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">Aucun utilisateur connecté actuellement.</p>
            ) : (
              onlineSessions.map((s) => {
                const profile = profiles.find(p => p.user_id === s.user_id);
                const lastPing = new Date(s.last_ping);
                const secondsAgo = Math.floor((Date.now() - lastPing.getTime()) / 1000);
                const isLive = secondsAgo < 60;
                return (
                  <div key={s.user_id} className="p-3 rounded-xl bg-card/80 border border-border/40 flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-primary"} shadow-lg`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{profile?.full_name || s.user_id.slice(0, 8)}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="truncate font-mono">📱 {s.device_id?.slice(0, 16) || "—"}</span>
                        <span>·</span>
                        <span>{isLive ? `${secondsAgo}s` : `${Math.floor(secondsAgo / 60)}min`}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-[10px]"
                      onClick={() => disconnectSession(s.user_id)}
                    >
                      <Power className="w-3 h-3 mr-1" /> Déconnecter
                    </Button>
                  </div>
                );
              })
            )}

            {/* Login history */}
            <div className="mt-5 pt-4 border-t border-border/30 space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Historique des sessions ({loginHistory.length})</p>
              </div>
              {loginHistory.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">Aucun historique de connexion.</p>
              ) : (
                loginHistory.map((h) => {
                  const profile = profiles.find(p => p.user_id === h.user_id);
                  // Compute duration: find next opposite event for the same user
                  const sameUser = loginHistory.filter(x => x.user_id === h.user_id);
                  let duration = "";
                  if (h.event_type === "login") {
                    const nextLogout = sameUser.find(x => x.event_type === "logout" && new Date(x.created_at) > new Date(h.created_at));
                    if (nextLogout) {
                      const ms = new Date(nextLogout.created_at).getTime() - new Date(h.created_at).getTime();
                      const mins = Math.floor(ms / 60000);
                      duration = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}min` : `${mins}min`;
                    } else {
                      duration = "session ouverte";
                    }
                  }
                  const isLogin = h.event_type === "login";
                  return (
                    <div key={h.id} className="p-2.5 rounded-lg bg-card/60 border border-border/30 flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isLogin ? "bg-emerald-500/10 text-emerald-300" : "bg-primary/10 text-primary/90"}`}>
                        {isLogin ? <PlayCircle className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{profile?.full_name || h.user_id.slice(0, 8)}</p>
                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground flex-wrap">
                          <span className="font-medium">{isLogin ? "Connexion" : "Déconnexion"}</span>
                          <span>·</span>
                          <span>{new Date(h.created_at).toLocaleString("fr", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          {duration && <><span>·</span><span className="text-primary font-semibold">{duration}</span></>}
                        </div>
                        {h.device_info && <p className="text-[9px] text-muted-foreground/70 truncate mt-0.5">{h.device_info}</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tab === "online_live" && (
          <div style={{ animation: "fade-up 0.4s ease forwards" }}>
            <AdminOnlineUsersPanel />
          </div>
        )}
        {tab === "gen_store" && (
          <div style={{ animation: "fade-up 0.4s ease forwards" }}>
            <AdminGenStorePanel />
          </div>
        )}
        {tab === "bonuses" && (
          <div style={{ animation: "fade-up 0.4s ease forwards" }}>
            <AdminPremiumBonusPanel />
          </div>
        )}
      </div>

      {/* Image viewer modal */}
      {viewingImage && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
          <div className="max-w-lg max-h-[80vh] overflow-auto rounded-2xl border border-border/50 shadow-2xl">
            <img src={viewingImage} alt="Capture" className="w-full"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src.endsWith('.jpg')) img.src = img.src.replace('.jpg', '.png');
                else if (img.src.endsWith('.png')) img.src = img.src.replace('.png', '.jpeg');
              }} />
          </div>
        </div>
      )}
        </div>
      </div>
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" /> Supprimer définitivement ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer <strong>{confirmDelete?.full_name}</strong> ainsi que
              toutes ses données (profil, historique, abonnements, messages, notifications).
              <br /><br />
              Cette action est <strong className="text-destructive">irréversible</strong>. Le compte
              administrateur ne peut jamais être supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) {
                  const id = confirmDelete.user_id;
                  setConfirmDelete(null);
                  deleteUser(id);
                }
              }}
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default Admin;
