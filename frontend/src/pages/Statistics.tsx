import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Target, TrendingUp } from "lucide-react";

type PlayerStats = {
  player_name: string;
  total_tournaments: number;
  first_places: number;
  second_places: number;
  third_places: number;
  top3_finishes: number;
  win_rate?: number;
  estimated_hcp?: number;
  best_net?: number;
};

type OverallStats = {
  total_players: number;
  total_tournaments: number;
  total_results: number;
  total_nominations: number;
};

type RecentWinner = {
  tournament_name: string;
  tournament_date: string;
  player_name: string;
  group_name: string;
};

const StatisticsPage = () => {
  const [topByWins, setTopByWins] = useState<PlayerStats[]>([]);
  const [topByHcp, setTopByHcp] = useState<PlayerStats[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"wins" | "hcp" | "recent">("wins");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leaderboardsRes, overallRes] = await Promise.all([
          fetch("/api/statistics/leaderboards"),
          fetch("/api/statistics/overall"),
        ]);

        if (leaderboardsRes.ok) {
          const data = await leaderboardsRes.json();
          setTopByWins(data.topByWins || []);
          setTopByHcp(data.topByHcp || []);
        }

        if (overallRes.ok) {
          const data = await overallRes.json();
          setOverallStats(data.stats);
          setRecentWinners(data.recentWinners || []);
        }
      } catch (error) {
        console.error("Error fetching statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">Загрузка статистики...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">
          Statistics
        </div>
        <h1 className="text-3xl font-bold mt-1">Общие результаты</h1>
        {overallStats && (
          <p className="text-sm text-muted-foreground mt-1">
            {overallStats.total_players} игроков · {overallStats.total_tournaments} турниров · {overallStats.total_nominations} номинаций
          </p>
        )}
      </div>

      {/* Overall Stats Cards */}
      {overallStats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-action/10 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-action" />
              </div>
              <div>
                <div className="text-2xl font-bold">{overallStats.total_tournaments}</div>
                <div className="text-xs text-muted-foreground">Турниров проведено</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-action/10 flex items-center justify-center shrink-0">
                <Target className="h-5 w-5 text-action" />
              </div>
              <div>
                <div className="text-2xl font-bold">{overallStats.total_players}</div>
                <div className="text-xs text-muted-foreground">Участников</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("wins")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "wins"
              ? "text-action border-action"
              : "text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          🏆 По победам
        </button>
        <button
          onClick={() => setActiveTab("hcp")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "hcp"
              ? "text-action border-action"
              : "text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          🎯 По HCP
        </button>
        <button
          onClick={() => setActiveTab("recent")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "recent"
              ? "text-action border-action"
              : "text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          ⏱️ Недавние победы
        </button>
      </div>

      {/* Top by Wins */}
      {activeTab === "wins" && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-action" />
              <h2 className="font-bold text-sm uppercase tracking-wider">Топ по победам</h2>
            </div>
          </div>
          <div className="divide-y divide-border">
            {topByWins.slice(0, 20).map((player, index) => (
              <div key={index} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 shrink-0 text-center">
                  {index === 0 && <span className="text-xl">🥇</span>}
                  {index === 1 && <span className="text-xl">🥈</span>}
                  {index === 2 && <span className="text-xl">🥉</span>}
                  {index > 2 && (
                    <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{player.player_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {player.total_tournaments} турниров · Top-3: {player.top3_finishes}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-action">{player.first_places}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {player.win_rate ? `${player.win_rate.toFixed(0)}%` : "побед"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top by HCP */}
      {activeTab === "hcp" && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-action" />
              <h2 className="font-bold text-sm uppercase tracking-wider">Топ по HCP</h2>
            </div>
          </div>
          <div className="divide-y divide-border">
            {topByHcp.slice(0, 20).map((player, index) => (
              <div key={index} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 shrink-0 text-center">
                  {index === 0 && <span className="text-xl">🥇</span>}
                  {index === 1 && <span className="text-xl">🥈</span>}
                  {index === 2 && <span className="text-xl">🥉</span>}
                  {index > 2 && (
                    <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{player.player_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {player.total_tournaments} турниров · Top-3: {player.top3_finishes}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-action">
                    {player.estimated_hcp?.toFixed(1) || "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">HCP</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Winners */}
      {activeTab === "recent" && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-action" />
              <h2 className="font-bold text-sm uppercase tracking-wider">Недавние победы</h2>
            </div>
          </div>
          <div className="divide-y divide-border">
            {recentWinners.map((winner, index) => (
              <div key={index} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{winner.player_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {winner.tournament_name}
                    </div>
                    {winner.group_name && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {winner.group_name}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium">
                      {new Date(winner.tournament_date).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(winner.tournament_date).getFullYear()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default StatisticsPage;
