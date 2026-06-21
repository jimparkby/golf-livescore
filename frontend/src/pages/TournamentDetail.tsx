import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, TrendingUp, Users, Award, Calendar, MapPin, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tournament {
  id: string;
  name: string;
  description?: string;
  course_name?: string;
  start_date: string;
  end_date?: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
  tier: string;
  format?: string;
  holes_count: number;
  entry_fee?: number;
  settings?: {
    photos?: string[];
    original_date_display?: string;
    original_day_display?: string;
  };
}

interface Participant {
  id: string;
  position?: number;
  total_score?: number;
  handicap_index?: number;
  status: string;
  flight_number?: number;
  user_id: string;
  player_name: string;
  avatar_url?: string;
}

interface Prediction {
  player_id: string;
  name: string;
  win_probability: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  key_factors: string[];
  has_historical_data: boolean;
}

interface PlayerStats {
  player_name: string;
  tournaments_played: number;
  tournaments_won: number;
  top3_finishes: number;
  current_handicap?: number;
  best_handicap?: number;
  avatar_url?: string;
}

interface Leaderboards {
  byHandicap: PlayerStats[];
  byWins: PlayerStats[];
}

async function fetchTournament(id: string): Promise<Tournament> {
  const response = await fetch(`/api/tournaments/${id}`);
  if (!response.ok) throw new Error("Failed to fetch tournament");
  return response.json();
}

async function fetchLeaderboard(id: string): Promise<Participant[]> {
  const response = await fetch(`/api/tournaments/${id}/leaderboard`);
  if (!response.ok) throw new Error("Failed to fetch leaderboard");
  return response.json();
}

async function fetchPredictions(id: string): Promise<Prediction[]> {
  const response = await fetch(`/api/predictions/tournament/${id}/win-probability`);
  if (!response.ok) throw new Error("Failed to fetch predictions");
  return response.json();
}

async function fetchTopPlayers(): Promise<Leaderboards> {
  const response = await fetch("/api/predictions/leaderboards");
  if (!response.ok) throw new Error("Failed to fetch leaderboards");
  return response.json();
}

