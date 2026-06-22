import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Award, Image as ImageIcon, Trophy } from "lucide-react";
import { TOURNAMENTS } from "@/lib/tournaments";
import { getTournamentData } from "@/lib/tournament-data";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Tab = "info" | "results" | "nominations" | "photos";

const TournamentInfoPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const tournament = TOURNAMENTS.find((t) => t.id === id);
  const tournamentData = id ? getTournamentData(id) : null;

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3">🏌️</div>
          <div className="text-lg font-semibold text-foreground">Турнир не найден</div>
          <button
            onClick={() => navigate("/tournaments")}
            className="mt-4 text-sm text-action hover:underline"
          >
            Вернуться к списку турниров
          </button>
        </div>
      </div>
    );
  }

  const hasData = !!tournamentData;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/tournaments")}
          className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">
            Tournament
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-0.5 leading-tight">{tournament.name}</h1>
        </div>
      </div>

      {/* Tabs */}
      {hasData && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveTab("info")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors",
              activeTab === "info"
                ? "bg-action text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            О турнире
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors",
              activeTab === "results"
                ? "bg-action text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            Результаты
          </button>
          <button
            onClick={() => setActiveTab("nominations")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors",
              activeTab === "nominations"
                ? "bg-action text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            Номинации
          </button>
          <button
            onClick={() => setActiveTab("photos")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors",
              activeTab === "photos"
                ? "bg-action text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            Фотогалерея
          </button>
        </div>
      )}

      {/* Info Tab */}
      {activeTab === "info" && (
        <Card className="p-5 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-3">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {tournament.date} {tournament.month} · {tournament.day}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                    Место проведения
                  </div>
                  <div className="text-sm font-semibold text-foreground">Golf Club Minsk</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Results Tab */}
      {activeTab === "results" && tournamentData && (
        <div className="space-y-4">
          {tournamentData.groups.map((group, idx) => (
            <Card key={idx} className="overflow-hidden shadow-soft">
              <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <div className="font-bold text-sm text-foreground">{group.name}</div>
                {group.format && (
                  <div className="text-xs text-muted-foreground mt-0.5">{group.format}</div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-12">
                        #
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">
                        Игрок
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-20">
                        Счет
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {group.results.slice(0, 10).map((result, ridx) => (
                      <tr key={ridx} className={cn(result.place <= 3 && "bg-action/5")}>
                        <td className="px-3 py-2.5 font-bold text-foreground">
                          {result.place <= 3 ? (
                            <span
                              className={cn(
                                "inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold",
                                result.place === 1 && "bg-yellow-500 text-black",
                                result.place === 2 && "bg-gray-400 text-white",
                                result.place === 3 && "bg-orange-600 text-white"
                              )}
                            >
                              {result.place}
                            </span>
                          ) : (
                            result.place
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-foreground font-medium">{result.player}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-foreground tabular-nums">
                          {result.total || result.score || result.net || result.gross}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Nominations Tab */}
      {activeTab === "nominations" && tournamentData && (
        <Card className="overflow-hidden shadow-soft">
          <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
            <Award className="h-4 w-4 text-action" />
            <div className="font-bold text-sm text-foreground">Специальные номинации</div>
          </div>
          <div className="divide-y divide-border">
            {tournamentData.nominations.map((nom, idx) => (
              <div key={idx} className="px-4 py-3 flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-action/10 flex items-center justify-center shrink-0">
                  <Trophy className="h-5 w-5 text-action" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                    {nom.title}
                  </div>
                  <div className="text-sm font-bold text-foreground">{nom.winner}</div>
                  {nom.value && (
                    <div className="text-xs text-muted-foreground mt-0.5">{nom.value}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Photos Tab */}
      {activeTab === "photos" && tournamentData && (
        <Card className="overflow-hidden shadow-soft">
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-action" />
              <div className="text-sm font-bold text-foreground">
                Фотогалерея ({tournamentData.photos.length})
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {tournamentData.photos.map((photo, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhoto(photo)}
                  className="aspect-[4/3] rounded-xl overflow-hidden bg-muted/30 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img
                    src={photo}
                    alt={`Фото ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* No Data Message */}
      {!hasData && (
        <Card className="p-6 text-center shadow-soft">
          <div className="text-4xl mb-3">🏆</div>
          <div className="text-sm font-semibold text-foreground mb-1">Турнир запланирован</div>
          <div className="text-xs text-muted-foreground">
            Результаты будут доступны после завершения турнира
          </div>
        </Card>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors z-10"
            >
              ✕
            </button>
            <img
              src={selectedPhoto}
              alt="Фото турнира"
              className="w-full h-auto rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentInfoPage;
