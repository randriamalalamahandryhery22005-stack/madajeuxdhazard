import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GameStats {
  game_name: string;
  total_uses: number;
  online_users: number;
}

export interface UserPointsSummary {
  user_id: string;
  full_name: string;
  total_points: number;
  avatar_url: string | null;
}

export function useGameStats() {
  const { user } = useAuth();
  const [gameStats, setGameStats] = useState<GameStats[]>([]);
  const [topUsers, setTopUsers] = useState<UserPointsSummary[]>([]);
  const [myPoints, setMyPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    // Fetch game usage counts
    const { data: usageData } = await supabase
      .from("game_usage")
      .select("game_name");

    const counts: Record<string, number> = {};
    usageData?.forEach((row: any) => {
      counts[row.game_name] = (counts[row.game_name] || 0) + 1;
    });

    // Estimate "online" - users active in the last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentData } = await supabase
      .from("game_usage")
      .select("game_name, user_id")
      .gte("used_at", tenMinAgo);

    const onlineCounts: Record<string, Set<string>> = {};
    recentData?.forEach((row: any) => {
      if (!onlineCounts[row.game_name]) onlineCounts[row.game_name] = new Set();
      onlineCounts[row.game_name].add(row.user_id);
    });

    const gameNames = ["aviator", "cosmox", "jetx", "aviator-premium", "aviator-studio", "aviator-spribe", "penalty-shootout"];
    const stats = gameNames.map(name => ({
      game_name: name,
      total_uses: counts[name] || 0,
      online_users: onlineCounts[name]?.size || 0,
    }));

    stats.sort((a, b) => b.total_uses - a.total_uses);
    setGameStats(stats);

    // Fetch my points
    if (user) {
      const { data: myPts } = await supabase
        .from("user_points")
        .select("points")
        .eq("user_id", user.id);
      setMyPoints(myPts?.reduce((sum: number, r: any) => sum + r.points, 0) || 0);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStats();

    // Realtime subscriptions
    const ch = supabase
      .channel("game-stats-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_usage" }, () => fetchStats())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_points" }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [fetchStats]);

  const trackGameUsage = useCallback(async (gameName: string, gameMode?: string) => {
    if (!user) return;
    await supabase.from("game_usage").insert({ user_id: user.id, game_name: gameName, game_mode: gameMode });
    // Award points for usage
    await supabase.from("user_points").insert({ user_id: user.id, points: 5, reason: "game_usage", game_name: gameName });
  }, [user]);

  const getMostPopular = useCallback(() => {
    if (gameStats.length === 0) return null;
    return gameStats[0].total_uses > 0 ? gameStats[0].game_name : null;
  }, [gameStats]);

  return { gameStats, topUsers, myPoints, loading, trackGameUsage, getMostPopular, refreshStats: fetchStats };
}
