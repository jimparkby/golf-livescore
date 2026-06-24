import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, TrendingUp } from "lucide-react";

type LeaderboardPlayer = {
  player_name: string;
  first_places: number;
  total_tournaments: number;
  win_rate: number;
  top3_finishes: number;
  estimated_hcp: number;
};

type LeaderboardData = {
  topByWins: LeaderboardPlayer[];
  topByHcp: LeaderboardPlayer[];
};

const Leaderboard = () => {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    // Auto-refresh every 30 seconds to get new results
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch("/api/statistics/leaderboards");
      if (response.ok) {
        const leaderboards = await response.json();
        setData(leaderboards);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 shadow-soft">
        <div className="text-sm text-muted-foreground text-center">Loading leaderboard...</div>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card className="overflow-hidden shadow-soft">
      <div className="px-4 py-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-action" />
          <div className="text-sm font-bold text-foreground">Leaderboards</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Top by Wins */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="h-3.5 w-3.5 text-warning" />
            <div className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Top by Wins</div>
          </div>
          <div className="space-y-1">
            {data.topByWins.slice(0, 5).map((player, i) => (
              <div key={player.player_name} className="flex items-center gap-2 text-xs">
                <div className="w-5 text-muted-foreground font-semibold text-right">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </div>
                <div className="flex-1 font-medium text-foreground truncate">{player.player_name}</div>
                <div className="text-muted-foreground">
                  <span className="font-bold text-action">{player.first_places}</span> wins
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top by HCP */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-action" />
            <div className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Top by HCP</div>
          </div>
          <div className="space-y-1">
            {data.topByHcp.slice(0, 5).map((player, i) => (
              <div key={player.player_name} className="flex items-center gap-2 text-xs">
                <div className="w-5 text-muted-foreground font-semibold text-right">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </div>
                <div className="flex-1 font-medium text-foreground truncate">{player.player_name}</div>
                <div className="text-muted-foreground">
                  <span className="font-bold text-action">{player.estimated_hcp}</span> HCP
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Leaderboard;