const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Set default tab based on tournament status
  const getDefaultTab = () => {
    if (!tournament) return "leaderboard";
    if (tournament.status === "completed" && tournament.settings?.photos && tournament.settings.photos.length > 0) {
      return "results";
    }
    return "leaderboard";
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ["tournament", id],
    queryFn: () => fetchTournament(id!),
    enabled: !!id,
  });

  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ["leaderboard", id],
    queryFn: () => fetchLeaderboard(id!),
    enabled: !!id,
    refetchInterval: tournament?.status === "active" ? 30000 : false,
  });

  const { data: predictions = [], isLoading: predictionsLoading } = useQuery({
    queryKey: ["predictions", id],
    queryFn: () => fetchPredictions(id!),
    enabled: !!id && (tournament?.status === "active" || tournament?.status === "upcoming"),
  });

  const { data: topPlayers } = useQuery({
    queryKey: ["topPlayers"],
    queryFn: fetchTopPlayers,
  });

  if (tournamentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Загрузка турнира...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Турнир не найден</p>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    upcoming: "bg-blue-500",
    active: "bg-green-500",
    completed: "bg-gray-500",
    cancelled: "bg-red-500",
  };

  const statusLabel: Record<string, string> = {
    upcoming: "Предстоящий",
    active: "Идёт сейчас",
    completed: "Завершён",
    cancelled: "Отменён",
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/tournaments")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к турнирам
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("h-2.5 w-2.5 rounded-full", statusColor[tournament.status])} />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {statusLabel[tournament.status]}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {tournament.course_name && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {tournament.course_name}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(tournament.start_date)}
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {leaderboard.length} участников
              </div>
            </div>
          </div>
          {tournament.status === "active" && (
            <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                LIVE
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn(
          "grid w-full",
          tournament.status === "completed" && tournament.settings?.photos && tournament.settings.photos.length > 0
            ? "grid-cols-3"
            : tournament.status === "active" || tournament.status === "upcoming"
            ? "grid-cols-3"
            : "grid-cols-2"
        )}>
          {tournament.status === "completed" && tournament.settings?.photos && tournament.settings.photos.length > 0 && (
            <TabsTrigger value="results">
              <ImageIcon className="h-4 w-4 mr-2" />
              Результаты
            </TabsTrigger>
          )}
          <TabsTrigger value="leaderboard">
            <Trophy className="h-4 w-4 mr-2" />
            Таблица
          </TabsTrigger>
          {(tournament.status === "active" || tournament.status === "upcoming") && (
            <TabsTrigger value="predictions">
              <TrendingUp className="h-4 w-4 mr-2" />
              Прогнозы AI
            </TabsTrigger>
          )}
          <TabsTrigger value="top-players">
            <Award className="h-4 w-4 mr-2" />
            Лучшие игроки
          </TabsTrigger>
        </TabsList>

        {/* Results Tab (Photos) */}
        {tournament.status === "completed" && tournament.settings?.photos && tournament.settings.photos.length > 0 && (
          <TabsContent value="results" className="space-y-3">
            <Card className="p-4">
              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border">
                <ImageIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Фотографии результатов</h3>
                  <p className="text-xs text-muted-foreground">
                    {tournament.settings.photos.length} фото с результатами турнира
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {tournament.settings.photos.map((photo, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Фото {idx + 1} из {tournament.settings!.photos!.length}
                    </div>
                    <div className="relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={`/api/tournaments/${tournament.id}/photo/${encodeURIComponent(photo)}`}
                        alt={`Результаты ${idx + 1}`}
                        className="w-full h-auto"
                        onError={(e) => {
                          // Fallback: show filename if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="p-8 text-center">
                                <div class="text-sm text-muted-foreground">${photo}</div>
                                <div class="text-xs text-muted-foreground mt-2">
                                  Изображение временно недоступно
                                </div>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border text-[11px] text-muted-foreground">
                📸 Результаты загружены администратором турнира
              </div>
            </Card>
          </TabsContent>
        )}

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-3">
          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                {tournament.status === "completed" ? "Итоговые результаты" : "Таблица лидеров"}
              </div>
            </div>
            {leaderboardLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Загрузка результатов...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Участники ещё не зарегистрированы
              </div>
            ) : (
              <div className="divide-y divide-border">
                {leaderboard.map((p, idx) => (
                  <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 text-center">
                      {p.position ? (
                        <div
                          className={cn(
                            "font-bold text-lg",
                            p.position === 1 && "text-yellow-600 dark:text-yellow-500",
                            p.position === 2 && "text-gray-500 dark:text-gray-400",
                            p.position === 3 && "text-orange-600 dark:text-orange-500"
                          )}
                        >
                          {p.position}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">—</div>
                      )}
                    </div>
                    <div className="h-10 w-10 rounded-full bg-muted overflow-hidden shrink-0">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.player_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs font-semibold">
                          {p.player_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{p.player_name}</div>
                      <div className="text-xs text-muted-foreground">
                        HCP: {p.handicap_index?.toFixed(1) || "N/A"}
                        {p.flight_number && ` · Флайт ${p.flight_number}`}
                      </div>
                    </div>
                    <div className="text-right">
                      {p.total_score !== null && p.total_score !== undefined ? (
                        <div className="font-bold text-lg tabular-nums">{p.total_score}</div>
                      ) : (
                        <div className="text-muted-foreground text-sm">—</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Predictions Tab */}
        {(tournament.status === "active" || tournament.status === "upcoming") && (
          <TabsContent value="predictions" className="space-y-3">
            <Card className="p-4">
              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border">
                <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">AI-прогнозы на победу</h3>
                  <p className="text-xs text-muted-foreground">
                    Основаны на текущем handicap, истории турниров и недавних результатах
                  </p>
                </div>
              </div>

              {predictionsLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  AI анализирует данные игроков...
                </div>
              ) : predictions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Недостаточно данных для прогнозов
                </div>
              ) : (
                <div className="space-y-3">
                  {predictions
                    .sort((a, b) => b.win_probability - a.win_probability)
                    .map((pred) => (
                      <div key={pred.player_id} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-semibold text-sm mb-0.5">{pred.name}</div>
                            <div className="text-xs text-muted-foreground">{pred.reasoning}</div>
                          </div>
                          <div className="text-right ml-3">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                              {(pred.win_probability * 100).toFixed(1)}%
                            </div>
                            <div className={cn(
                              "text-[10px] uppercase tracking-wider font-semibold mt-0.5",
                              pred.confidence === "high" && "text-green-600 dark:text-green-400",
                              pred.confidence === "medium" && "text-yellow-600 dark:text-yellow-400",
                              pred.confidence === "low" && "text-gray-500 dark:text-gray-400"
                            )}>
                              {pred.confidence === "high" && "Высокая"}
                              {pred.confidence === "medium" && "Средняя"}
                              {pred.confidence === "low" && "Низкая"}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {pred.key_factors.map((factor, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-[10px] bg-background border border-border rounded"
                            >
                              {factor}
                            </span>
                          ))}
                          {!pred.has_historical_data && (
                            <span className="px-2 py-0.5 text-[10px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded">
                              Мало данных
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border text-[11px] text-muted-foreground">
                ℹ️ Прогнозы обновляются автоматически на основе текущих результатов турнира
              </div>
            </Card>
          </TabsContent>
        )}

        {/* Top Players Tab */}
        <TabsContent value="top-players" className="space-y-4">
          {/* Top by Handicap */}
          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Лучшие по Handicap Index
              </div>
            </div>
            <div className="divide-y divide-border">
              {topPlayers?.byHandicap.slice(0, 10).map((player, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 text-center font-bold text-sm text-muted-foreground">
                    {idx + 1}
                  </div>
                  <div className="h-8 w-8 rounded-full bg-muted overflow-hidden shrink-0">
                    {player.avatar_url ? (
                      <img src={player.avatar_url} alt={player.player_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-semibold">
                        {player.player_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{player.player_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {player.tournaments_played} турниров · {player.tournaments_won} побед
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg tabular-nums text-green-600 dark:text-green-400">
                      {player.current_handicap?.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top by Wins */}
          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Лучшие по победам в турнирах
              </div>
            </div>
            <div className="divide-y divide-border">
              {topPlayers?.byWins.slice(0, 10).map((player, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 text-center">
                    {idx < 3 ? (
                      <Trophy
                        className={cn(
                          "h-5 w-5 mx-auto",
                          idx === 0 && "text-yellow-600 dark:text-yellow-500",
                          idx === 1 && "text-gray-500 dark:text-gray-400",
                          idx === 2 && "text-orange-600 dark:text-orange-500"
                        )}
                      />
                    ) : (
                      <div className="font-bold text-sm text-muted-foreground">{idx + 1}</div>
                    )}
                  </div>
                  <div className="h-8 w-8 rounded-full bg-muted overflow-hidden shrink-0">
                    {player.avatar_url ? (
                      <img src={player.avatar_url} alt={player.player_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-semibold">
                        {player.player_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{player.player_name}</div>
                    <div className="text-xs text-muted-foreground">
                      HCP: {player.current_handicap?.toFixed(1) || "N/A"} · ТОП-3: {player.top3_finishes}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-2xl tabular-nums text-yellow-600 dark:text-yellow-500">
                      {player.tournaments_won}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      побед
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TournamentDetail;
