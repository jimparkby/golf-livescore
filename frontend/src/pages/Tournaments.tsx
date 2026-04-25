import { TOURNAMENTS, TIER_LABELS, type Tier } from "@/lib/tournaments";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const tierColor: Record<Tier, string> = {
  gold: "bg-tier-gold",
  platinum: "bg-tier-platinum",
  diamond: "bg-tier-diamond",
  closed: "bg-tier-closed",
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
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">Календарь</div>
        <h1 className="text-3xl font-bold mt-1">Турниры 2026</h1>
        <p className="text-sm text-muted-foreground mt-1">Golf Club Minsk · {TOURNAMENTS.length} событий</p>
      </div>

      {grouped.map(([month, items]) => (
        <Card key={month} className="overflow-hidden shadow-soft">
          <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-primary">{month}</div>
          </div>
          <div className="divide-y divide-border">
            {items.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/tournament/${t.id}`)}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-base text-left"
              >
                <div className="w-20 shrink-0">
                  <div className="font-bold tabular-nums text-primary">{t.date}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.day}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-snug">{t.name}</div>
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
                  {t.fee && <div className="text-xs font-semibold tabular-nums w-7 text-right">{t.fee}</div>}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      ))}

      <Card className="p-4 shadow-soft">
        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Статус турнира</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {(Object.keys(TIER_LABELS) as Tier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-2">
              <div className={cn("h-5 w-5 rounded-full", tierColor[tier])} />
              <span>{TIER_LABELS[tier]}</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-muted-foreground mt-3">*Дата турнира может быть изменена</div>
      </Card>
    </div>
  );
};

export default TournamentsPage;
