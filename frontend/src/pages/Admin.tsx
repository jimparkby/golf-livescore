import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useGolf, type Round, type CustomTournament } from "@/store/golfStore";
import { getFormat } from "@/lib/formats";
import { ShareRoundModal } from "@/components/ShareRoundModal";
import { ChevronLeft, QrCode, Plus, PlayCircle, Settings } from "lucide-react";

type Entry = {
  tournament: CustomTournament;
  round: Round | null;
  isActive: boolean;
};

const AdminPage = () => {
  const navigate = useNavigate();
  const { customTournaments, rounds, activeRound } = useGolf();
  const [shareRoundId, setShareRoundId] = useState<string | null>(null);

  const entries: Entry[] = useMemo(() => {
    return [...customTournaments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((tournament) => {
        const isActive = activeRound?.tournamentId === tournament.id;
        const round = isActive
          ? activeRound
          : rounds.find((r) => r.tournamentId === tournament.id) ?? null;
        return { tournament, round, isActive };
      });
  }, [customTournaments, rounds, activeRound]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <button onClick={() => navigate("/tournaments")} className="flex items-center gap-1 text-action font-bold text-lg">
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> Админ-панель
      </button>

      <p className="text-sm text-muted-foreground -mt-2">
        QR-коды и живой счёт для ваших турниров
      </p>

      {entries.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-action/15 grid place-items-center mx-auto">
            <Settings className="h-6 w-6 text-action" />
          </div>
          <div className="text-muted-foreground text-sm">Вы ещё не создавали турниры</div>
          <button
            onClick={() => navigate("/create-tournament")}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl font-bold text-sm"
            style={{ background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.3)", color: "#22c55e" }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Создать турнир
          </button>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map(({ tournament, round, isActive }) => {
            const fmt = getFormat(tournament.format);
            return (
              <Card key={tournament.id} className="p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{fmt.emoji}</span>
                      <div className="font-bold text-sm truncate">{tournament.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {tournament.month} {tournament.date} · {round?.courseName ?? "—"}
                    </div>
                    <div className="mt-2">
                      {isActive && !round?.completed ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#22c55e" }} />
                          В игре
                        </span>
                      ) : round?.completed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                          Завершён
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                          Нет раунда
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => round && setShareRoundId(round.id)}
                      disabled={!round}
                      className="h-9 w-9 rounded-full grid place-items-center disabled:opacity-30"
                      style={{ background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.3)" }}
                      title="QR для участников"
                    >
                      <QrCode className="h-4 w-4" style={{ color: "#22c55e" }} />
                    </button>
                    {isActive && (
                      <button
                        onClick={() => navigate(`/tournament/${tournament.id}`)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-action"
                      >
                        <PlayCircle className="h-3.5 w-3.5" /> Продолжить
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {shareRoundId && (
        <ShareRoundModal roundId={shareRoundId} onClose={() => setShareRoundId(null)} />
      )}
    </div>
  );
};

export default AdminPage;
