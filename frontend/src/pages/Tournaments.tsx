import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TOURNAMENTS, TIER_LABELS, type Tier } from "@/lib/tournaments";
import { FORMATS, type FormatId } from "@/lib/formats";
import { useGolf } from "@/store/golfStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, ChevronRight, Trash2, Shuffle, X } from "lucide-react";

const tierColor: Record<Tier, string> = {
  gold: "bg-tier-gold",
  platinum: "bg-tier-platinum",
  diamond: "bg-tier-diamond",
  closed: "bg-tier-closed",
};

/* ── Format suggestion card ── */
const FormatSuggestion = () => {
  const navigate = useNavigate();
  const [suggested, setSuggested] = useState<(typeof FORMATS)[0] | null>(null);

  const suggest = () => {
    const pool = FORMATS.filter((f) => f.forGroup);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSuggested(pick);
  };

  return (
    <Card className="p-4 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-sm">Сыграть с друзьями?</div>
          <div className="text-xs text-muted-foreground">Подберём формат для вашей компании</div>
        </div>
        <button
          onClick={suggest}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-action/10 text-action text-xs font-bold hover:bg-action/20 transition-colors"
        >
          <Shuffle className="h-3.5 w-3.5" /> Предложить
        </button>
      </div>

      {suggested && (
        <div className="rounded-2xl border border-action/30 bg-action/5 p-4 animate-in fade-in duration-200 relative">
          <button
            onClick={() => setSuggested(null)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            <span className="text-3xl">{suggested.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold">{suggested.name}</div>
              <div className="text-xs text-muted-foreground mb-1">{suggested.players}</div>
              <div className="text-sm text-foreground">{suggested.description}</div>
              <div className="text-xs text-action mt-1 font-medium">💡 {suggested.tip}</div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => navigate(`/create-tournament?format=${suggested.id}`)}
              size="sm"
              className="flex-1 bg-action hover:bg-action/90 text-action-foreground rounded-xl font-semibold"
            >
              Создать турнир
            </Button>
            <button
              onClick={suggest}
              className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:text-foreground transition-colors"
            >
              Другой
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

/* ── Main page ── */
const TournamentsPage = () => {
  const navigate = useNavigate();
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
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">Календарь</div>
          <h1 className="text-3xl font-bold mt-1">Турниры 2026</h1>
          <p className="text-sm text-muted-foreground mt-1">Golf Club Minsk · {TOURNAMENTS.length} событий</p>
        </div>
        <button
          onClick={() => navigate("/create-tournament")}
          className="mt-1 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-action text-action-foreground text-sm font-bold shadow-glow hover:bg-action/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Создать
        </button>
      </div>

      {/* Format suggestion */}
      <FormatSuggestion />

      {/* Custom tournaments */}
      {customTournaments.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-action mb-2">Мои турниры</div>
          <Card className="overflow-hidden shadow-soft">
            <div className="divide-y divide-border">
              {customTournaments.map((t) => {
                const fmt = FORMATS.find((f) => f.id === t.format);
                return (
                  <div key={t.id}>
                    <button
                      onClick={() => navigate(`/tournament/${t.id}`)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-base text-left"
                    >
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
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingId(deletingId === t.id ? null : t.id); }}
                          className={cn(
                            "h-8 w-8 rounded-full grid place-items-center transition-colors",
                            deletingId === t.id ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground hover:text-destructive",
                          )}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    </button>
                    {deletingId === t.id && (
                      <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-destructive/5 animate-in slide-in-from-top duration-150">
                        <div className="flex-1 text-sm text-destructive font-semibold">Удалить турнир?</div>
                        <button
                          onClick={() => { deleteCustomTournament(t.id); setDeletingId(null); }}
                          className="px-4 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold"
                        >
                          Удалить
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-4 py-1.5 rounded-lg bg-muted text-foreground text-sm font-bold"
                        >
                          Отмена
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
              <button
                key={t.id}
                onClick={() => navigate(`/tournament/${t.id}`)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-base text-left"
              >
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      ))}

      {/* Legend */}
      <Card className="p-4 shadow-soft">
        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Статус турнира</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {(Object.keys(TIER_LABELS) as Tier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-2">
              <div className={cn("h-5 w-5 rounded-full shrink-0", tierColor[tier])} />
              <span className="text-foreground">{TIER_LABELS[tier]}</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-muted-foreground mt-3">*Дата турнира может быть изменена</div>
      </Card>
    </div>
  );
};

export default TournamentsPage;
