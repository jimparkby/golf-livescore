import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, Trophy, Calendar, MapPin } from "lucide-react";

type Tier = "gold" | "platinum" | "diamond" | "closed";

interface Tournament {
  id: string;
  name: string;
  description?: string;
  course_name?: string;
  start_date: string;
  end_date?: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
  tier: Tier;
  format?: string;
  holes_count: number;
  entry_fee?: number;
  max_participants?: number;
  registration_deadline?: string;
}

const tierColor: Record<Tier, string> = {
  gold: "bg-tier-gold",
  platinum: "bg-tier-platinum",
  diamond: "bg-tier-diamond",
  closed: "bg-tier-closed",
};

const TIER_LABELS: Record<Tier, string> = {
  gold: "Золотой",
  platinum: "Платиновый",
  diamond: "Бриллиантовый",
  closed: "Закрытый турнир",
};

const statusColor: Record<string, string> = {
  upcoming: "text-blue-600 dark:text-blue-400",
  active: "text-green-600 dark:text-green-400",
  completed: "text-gray-500 dark:text-gray-400",
  cancelled: "text-red-600 dark:text-red-400",
};

const statusLabel: Record<string, string> = {
  upcoming: "Предстоящий",
  active: "Идёт сейчас",
  completed: "Завершён",
  cancelled: "Отменён",
};

async function fetchTournaments(): Promise<Tournament[]> {
  const response = await fetch("/api/tournaments");
  if (!response.ok) throw new Error("Failed to fetch tournaments");
  return response.json();
}

const TournamentsPage = () => {
  const navigate = useNavigate();

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["tournaments"],
    queryFn: fetchTournaments,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Tournament[]>();

    tournaments.forEach((t) => {
      const date = new Date(t.start_date);
      const month = date.toLocaleDateString("ru-RU", { month: "long" });
      const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1);

      const arr = map.get(monthCapitalized) ?? [];
      arr.push(t);
      map.set(monthCapitalized, arr);
    });

    return Array.from(map.entries());
  }, [tournaments]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.getDate().toString(),
      day: date.toLocaleDateString("ru-RU", { weekday: "short" }).toUpperCase(),
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Загрузка турниров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">
            Календарь
          </div>
          <h1 className="text-3xl font-bold mt-1">Турниры 2026</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Golf Club Minsk · {tournaments.length} турниров
          </p>
        </div>
        <button
          onClick={() => navigate("/create-tournament")}
          className="flex items-center gap-1.5 h-10 px-4 rounded-xl font-bold text-sm mt-1 shrink-0"
          style={{
            background: "rgba(34,197,94,0.12)",
            border: "1.5px solid rgba(34,197,94,0.3)",
            color: "#22c55e",
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Создать
        </button>
      </div>

      {/* Active Tournaments */}
      {tournaments.some((t) => t.status === "active") && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Идут сейчас
          </h2>
          {tournaments
            .filter((t) => t.status === "active")
            .map((t) => (
              <Card
                key={t.id}
                className="overflow-hidden shadow-soft cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/tournament/${t.id}`)}
              >
                <div className="px-4 py-4 flex items-center gap-3">
                  <div className="w-16 shrink-0">
                    <div className="font-bold tabular-nums text-foreground text-lg leading-none">
                      {formatDate(t.start_date).date}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                      {formatDate(t.start_date).day}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-snug mb-1">
                      {t.name}
                    </div>
                    {t.course_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {t.course_name}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={cn("text-xs font-semibold", statusColor[t.status])}>
                      {statusLabel[t.status]}
                    </div>
                    <div
                      title={TIER_LABELS[t.tier]}
                      className={cn(
                        "h-7 w-7 rounded-full grid place-items-center text-[8px] font-bold text-primary-foreground shadow-soft",
                        tierColor[t.tier]
                      )}
                    >
                      {t.tier === "gold" && "G"}
                      {t.tier === "platinum" && "PL"}
                      {t.tier === "diamond" && "◆"}
                      {t.tier === "closed" && "C"}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Calendar by Month */}
      {grouped.map(([month, items]) => (
        <Card key={month} className="overflow-hidden shadow-soft">
          <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-action flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {month}
            </div>
          </div>
          <div className="divide-y divide-border">
            {items.map((t) => (
              <div
                key={t.id}
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate(`/tournament/${t.id}`)}
              >
                <div className="w-16 shrink-0">
                  <div className="font-bold tabular-nums text-foreground text-lg leading-none">
                    {formatDate(t.start_date).date}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    {formatDate(t.start_date).day}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-snug mb-0.5">
                    {t.name}
                  </div>
                  {t.course_name && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {t.course_name}
                    </div>
                  )}
                  {t.status === "completed" && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Посмотреть результаты →
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.status !== "upcoming" && (
                    <div className={cn("text-xs font-semibold", statusColor[t.status])}>
                      {statusLabel[t.status]}
                    </div>
                  )}
                  <div
                    title={TIER_LABELS[t.tier]}
                    className={cn(
                      "h-7 w-7 rounded-full grid place-items-center text-[8px] font-bold text-primary-foreground shadow-soft",
                      tierColor[t.tier]
                    )}
                  >
                    {t.tier === "gold" && "G"}
                    {t.tier === "platinum" && "PL"}
                    {t.tier === "diamond" && "◆"}
                    {t.tier === "closed" && "C"}
                  </div>
                  {t.entry_fee && (
                    <div className="text-xs font-semibold tabular-nums text-foreground">
                      {t.entry_fee} BYN
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Legend */}
      <Card className="p-4 shadow-soft">
        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
          Типы турниров
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {(Object.keys(TIER_LABELS) as Tier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-2">
              <div className={cn("h-5 w-5 rounded-full shrink-0", tierColor[tier])} />
              <span className="text-foreground">{TIER_LABELS[tier]}</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-muted-foreground mt-3">
          * Нажмите на турнир для просмотра деталей
        </div>
      </Card>
    </div>
  );
};

export default TournamentsPage;
