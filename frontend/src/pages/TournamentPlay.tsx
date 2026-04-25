import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/PlayerAvatar";
import { COURSES } from "@/lib/courses";
import { TOURNAMENTS, TIER_LABELS, type Tier } from "@/lib/tournaments";
import { FORMATS, getFormat, stablefordPoints, type FormatId } from "@/lib/formats";
import { useGolf, type Player, type Round } from "@/store/golfStore";
import { compressImage } from "@/lib/imageUtils";
import { ChevronLeft, ChevronRight, Plus, X, Waves, ShieldAlert, Mountain, Flag, Trophy, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const tierColor: Record<Tier, string> = {
  gold: "bg-tier-gold",
  platinum: "bg-tier-platinum",
  diamond: "bg-tier-diamond",
  closed: "bg-tier-closed",
};

type AnyTournament = {
  id: string;
  name: string;
  date: string;
  day: string;
  month: string;
  format: FormatId;
  tier?: Tier;
  fee?: string;
  notes?: string;
};

type Step = "info" | "setup" | "playing";

const TournamentPlayPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, frequent, activeRound, startRound, cancelActiveRound, customTournaments } = useGolf();

  const staticT = TOURNAMENTS.find((t) => t.id === id);
  const customT = customTournaments.find((t) => t.id === id);
  const tournament: AnyTournament | undefined = staticT
    ? { ...staticT, format: "stroke_play" }
    : customT
    ? customT
    : undefined;

  const [step, setStep] = useState<Step>(activeRound ? "playing" : "info");
  const [courseId, setCourseId] = useState<string>(COURSES[0].id);
  const [players, setPlayers] = useState<Player[]>([
    { id: "me", name: `${profile.firstName} ${profile.lastName}`, initials: profile.initials, hcp: profile.hcp, isMe: true },
  ]);

  if (!tournament) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <button onClick={() => navigate("/tournaments")} className="flex items-center gap-1 text-action font-bold">
          <ChevronLeft className="h-5 w-5" /> Назад
        </button>
        <Card className="p-8 text-center text-muted-foreground">Турнир не найден</Card>
      </div>
    );
  }

  const course = COURSES.find((c) => c.id === courseId)!;

  if (activeRound || step === "playing") {
    return (
      <TournamentRoundPlayer
        tournamentName={tournament.name}
        format={tournament.format}
        onExit={() => { cancelActiveRound(); setStep("info"); }}
      />
    );
  }

  if (step === "setup") {
    return (
      <TournamentSetup
        tournament={tournament}
        course={course}
        courseId={courseId}
        setCourseId={setCourseId}
        players={players}
        setPlayers={setPlayers}
        frequent={frequent}
        onBack={() => setStep("info")}
        onStart={() => {
          startRound(course, players, tournament.id, tournament.format);
          setStep("playing");
          toast.success(`${tournament.name} — раунд начат!`);
        }}
      />
    );
  }

  return (
    <TournamentInfo tournament={tournament} onBack={() => navigate("/tournaments")} onPlay={() => setStep("setup")} />
  );
};

