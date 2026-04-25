import { useState, useMemo } from "react";
import { useGolf } from "@/store/golfStore";
import { Card } from "@/components/ui/card";
import { ArrowDownUp, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDifferentials, calcHandicapIndex, diffUseCount, roundsNeeded } from "@/lib/handicap";
import { COURSES as COURSE_LIST } from "@/lib/courses";
import RoundCard from "@/components/RoundCard";

const StatsPage = () => {
  const { rounds, profile, deleteRound, setRoundPhoto, updateProfile } = useGolf();
  const [showAllDiffs, setShowAllDiffs] = useState(false);

  const diffs = useMemo(
    () => getDifferentials(rounds, "me", profile.hcp),
    [rounds, profile.hcp],
  );

  const diffValues = diffs.map((d) => d.differential);
  const whsIndex = calcHandicapIndex(diffValues);
  const completedCount = diffs.length;
  const needed = roundsNeeded(completedCount);
  const useCount = completedCount >= 3 ? diffUseCount(completedCount) : 0;
  const visibleDiffs = showAllDiffs ? diffs : diffs.slice(0, 5);

  const totals = rounds.map((r) => {
    const me = r.players.find((p) => p.isMe);
    if (!me) return { id: r.id, total: 0, isGreen: false };
    const total = r.scores[me.id]?.reduce((a, s) => a + s.score, 0) ?? 0;
    return { id: r.id, total, isGreen: total <= 95 };
  });
  const max = Math.max(...totals.map((t) => t.total), 1);
  const hcpChanged = whsIndex !== null && Math.abs(whsIndex - profile.hcp) >= 0.1;

  const playerName = profile.firstName
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : "Игрок";

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">Карточки</div>
        <h1 className="text-2xl font-bold mt-1">Статистика</h1>
      </div>

      {/* ── WHS Handicap Index ── */}
      <Card className="overflow-hidden shadow-elevated">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] font-bold text-action mb-1">WHS Гандикап-Индекс</div>
              {whsIndex !== null ? (
                <>
                  <div className="text-5xl font-black tabular-nums text-foreground leading-none">{whsIndex.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground mt-1.5">
                    лучшие {useCount} из {completedCount} раундов × 0.96
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-black text-muted-foreground leading-none">—</div>
                  <div className="text-xs text-muted-foreground mt-1.5">
                    {needed > 0 ? `Нужно ещё ${needed} завершённых раунда` : "Нет данных"}
                  </div>
                </>
              )}
            </div>
            {whsIndex !== null && (
              <div className="text-right space-y-1.5 shrink-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Гандикап поля</div>
                {COURSE_LIST.map((c) => {
                  const ch = Math.round(whsIndex * (c.slope / 113) + (c.rating - c.totalPar));
                  return (
                    <div key={c.id} className="flex items-center gap-2 justify-end">
                      <span className="text-xs text-muted-foreground">{c.name}</span>
                      <span className="text-sm font-black text-foreground tabular-nums w-6 text-right">{ch}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {hcpChanged && (
            <button
              onClick={() => { updateProfile({ hcp: whsIndex! }); }}
              className="mt-4 w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              style={{ background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.4)", color: "#22c55e" }}
            >
              Обновить профиль: HCP {profile.hcp} → {whsIndex!.toFixed(1)}
            </button>
          )}
        </div>

        {diffs.length > 0 && (
          <>
            <div className="border-t border-border">
              <div className="grid px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground"
                style={{ gridTemplateColumns: "1.5rem 1fr auto auto auto" }}>
                <div /><div>Поле · Дата</div>
                <div className="text-center w-10">Счёт</div>
                <div className="text-center w-10">Adj.</div>
                <div className="text-right w-12">Diff.</div>
              </div>
              {visibleDiffs.map((d) => (
                <div key={d.roundId} className="grid items-center px-4 py-2.5 border-t border-border/50"
                  style={{ gridTemplateColumns: "1.5rem 1fr auto auto auto" }}>
                  <div className="flex items-center justify-center">
                    {d.isUsed
                      ? <div className="h-2 w-2 rounded-full bg-action" />
                      : <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
                  </div>
                  <div className="min-w-0 pr-2">
                    <div className="text-sm font-medium truncate">{d.courseName}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      {new Date(d.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      <span className="ml-1 opacity-60">{d.courseRating}/{d.slopeRating}</span>
                    </div>
                  </div>
                  <div className="w-10 text-center text-sm tabular-nums font-semibold text-muted-foreground">{d.grossScore}</div>
                  <div className={cn("w-10 text-center text-sm tabular-nums font-semibold", d.adjustedScore < d.grossScore ? "text-action" : "text-muted-foreground")}>
                    {d.adjustedScore}
                  </div>
                  <div className={cn("w-12 text-right text-sm tabular-nums font-black", d.isUsed ? "text-foreground" : "text-muted-foreground")}>
                    {d.differential.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
            {diffs.length > 5 && (
              <button onClick={() => setShowAllDiffs((v) => !v)}
                className="w-full flex items-center justify-center gap-1 py-3 text-xs font-semibold text-action border-t border-border hover:bg-muted/20 transition-colors">
                {showAllDiffs
                  ? <><ChevronUp className="h-3.5 w-3.5" /> Свернуть</>
                  : <><ChevronDown className="h-3.5 w-3.5" /> Ещё {diffs.length - 5} раундов</>}
              </button>
            )}
            <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center gap-4 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-action" /> Используется в расчёте ({useCount} лучших)</div>
              <div>Adj. = скор. по Net Double Bogey</div>
            </div>
          </>
        )}
      </Card>

      {/* ── Scoring Trend ── */}
      {totals.length > 0 && (
        <Card className="p-5 shadow-soft">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-bold">Scoring Trend</div>
              <div className="text-xs text-muted-foreground">Зелёные раунды ≤ 95 ударов</div>
            </div>
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-muted grid place-items-center font-bold text-sm">{profile.hcp}</div>
              <div className="text-[10px] uppercase tracking-wider mt-1 text-muted-foreground">HCP</div>
            </div>
          </div>
          <div className="rounded-xl border border-border p-4 bg-muted/20">
            <div className="flex items-end justify-between gap-2 h-32 border-l-2 border-dashed border-accent/40 pl-2 border-r-2 border-r-dashed border-r-accent/40 pr-2">
              {totals.slice().reverse().map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="text-[10px] tabular-nums font-semibold">{t.total}</div>
                  <div className={cn("w-full rounded-t-md transition-spring", t.isGreen ? "bg-accent" : "bg-action")}
                    style={{ height: `${(t.total / max) * 80}%`, minHeight: 8 }} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── Round Cards (TheGrint style) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-bold">Раунды</div>
            <div className="text-xs text-muted-foreground">{rounds.length} сыграно</div>
          </div>
          <button className="inline-flex items-center gap-1 text-action text-sm font-semibold">
            <ArrowDownUp className="h-3.5 w-3.5" /> Sort
          </button>
        </div>

        {rounds.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground shadow-soft">
            Сыграйте первый раунд — он появится здесь
          </Card>
        )}

        <div className="space-y-4">
          {rounds.map((r) => (
            <RoundCard
              key={r.id}
              round={r}
              profilePhoto={profile.photoUrl}
              playerName={playerName}
              playerHcp={profile.hcp}
              onDelete={() => deleteRound(r.id)}
              onAddPhoto={(url) => setRoundPhoto(r.id, url)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
