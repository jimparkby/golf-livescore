import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TOURNAMENTS, TIER_LABELS, type Tier } from "@/lib/tournaments";
import { getTournamentData } from "@/lib/tournament-data";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, Image } from "lucide-react";

const tierColor: Record<Tier, string> = {
  gold:     "bg-tier-gold",
  platinum: "bg-tier-platinum",
  diamond:  "bg-tier-diamond",
  closed:   "bg-tier-closed",
};

const TournamentsPage = () => {
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const map = new Map<string, typeof TOURNAMENTS>();
    TOURNAMENTS.forEach((t) => {
      const arr = map.get(t.month) ?? [];
      arr.push(t);
      map.set(t.month, arr);
    });
    return Array.from(map.entries());
  }, []);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">Calendar</div>
          <h1 className="text-3xl font-bold mt-1">Tournaments 2026</h1>
          <p className="text-sm text-muted-foreground mt-1">Golf Club Minsk · {TOURNAMENTS.length} events</p>
        </div>
        <button
          onClick={() => navigate("/create-tournament")}
          className="flex items-center gap-1.5 h-10 px-4 rounded-xl font-bold text-sm mt-1 shrink-0"
          style={{ background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.3)", color: "#22c55e" }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Создать
        </button>
      </div>


      {/* Calendar */}
      {grouped.map(([month, items]) => (
        <Card key={month} className="overflow-hidden shadow-soft">
          <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-action">{month}</div>
          </div>
          <div className="divide-y divide-border">
            {items.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tournament-info/${t.id}`)}
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors"
              >
                <div className="w-16 shrink-0">
                  <div className="font-bold tabular-nums text-foreground text-lg leading-none">{t.date}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{t.day}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-snug">{t.name}</div>
                  {getTournamentData(t.id) && (
                    <div className="flex items-center gap-1 mt-1">
                      <Image className="h-3 w-3 text-action" />
                      <span className="text-[10px] text-action font-semibold uppercase tracking-wider">
                        Результаты
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    title={TIER_LABELS[t.tier]}
                    className={cn("h-7 w-7 rounded-full grid place-items-center text-[8px] font-bold text-primary-foreground shadow-soft", tierColor[t.tier])}
                  >
                    {t.tier === "gold" && "G"}
                    {t.tier === "platinum" && "PL"}
                    {t.tier === "diamond" && "◆"}
                    {t.tier === "closed" && "C"}
                  </div>
                  {t.fee && <div className="text-xs font-semibold tabular-nums text-foreground">{t.fee}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Legend */}
      <Card className="p-4 shadow-soft">
        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Tournament Status</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {(Object.keys(TIER_LABELS) as Tier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-2">
              <div className={cn("h-5 w-5 rounded-full shrink-0", tierColor[tier])} />
              <span className="text-foreground">{TIER_LABELS[tier]}</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-muted-foreground mt-3">*Tournament date is subject to change</div>
      </Card>
    </div>
  );
};

export default TournamentsPage;
