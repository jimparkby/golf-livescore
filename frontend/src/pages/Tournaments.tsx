import { useState, useMemo } from "react";
import { TOURNAMENTS, TIER_LABELS, type Tier } from "@/lib/tournaments";
import { FORMATS } from "@/lib/formats";
import { useGolf } from "@/store/golfStore";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

const tierColor: Record<Tier, string> = {
  gold:     "bg-tier-gold",
  platinum: "bg-tier-platinum",
  diamond:  "bg-tier-diamond",
  closed:   "bg-tier-closed",
};

const TournamentsPage = () => {
  const { customTournaments, deleteCustomTournament } = useGolf();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">Calendar</div>
        <h1 className="text-3xl font-bold mt-1">Tournaments 2026</h1>
        <p className="text-sm text-muted-foreground mt-1">Golf Club Minsk · {TOURNAMENTS.length} events</p>
      </div>

      {/* Custom tournaments */}
      {customTournaments.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-action mb-2">My Tournaments</div>
          <Card className="overflow-hidden shadow-soft">
            <div className="divide-y divide-border">
              {customTournaments.map((t) => {
                const fmt = FORMATS.find((f) => f.id === t.format);
                return (
                  <div key={t.id}>
                    <div className="w-full px-4 py-3 flex items-center gap-3 text-left">
                      <div className="w-16 shrink-0">
                        <div className="font-bold tabular-nums text-foreground text-lg leading-none">{t.date}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{t.day}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-snug">{t.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {fmt?.emoji} {fmt?.name} · {t.month}
                        </div>
                      </div>
                      <button
                        onClick={() => setDeletingId(deletingId === t.id ? null : t.id)}
                        className={cn(
                          "h-8 w-8 rounded-full grid place-items-center transition-colors shrink-0",
                          deletingId === t.id ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground hover:text-destructive",
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {deletingId === t.id && (
                      <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-destructive/5 animate-in slide-in-from-top duration-150">
                        <div className="flex-1 text-sm text-destructive font-semibold">Delete tournament?</div>
                        <button
                          onClick={() => { deleteCustomTournament(t.id); setDeletingId(null); }}
                          className="px-4 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-4 py-1.5 rounded-lg bg-muted text-foreground text-sm font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Calendar */}
      {grouped.map(([month, items]) => (
        <Card key={month} className="overflow-hidden shadow-soft">
          <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-action">{month}</div>
          </div>
          <div className="divide-y divide-border">
            {items.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-16 shrink-0">
                  <div className="font-bold tabular-nums text-foreground text-lg leading-none">{t.date}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{t.day}</div>
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