/* ── Info screen ── */
const TournamentInfo = ({
  tournament,
  onBack,
  onPlay,
}: {
  tournament: AnyTournament;
  onBack: () => void;
  onPlay: () => void;
}) => {
  const fmt = getFormat(tournament.format);
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-1 text-action font-bold text-lg">
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> Турниры
      </button>

      <Card className="overflow-hidden shadow-elevated">
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                {tournament.month} · {tournament.date} {tournament.day}
              </div>
              <h1 className="text-xl font-bold leading-snug">{tournament.name}</h1>
            </div>
            {tournament.tier && (
              <div
                className={cn("h-10 w-10 rounded-full grid place-items-center text-[9px] font-bold text-primary-foreground shadow-soft shrink-0", tierColor[tournament.tier])}
                title={TIER_LABELS[tournament.tier]}
              >
                {tournament.tier === "gold" && "G"}
                {tournament.tier === "platinum" && "PL"}
                {tournament.tier === "diamond" && "◆"}
                {tournament.tier === "closed" && "C"}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full bg-muted text-xs font-semibold flex items-center gap-1">
              <span>{fmt.emoji}</span> {fmt.name}
            </span>
            {tournament.tier && (
              <span className="px-2.5 py-1 rounded-full bg-muted text-xs font-semibold">
                {TIER_LABELS[tournament.tier]}
              </span>
            )}
            {tournament.fee && (
              <span className="px-2.5 py-1 rounded-full bg-muted text-xs font-semibold">
                Взнос {tournament.fee} BYN
              </span>
            )}
          </div>

          {/* Format description */}
          <div className="mt-4 p-3 rounded-xl bg-muted/50">
            <div className="text-xs font-semibold text-foreground mb-1">{fmt.name} — правила</div>
            <div className="text-xs text-muted-foreground">{fmt.description}</div>
            <div className="text-xs text-action mt-1 font-medium">💡 {fmt.tip}</div>
          </div>

          {tournament.notes && (
            <div className="mt-3 text-sm text-muted-foreground">{tournament.notes}</div>
          )}
        </div>

        <div className="px-5 pb-5">
          <Button
            onClick={onPlay}
            size="lg"
            className="w-full h-14 text-base font-semibold bg-action hover:bg-action/90 text-action-foreground rounded-xl shadow-glow transition-spring hover:scale-[1.01]"
          >
            <Flag className="h-5 w-5 mr-2" strokeWidth={2.5} /> Начать лайвскоринг
          </Button>
        </div>
      </Card>
    </div>
  );
};

/* ── Setup screen ── */
const TournamentSetup = ({
  tournament, course, courseId, setCourseId, players, setPlayers, frequent, onBack, onStart,
}: {
  tournament: AnyTournament;
  course: ReturnType<typeof COURSES.find> & object;
  courseId: string;
  setCourseId: (id: string) => void;
  players: Player[];
  setPlayers: (p: Player[]) => void;
  frequent: Player[];
  onBack: () => void;
  onStart: () => void;
}) => {
  const fmt = getFormat(tournament.format);
  const slots = Array.from({ length: 4 });
  const addPlayer = (p: Player) => {
    if (players.length >= 4 || players.find((x) => x.id === p.id)) return;
    setPlayers([...players, p]);
  };
  const removePlayer = (id: string) => setPlayers(players.filter((p) => p.id !== id || p.isMe));

  return (
    <div className="space-y-5 animate-in slide-in-from-right duration-300">
      <button onClick={onBack} className="flex items-center gap-1 text-action font-bold text-lg">
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> PLAYER SETUP
      </button>

      <Card className="p-3 shadow-soft border-l-4 border-action">
        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Турнир</div>
        <div className="text-sm font-bold leading-snug">{tournament.name}</div>
        <div className="text-xs text-action mt-0.5">{fmt.emoji} {fmt.name}</div>
      </Card>

      <Card className="p-4 shadow-soft">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Поле</div>
        <div className="grid grid-cols-2 gap-2">
          {COURSES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCourseId(c.id)}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition-base",
                courseId === c.id ? "border-action bg-action/5" : "border-border hover:border-muted-foreground/30",
              )}
            >
              <div className="font-semibold text-sm">{c.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{c.tee} · {c.totalYards}y · Par {c.totalPar}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden shadow-soft">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-xs text-muted-foreground font-semibold">
          <div>Players / Hcp</div>
          <div className="w-14 text-center">Tee</div>
          <div className="w-16 text-center">Sug.</div>
        </div>
        {slots.map((_, i) => {
          const p = players[i];
          if (!p) {
            return (
              <div key={i} className="flex items-center justify-between px-4 py-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full border-2 border-dashed border-border" />
                  <div className="text-muted-foreground">Player {i + 1}</div>
                </div>
                <button
                  className="flex items-center gap-1 text-action font-semibold text-sm"
                  onClick={() => {
                    const next = frequent.find((f) => !players.find((pl) => pl.id === f.id));
                    if (next) addPlayer(next);
                    else toast.info("Нет доступных друзей — добавьте в Frequently played");
                  }}
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            );
          }
          return (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={p.name} tone={p.isMe ? "orange" : "muted"} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">HCP {p.hcp}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md border-2 border-action bg-warning/30" title="Yellow tee" />
                <div className="h-12 w-12 rounded-full bg-warning grid place-items-center font-bold text-primary">
                  {p.hcp}
                </div>
                {!p.isMe && (
                  <button onClick={() => removePlayer(p.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {frequent.length > 0 && (
        <Card className="p-4 shadow-soft">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Frequently played</div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {frequent.map((f) => {
              const added = !!players.find((p) => p.id === f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => addPlayer(f)}
                  disabled={added || players.length >= 4}
                  className={cn("flex flex-col items-center gap-1.5 shrink-0 transition-base", (added || players.length >= 4) && "opacity-40")}
                >
                  <Avatar name={f.name} tone="muted" />
                  <div className="text-xs font-medium">{f.name}</div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Button
        onClick={onStart}
        size="lg"
        className="w-full h-14 bg-action hover:bg-action/90 text-action-foreground rounded-xl text-base font-semibold shadow-glow transition-spring"
      >
        Начать · {course?.name}
      </Button>
    </div>
  );
};

/* ── Scoring helpers ── */
const scoreLabel = (score: number, par: number) => {
  const d = score - par;
  if (d <= -2) return "Игл";
  if (d === -1) return "Бёрди";
  if (d === 0) return "Пар";
  if (d === 1) return "Богги";
  return `+${d}`;
};

const scoreLabelColor = (score: number, par: number) => {
  const d = score - par;
  if (d <= -2) return "text-yellow-400";
  if (d === -1) return "text-action";
  if (d === 0) return "text-primary-foreground";
  if (d === 1) return "text-orange-400";
  return "text-red-400";
};

const parSignColor = (vsPar: number) => {
  if (vsPar < 0) return "#22c55e";
  if (vsPar === 0) return "rgba(255,255,255,0.9)";
  return "#f87171";
};

const parSignText = (vsPar: number) => {
  if (vsPar === 0) return "E";
  if (vsPar > 0) return `+${vsPar}`;
  return `${vsPar}`;
};

/* ── Leaderboard ── */
const Leaderboard = ({
  activeRound,
  course,
  format,
}: {
  activeRound: NonNullable<ReturnType<typeof useGolf>["activeRound"]>;
  course: ReturnType<typeof COURSES.find> & object;
  format: FormatId;
}) => {
  const isStableford = format === "stableford";

  type Entry = {
    player: Player;
    total: number;
    vsPar: number;
    points: number;
    holesPlayed: number;
  };

  const entries: Entry[] = activeRound.players.map((p) => {
    const played = activeRound.scores[p.id] ?? [];
    let total = 0;
    let vsPar = 0;
    let points = 0;
    played.forEach((s) => {
      const h = course.holes.find((h) => h.number === s.hole);
      const par = h?.par ?? 4;
      total += s.score;
      vsPar += s.score - par;
      points += stablefordPoints(s.score, par);
    });
    return { player: p, total, vsPar, points, holesPlayed: played.length };
  });

  const sorted = [...entries].sort((a, b) =>
    isStableford ? b.points - a.points : a.vsPar - b.vsPar || a.total - b.total
  );

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2">
      <div className="rounded-2xl overflow-hidden" style={{ background: "#1a1a1a" }}>
        {/* Header row */}
        <div
          className="grid px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider"
          style={{ gridTemplateColumns: "2rem 1fr auto auto", color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>#</div>
          <div>Игрок</div>
          <div className="w-12 text-center">{isStableford ? "Очки" : "±"}</div>
          <div className="w-12 text-center">Итого</div>
        </div>

        {sorted.map((e, i) => (
          <div
            key={e.player.id}
            className="grid items-center px-4 py-3"
            style={{
              gridTemplateColumns: "2rem 1fr auto auto",
              borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined,
            }}
          >
            {/* Position */}
            <div className="text-sm font-black" style={{ color: i < 3 ? "#22c55e" : "rgba(255,255,255,0.3)" }}>
              {medals[i] ?? i + 1}
            </div>

            {/* Player */}
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={e.player.name} tone={e.player.isMe ? "orange" : "muted"} />
              <div className="min-w-0">
                <div className="text-white font-semibold text-sm truncate">
                  {e.player.name.split(" ")[0]}
                  <span className="text-white/40 font-normal ml-1">[{e.player.hcp}]</span>
                </div>
                <div className="text-white/40 text-xs">{e.holesPlayed} лун.</div>
              </div>
            </div>

            {/* ±par or points */}
            <div className="w-12 text-center">
              {isStableford ? (
                <span className="text-white font-black text-base tabular-nums">{e.points}</span>
              ) : (
                <span className="font-black text-base tabular-nums" style={{ color: parSignColor(e.vsPar) }}>
                  {parSignText(e.vsPar)}
                </span>
              )}
            </div>

            {/* Total */}
            <div className="w-12 text-center">
              <span className="text-white/70 font-bold text-sm tabular-nums">{e.total || "—"}</span>
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <div className="py-8 text-center text-white/30 text-sm">
            Введите счёт, чтобы увидеть лидерборд
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Round player ── */
const TournamentRoundPlayer = ({
  tournamentName,
  format,
  onExit,
}: {
  tournamentName: string;
  format: FormatId;
  onExit: () => void;
}) => {
  const { activeRound, enterScore, finishRound, setRoundPhoto } = useGolf();
  const [view, setView] = useState<"scoring" | "leaderboard">("scoring");
  const [holeIdx, setHoleIdx] = useState(0);
  const [sheetPlayer, setSheetPlayer] = useState<Player | null>(null);
  const [hole, setHole] = useState({ score: 4, putts: 2, fairwayBunker: false, greenSideBunker: false, hazard: false, outOfBounds: false });
  const [completedRound, setCompletedRound] = useState<Round | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  if (completedRound) {
    const completedCourse = COURSES.find((c) => c.id === completedRound.courseId);
    const cme = completedRound.players.find((p) => p.isMe) ?? completedRound.players[0];
    const cScores = cme ? (completedRound.scores[cme.id] ?? []) : [];
    const cTotal = cScores.reduce((a, s) => a + s.score, 0);
    const cVsPar = cScores.reduce((a, s) => {
      const h = completedCourse?.holes.find((h) => h.number === s.hole);
      return a + (s.score - (h?.par ?? 4));
    }, 0);
    const vpText = cVsPar === 0 ? "E" : cVsPar > 0 ? `+${cVsPar}` : `${cVsPar}`;
    const vpColor = cVsPar < 0 ? "#22c55e" : cVsPar === 0 ? "rgba(255,255,255,0.8)" : "#f87171";

    const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const compressed = await compressImage(file);
      setRoundPhoto(completedRound.id, compressed);
      setCompletedRound({ ...completedRound, photoUrl: compressed });
      toast.success("Фото добавлено!");
      e.target.value = "";
    };

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: "#0a0a0a", paddingTop: "max(env(safe-area-inset-top), 32px)", paddingBottom: "max(env(safe-area-inset-bottom), 28px)" }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6 overflow-y-auto">
          <div className="text-center">
            <div
              className="h-16 w-16 rounded-full mx-auto mb-4 grid place-items-center"
              style={{ background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }}
            >
              <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
                <path d="M2 11L10 19L26 3" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
              Раунд завершён
            </div>
            <div className="text-white font-black text-5xl tabular-nums leading-none mt-2">{cTotal}</div>
            <div className="text-xl font-bold mt-1" style={{ color: vpColor }}>{vpText}</div>
            <div className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              {tournamentName}
            </div>
          </div>

          {completedRound.photoUrl ? (
            <div className="w-full">
              <div className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3", maxHeight: 220 }}>
                <img src={completedRound.photoUrl} alt="Round" className="w-full h-full object-cover" />
              </div>
              <button
                onClick={() => photoRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full mt-2 py-2 text-sm font-semibold"
                style={{ color: "#22c55e" }}
              >
                <Camera className="h-4 w-4" /> Заменить фото
              </button>
            </div>
          ) : (
            <button
              onClick={() => photoRef.current?.click()}
              className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 py-10"
              style={{ background: "rgba(255,255,255,0.04)", border: "2px dashed rgba(255,255,255,0.12)" }}
            >
              <Camera className="h-8 w-8" style={{ color: "#22c55e" }} />
              <div className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
                Добавить фото раунда
              </div>
            </button>
          )}
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>

        <div className="px-5 pt-4">
          <button
            onClick={onExit}
            className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-wider active:scale-[0.98] transition-transform"
            style={{ background: "#22c55e", color: "#000" }}
          >
            ГОТОВО
          </button>
        </div>
      </div>
    );
  }

  if (!activeRound) {
    return (
      <Card className="p-8 text-center">
        <div className="text-muted-foreground mb-4">Активного раунда нет</div>
        <Button onClick={onExit}>Назад</Button>
      </Card>
    );
  }

  const course = COURSES.find((c) => c.id === activeRound.courseId)!;
  const currentHole = course.holes[holeIdx];
  const totalHoles = course.holes.length;

  const openSheet = (p: Player) => {
    const existing = activeRound.scores[p.id]?.find((x) => x.hole === currentHole.number);
    setHole({
      score: existing?.score ?? currentHole.par,
      putts: existing?.putts ?? 2,
      fairwayBunker: existing?.fairwayBunker ?? false,
      greenSideBunker: existing?.greenSideBunker ?? false,
      hazard: existing?.hazard ?? false,
      outOfBounds: existing?.outOfBounds ?? false,
    });
    setSheetPlayer(p);
  };

  const openNextPlayer = () => {
    const next =
      activeRound.players.find((p) => !activeRound.scores[p.id]?.find((x) => x.hole === currentHole.number)) ??
      activeRound.players[0];
    openSheet(next);
  };

  const submit = () => {
    if (!sheetPlayer) return;
    enterScore(sheetPlayer.id, { hole: currentHole.number, ...hole });
    setSheetPlayer(null);
    toast.success(`Лунка ${currentHole.number}: ${hole.score}`);
    const allOthersScored = activeRound.players
      .filter((p) => p.id !== sheetPlayer.id)
      .every((p) => !!activeRound.scores[p.id]?.find((x) => x.hole === currentHole.number));
    if (allOthersScored && holeIdx < totalHoles - 1) {
      setTimeout(() => setHoleIdx((h) => Math.min(totalHoles - 1, h + 1)), 600);
    }
  };

  const handleFinish = () => {
    const snapshot = activeRound;
    finishRound();
    setCompletedRound({ ...snapshot, completed: true });
  };

  const total = (p: Player) => activeRound.scores[p.id]?.reduce((a, s) => a + (s.score || 0), 0) ?? 0;
  const totalVsPar = (p: Player) => {
    const played = activeRound.scores[p.id] ?? [];
    return played.reduce((a, s) => {
      const h = course.holes.find((h) => h.number === s.hole);
      return a + (s.score - (h?.par ?? 0));
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* Top nav */}
      <div
        className="flex items-center justify-between px-5"
        style={{ paddingTop: `max(env(safe-area-inset-top), 14px)`, paddingBottom: 10 }}
      >
        <button
          onClick={onExit}
          className="h-9 w-9 rounded-full grid place-items-center"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <X className="h-4 w-4 text-white" strokeWidth={2.5} />
        </button>

        {view === "scoring" ? (
          <div className="flex items-center gap-3">
            <button onClick={() => setHoleIdx(Math.max(0, holeIdx - 1))} disabled={holeIdx === 0} className="h-9 w-9 grid place-items-center disabled:opacity-20">
              <ChevronLeft className="h-6 w-6 text-white" strokeWidth={2.5} />
            </button>
            <span className="text-white font-bold text-base tracking-wider min-w-[90px] text-center">
              Лунка {currentHole.number}
            </span>
            <button onClick={() => setHoleIdx(Math.min(totalHoles - 1, holeIdx + 1))} disabled={holeIdx === totalHoles - 1} className="h-9 w-9 grid place-items-center disabled:opacity-20">
              <ChevronRight className="h-6 w-6 text-white" strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <span className="text-white font-bold text-base tracking-wider">Лидерборд</span>
        )}

        <button
          onClick={handleFinish}
          className="h-9 px-4 rounded-full font-bold text-xs tracking-wider"
          style={{ background: "rgba(255,255,255,0.1)", color: "#4ade80" }}
        >
          ФИНИШ
        </button>
      </div>

      {/* View toggle */}
      <div className="px-5 pb-3">
        <div className="flex rounded-full p-1 gap-1" style={{ background: "rgba(255,255,255,0.07)" }}>
          <button
            onClick={() => setView("scoring")}
            className="flex-1 h-8 rounded-full text-xs font-bold tracking-wider transition-all"
            style={view === "scoring"
              ? { background: "#22c55e", color: "#000" }
              : { color: "rgba(255,255,255,0.5)" }
            }
          >
            СЧЁТ
          </button>
          <button
            onClick={() => setView("leaderboard")}
            className="flex-1 h-8 rounded-full text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-1"
            style={view === "leaderboard"
              ? { background: "#22c55e", color: "#000" }
              : { color: "rgba(255,255,255,0.5)" }
            }
          >
            <Trophy className="h-3 w-3" /> ЛИДЕРБОРД
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "leaderboard" ? (
        <Leaderboard activeRound={activeRound} course={course} format={format} />
      ) : (
        <div className="flex-1 flex flex-col justify-center px-5 pb-4 gap-4 overflow-y-auto">
          {/* Widget card */}
          <div className="rounded-3xl overflow-hidden" style={{ background: "#1a1a1a" }}>
            <div className="flex items-center gap-2 px-5 pt-5 pb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6L12 2z"
                  stroke="white" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
              </svg>
              <span className="text-white/70 font-semibold text-sm tracking-[0.15em] truncate">{tournamentName}</span>
            </div>
            <div className="flex items-baseline gap-6 px-5 pb-4">
              <span className="text-white font-black text-4xl tracking-tight">ПАР {currentHole.par}</span>
              <span className="text-white/50 font-bold text-2xl tracking-tight">ГКП {currentHole.hcp}</span>
            </div>
            <div className="px-5 pb-4">
              <button
                onClick={openNextPlayer}
                className="w-full h-12 rounded-full font-black text-sm tracking-[0.15em] active:scale-[0.97] transition-transform"
                style={{ background: "#22c55e", color: "#000" }}
              >
                ВВЕСТИ СЧЁТ
              </button>
            </div>
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ background: "rgba(255,255,255,0.05)", borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div>
                <div className="text-white/80 text-sm font-semibold">{course.club}</div>
                <div className="text-white/40 text-xs">{course.name} · {currentHole.yards} ярд</div>
              </div>
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5" style={{ color: "#22c55e" }} />
                <span className="text-white font-black text-2xl tabular-nums">{currentHole.number}</span>
              </div>
            </div>
          </div>

          {/* Player score cards */}
          {activeRound.players.map((p) => {
            const t = total(p);
            const tp = totalVsPar(p);
            const has = activeRound.scores[p.id]?.find((x) => x.hole === currentHole.number);
            return (
              <button
                key={p.id}
                onClick={() => openSheet(p)}
                className="w-full rounded-2xl p-4 flex items-center justify-between gap-3 active:scale-[0.98] transition-transform"
                style={{ background: "#1a1a1a" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={p.name} tone={p.isMe ? "orange" : "muted"} />
                  <div className="text-left min-w-0">
                    <div className="text-white font-semibold truncate">
                      {p.name.split(" ")[0]}
                      <span className="text-white/40 text-sm font-normal ml-1">[{p.hcp}]</span>
                    </div>
                    <div className="text-white/50 text-sm" style={{ color: parSignColor(tp) }}>
                      {parSignText(tp)} · {t} уд.
                    </div>
                  </div>
                </div>
                <div
                  className="min-w-[60px] h-14 rounded-xl flex flex-col items-center justify-center"
                  style={has
                    ? { background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }
                    : { background: "rgba(255,255,255,0.07)", border: "2px solid rgba(255,255,255,0.1)" }
                  }
                >
                  {has ? (
                    <>
                      <div className="text-white font-black text-2xl tabular-nums leading-none">{has.score}</div>
                      <div className={cn("text-[10px] font-bold mt-0.5", scoreLabelColor(has.score, currentHole.par))}>
                        {scoreLabel(has.score, currentHole.par)}
                      </div>
                    </>
                  ) : (
                    <div className="text-white/25 text-2xl font-light">—</div>
                  )}
                </div>
              </button>
            );
          })}

          {/* Hole progress dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {course.holes.map((_, i) => (
              <button
                key={i}
                onClick={() => setHoleIdx(i)}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === holeIdx ? 20 : 8,
                  height: 8,
                  background: i === holeIdx
                    ? "#22c55e"
                    : activeRound.players.some((p) => activeRound.scores[p.id]?.find((s) => s.hole === course.holes[i].number))
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Score sheet */}
      {sheetPlayer && (
        <div className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-150">
          <button className="absolute inset-0 bg-black/70" onClick={() => setSheetPlayer(null)} />
          <div
            className="relative w-full rounded-t-3xl animate-in slide-in-from-bottom duration-250"
            style={{ background: "#1a1a1a", paddingBottom: `max(env(safe-area-inset-bottom), 24px)` }}
          >
            <div className="mx-auto w-10 h-1 rounded-full mt-3 mb-1" style={{ background: "rgba(255,255,255,0.15)" }} />
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-3">
                <Avatar name={sheetPlayer.name} tone={sheetPlayer.isMe ? "orange" : "muted"} />
                <div>
                  <div className="text-white font-bold">{sheetPlayer.name.split(" ")[0]}</div>
                  <div className="text-white/40 text-xs">Лунка {currentHole.number} · Пар {currentHole.par}</div>
                </div>
              </div>
              <button onClick={() => setSheetPlayer(null)} className="h-9 w-9 rounded-full grid place-items-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="px-5 pt-5 pb-2">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <ScoreCounter label="СЧЁТ" value={hole.score} onChange={(v) => setHole({ ...hole, score: v })} sublabel={scoreLabel(hole.score, currentHole.par)} sublabelColor={scoreLabelColor(hole.score, currentHole.par)} />
                <ScoreCounter label="ПАТТЫ" value={hole.putts} onChange={(v) => setHole({ ...hole, putts: v })} />
              </div>
              <div className="grid grid-cols-4 gap-2 mb-5">
                <PenaltyToggle icon={<Mountain className="h-4 w-4" />} label="Бункер Ф" active={hole.fairwayBunker} onClick={() => setHole({ ...hole, fairwayBunker: !hole.fairwayBunker })} />
                <PenaltyToggle icon={<Mountain className="h-4 w-4" />} label="Бункер Г" active={hole.greenSideBunker} onClick={() => setHole({ ...hole, greenSideBunker: !hole.greenSideBunker })} />
                <PenaltyToggle icon={<Waves className="h-4 w-4" />} label="Вода" active={hole.hazard} onClick={() => setHole({ ...hole, hazard: !hole.hazard })} />
                <PenaltyToggle icon={<ShieldAlert className="h-4 w-4" />} label="OB" active={hole.outOfBounds} onClick={() => setHole({ ...hole, outOfBounds: !hole.outOfBounds })} />
              </div>
              <button
                onClick={submit}
                className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-wider active:scale-[0.98] transition-transform"
                style={{ background: "#22c55e", color: "#000" }}
              >
                СОХРАНИТЬ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreCounter = ({ label, value, onChange, sublabel, sublabelColor }: {
  label: string; value: number; onChange: (v: number) => void; sublabel?: string; sublabelColor?: string;
}) => (
  <div className="rounded-2xl flex flex-col items-center" style={{ background: "rgba(255,255,255,0.06)" }}>
    <div className="text-[10px] font-bold uppercase tracking-widest pt-3 pb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</div>
    <button onClick={() => onChange(value + 1)} className="w-full h-14 grid place-items-center rounded-xl transition-colors active:bg-white/10" style={{ color: "#22c55e" }}>
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </button>
    <div className="text-4xl font-black tabular-nums text-white py-0.5">{value}</div>
    {sublabel ? <div className={cn("text-[11px] font-bold mb-0.5", sublabelColor)}>{sublabel}</div> : <div className="mb-0.5 h-4" />}
    <button onClick={() => onChange(Math.max(1, value - 1))} className="w-full h-14 grid place-items-center rounded-xl transition-colors active:bg-white/10" style={{ color: "#22c55e" }}>
      <span className="text-3xl leading-none font-bold">−</span>
    </button>
  </div>
);

const PenaltyToggle = ({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1 py-3 rounded-xl transition-colors"
    style={active
      ? { background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e", color: "#22c55e" }
      : { background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
    }
  >
    <div className="h-8 w-8 rounded-full grid place-items-center" style={{ background: active ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)" }}>
      {icon}
    </div>
    <div className="text-[9px] font-semibold leading-tight text-center px-1">{label}</div>
  </button>
);

export default TournamentPlayPage;
