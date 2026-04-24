import { useGolf } from "@/store/golfStore";
import { Card } from "@/components/ui/card";
import { SlidersHorizontal, Trash2, ArrowDownUp, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const StatsPage = () => {
  const { rounds, profile } = useGolf();

  const totals = rounds.map((r) => {
    const me = r.players.find((p) => p.isMe);
    if (!me) return { total: 0, rating: r.rating, slope: r.slope, course: r.courseName, date: r.date, tee: r.tee, isGreen: false };
    const total = r.scores[me.id].reduce((a, s) => a + s.score, 0);
    const isGreen = total <= 95;
    return { total, rating: r.rating, slope: r.slope, course: r.courseName, date: r.date, tee: r.tee, isGreen };
  });

  const max = Math.max(...totals.map((t) => t.total), 1);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">Карточки</div>
          <h1 className="text-2xl font-bold mt-1">Статистика</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-10 w-10 rounded-full bg-card border border-border grid place-items-center text-action shadow-soft">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button className="h-10 w-10 rounded-full bg-card border border-border grid place-items-center text-action shadow-soft">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Trend */}
      <Card className="p-5 shadow-soft">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-bold">Scoring Trend</div>
            <div className="text-xs text-muted-foreground">Зелёные счета идут в индекс гандикапа</div>
          </div>
          <div className="text-center">
            <div className="h-14 w-14 rounded-full bg-muted grid place-items-center font-bold text-sm">
              {profile.hcp - 1}~{profile.hcp + 1}
            </div>
            <div className="text-[10px] uppercase tracking-wider mt-1 text-muted-foreground">Index</div>
          </div>
        </div>
        <div className="rounded-xl border border-border p-4 bg-muted/20">
          <div className="flex items-end justify-between gap-2 h-32 border-l-2 border-dashed border-accent/40 pl-2 border-r-2 border-r-dashed border-r-accent/40 pr-2">
            {totals.slice().reverse().map((t, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="text-[10px] tabular-nums font-semibold">{t.total}</div>
                <div
                  className={cn("w-full rounded-t-md transition-spring", t.isGreen ? "bg-accent" : "bg-action")}
                  style={{ height: `${(t.total / max) * 80}%`, minHeight: 8 }}
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Records */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-bold">Scoring Record</div>
            <div className="text-xs text-muted-foreground">Date Range <span className="text-action">Never</span></div>
          </div>
          <button className="inline-flex items-center gap-1 text-action text-sm font-semibold"><ArrowDownUp className="h-3.5 w-3.5" /> Sort</button>
        </div>
        <div className="space-y-3">
          {totals.map((t, i) => (
            <Card key={i} className="p-4 shadow-soft flex items-center gap-4">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={cn(
                    "h-14 w-14 rounded-full border-2 grid place-items-center font-bold tabular-nums text-lg",
                    t.isGreen ? "border-accent text-accent" : "border-action text-action",
                  )}
                >
                  {t.total}
                </div>
                <div className="text-[10px] mt-1 tabular-nums text-muted-foreground">{(t.total - 72 + 0.6).toFixed(1)}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{t.course.split(" · ")[0]}</div>
                <div className="text-sm text-muted-foreground truncate">{t.course.split(" · ")[1]}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.tee} {t.rating} / {t.slope}%</div>
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-[10px] font-semibold rounded border border-accent text-accent"><BadgeCheck className="h-3 w-3" /> Attested</span>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums shrink-0 self-start">
                {new Date(t.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
