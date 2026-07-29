import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Round } from "@/store/golfStore";
import type { FormatId } from "@/lib/formats";
import { computeTournamentLeaderboard } from "@/lib/tournamentLiveScoring";
import { cn } from "@/lib/utils";

const parSign = (v: number) => (v === 0 ? "E" : v > 0 ? `+${v}` : `${v}`);
const placeOf = (pos: string) => parseInt(pos.replace("T", ""), 10);

export const TournamentLiveLeaderboard = ({
  tournamentId,
  format,
}: {
  tournamentId: string;
  format: FormatId;
}) => {
  const [rounds, setRounds] = useState<Round[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .get<Round[]>(`/api/tournaments/${tournamentId}/rounds`)
        .then((data) => { if (!cancelled) setRounds(data); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [tournamentId]);

  if (rounds === null) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Загрузка...</div>;
  }

  const isStableford = format === "stableford";
  const flights = computeTournamentLeaderboard(rounds, tournamentId, format);

  if (flights.length === 0) {
    return (
      <Card className="p-6 text-center shadow-soft">
        <div className="text-4xl mb-3">⛳</div>
        <div className="text-sm font-semibold text-foreground mb-1">Live-scoring ещё не начался</div>
        <div className="text-xs text-muted-foreground">
          Здесь появится турнирная таблица, как только участники начнут вводить счёт
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {flights.map((flight) => (
        <Card key={flight.key} className="overflow-hidden shadow-soft">
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <div className="font-bold text-sm text-foreground">{flight.label}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-12">Pos</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Игрок</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-20">
                    {isStableford ? "Total Pts" : "Net"}
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-16">Thru</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-20">
                    {isStableford ? "Today Pts" : "Today"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flight.entries.map((e) => {
                  const place = placeOf(e.pos);
                  return (
                    <tr key={e.key} className={cn(place <= 3 && "bg-action/5", e.isMe && "bg-action/10")}>
                      <td className="px-3 py-2.5 font-bold text-foreground">
                        {place <= 3 ? (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center h-6 min-w-6 px-1 rounded-full text-xs font-bold",
                              place === 1 && "bg-yellow-500 text-black",
                              place === 2 && "bg-gray-400 text-white",
                              place === 3 && "bg-orange-600 text-white"
                            )}
                          >
                            {e.pos}
                          </span>
                        ) : (
                          e.pos
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-foreground font-medium truncate max-w-[140px]">
                        {e.name}
                        {e.isMe && <span className="text-action ml-1">•</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-foreground tabular-nums">
                        {isStableford ? e.totalPoints : parSign(e.totalNetVsPar)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">
                        {e.thru > 0 ? `${e.thru}${!e.todayCompleted && e.thru < e.totalHoles ? "*" : ""}` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-foreground tabular-nums">
                        {isStableford ? e.todayPoints : parSign(e.todayNetVsPar)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
};
