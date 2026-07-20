import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TOURNAMENTS, TIER_LABELS, type Tier } from "@/lib/tournaments";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, Trophy, Lock, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

type OfficialTournament = {
  id: string;
  name: string;
  date: string;
  startTime: string;
  status: "draft" | "open" | "live" | "completed";
  myRegistration: { paid: boolean; checkedIn: boolean } | null;
};

const OFFICIAL_STATUS_LABEL: Record<OfficialTournament["status"], string> = {
  draft: "Черновик",
  open: "Регистрация",
  live: "Идёт сейчас",
  completed: "Завершён",
};

const tierColor: Record<Tier, string> = {
  gold:     "bg-tier-gold",
  platinum: "bg-tier-platinum",
  diamond:  "bg-tier-diamond",
  closed:   "bg-tier-closed",
};

const TournamentsPage = () => {
  const navigate = useNavigate();
  const [official, setOfficial] = useState<OfficialTournament[]>([]);

  useEffect(() => {
    api.get<OfficialTournament[]>("/api/official-tournaments").then(setOfficial).catch(() => {});
  }, []);

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

      {/* Official tournaments */}
      {official.length > 0 && (
        <Card className="overflow-hidden shadow-soft">
          <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-action">Официальные турниры</div>
          </div>
          <div className="divide-y divide-border">
            {official.map((t) => {
              const reg = t.myRegistration;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate(`/official-tournament/${t.id}`)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                >
                  <div className="h-9 w-9 rounded-full grid place-items-center shrink-0 bg-action/10 text-action">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-snug">{t.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(t.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} · {OFFICIAL_STATUS_LABEL[t.status]}
                    </div>
                  </div>
                  {reg?.checkedIn ? (
                    <CheckCircle2 className="h-4 w-4 text-action shrink-0" />
                  ) : reg?.paid ? (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                      Оплачено
                    </span>
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </Card>
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
