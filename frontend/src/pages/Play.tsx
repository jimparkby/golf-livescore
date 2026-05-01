import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/PlayerAvatar";
import { COURSES } from "@/lib/courses";
import { useGolf, type Player, type Round } from "@/store/golfStore";
import { compressImage } from "@/lib/imageUtils";
import { ChevronLeft, ChevronRight, Plus, Cog, X, PlayCircle, Flag, Camera, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import heroImg from "@/assets/golfminsk/hero.jpg";
import photo1 from "@/assets/golfminsk/photo1.jpg";
import photo2 from "@/assets/golfminsk/photo2.jpg";

type Step = "home" | "setup" | "playing";

const PlayPage = () => {
  const { profile, frequent, activeRound, startRound, cancelActiveRound } = useGolf();
  const [step, setStep] = useState<Step>(activeRound ? "playing" : "home");
  const [courseId, setCourseId] = useState<string>(COURSES[0].id);
  const [players, setPlayers] = useState<Player[]>([
    { id: "me", name: `${profile.firstName} ${profile.lastName}`, initials: profile.initials, hcp: profile.hcp, isMe: true },
  ]);

  const course = COURSES.find((c) => c.id === courseId)!;

  if (activeRound || step === "playing") return <RoundPlayer onExit={() => { cancelActiveRound(); setStep("home"); }} />;

  if (step === "setup") {
    return (
      <SetupScreen
        course={course}
        courseId={courseId}
        setCourseId={setCourseId}
        players={players}
        setPlayers={setPlayers}
        frequent={frequent}
        onBack={() => setStep("home")}
        onStart={() => {
          startRound(course, players);
          setStep("playing");
          toast.success("Раунд начат — удачной игры!");
        }}
      />
    );
  }

  return <HomeScreen onStart={() => setStep("setup")} />;
};

/* ────────── HOME ────────── */
const HomeScreen = ({ onStart }: { onStart: () => void }) => {
  const { rounds, profile } = useGolf();
  const last = rounds[0];
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <Card className="overflow-hidden border-0 shadow-elevated">
        <div className="relative h-44">
          <img src={heroImg} alt="Поле Golf Club Minsk" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />
          <div className="absolute inset-0 p-5 flex flex-col justify-end text-primary-foreground">
            <div className="text-xs uppercase tracking-[0.2em] opacity-80">Golf Club Minsk</div>
            <div className="text-2xl font-bold mt-1">Готов к раунду?</div>
          </div>
        </div>
        <div className="p-5 bg-card">
          <Button
            onClick={onStart}
            size="lg"
            className="w-full h-14 text-base font-semibold bg-action hover:bg-action/90 text-action-foreground rounded-xl shadow-glow transition-spring hover:scale-[1.01]"
          >
            <PlayCircle className="h-5 w-5 mr-2" strokeWidth={2.5} /> Начать раунд
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="HCP" value={String(profile.hcp)} />
        <StatTile label="Раундов" value={String(rounds.length)} />
        <StatTile label="Лучший" value={rounds.length === 0 ? "—" : String(Math.min(...rounds.map((r) => r.players[0] ? r.scores[r.players[0].id].reduce((a, s) => a + s.score, 0) : 999)))} />
      </div>

      {last && (
        <Card className="p-5 shadow-soft">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Последний раунд</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{last.courseName}</div>
              <div className="text-sm text-muted-foreground">{last.tee} · {last.rating} / {last.slope}%</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-action tabular-nums">
                {last.players[0] ? last.scores[last.players[0].id].reduce((a, s) => a + s.score, 0) : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground">{new Date(last.date).toLocaleDateString("ru-RU")}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="overflow-hidden shadow-soft aspect-[4/3] relative group">
          <img src={photo1} alt="Поле Golf Club Minsk — фарвей" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-spring group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
          <div className="absolute bottom-3 left-3 text-primary-foreground text-xs font-semibold uppercase tracking-wider">Championship</div>
        </Card>
        <Card className="overflow-hidden shadow-soft aspect-[4/3] relative group">
          <img src={photo2} alt="Поле Golf Club Minsk — грин" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-spring group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
          <div className="absolute bottom-3 left-3 text-primary-foreground text-xs font-semibold uppercase tracking-wider">Academy</div>
        </Card>
      </div>
    </div>
  );
};

const StatTile = ({ label, value }: { label: string; value: string }) => (
  <Card className="p-4 text-center shadow-soft">
    <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
  </Card>
);

/* ────────── SETUP ────────── */
const SetupScreen = ({
  course, courseId, setCourseId, players, setPlayers, frequent, onBack, onStart,
}: {
  course: ReturnType<typeof COURSES.find> & object;
  courseId: string;
  setCourseId: (id: string) => void;
  players: Player[];
  setPlayers: (p: Player[]) => void;
  frequent: Player[];
  onBack: () => void;
  onStart: () => void;
}) => {
  const slots = Array.from({ length: 4 });
  const addPlayer = (p: Player) => {
    if (players.length >= 4 || players.find((x) => x.id === p.id)) return;
    setPlayers([...players, p]);
  };
  const removePlayer = (id: string) => setPlayers(players.filter((p) => p.id !== id || (p as Player).isMe));

  return (
    <div className="space-y-5 animate-in slide-in-from-right duration-300">
      <button onClick={onBack} className="flex items-center gap-1 text-action font-bold text-lg">
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> PLAYER SETUP
      </button>

      {/* Course selector */}
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

      {/* Players */}
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
                <button className="flex items-center gap-1 text-action font-semibold text-sm" onClick={() => {
                  const next = frequent.find((f) => !players.find((pl) => pl.id === f.id));
                  if (next) addPlayer(next);
                  else toast.info("Нет доступных друзей — добавьте в Frequently played");
                }}>
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
                  <div className="text-xs text-muted-foreground">HCP {p.hcp} · 88%</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md border-2 border-action bg-warning/30" title="Yellow tee" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-warning grid place-items-center font-bold text-primary">
                    {p.hcp}
                  </div>
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

      {/* Frequent */}
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

      <div className="grid gap-3">
        <Button
          onClick={onStart}
          size="lg"
          className="h-14 bg-action hover:bg-action/90 text-action-foreground rounded-xl text-base font-semibold shadow-glow transition-spring"
        >
          Start Round · {course?.name}
        </Button>
        <Button variant="outline" className="h-12 rounded-xl">
          <Cog className="h-4 w-4 mr-2" /> Edit Round Settings
        </Button>
      </div>
    </div>
  );
};

/* ────────── PLAYING ────────── */
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

const RoundPlayer = ({ onExit }: { onExit: () => void }) => {
  const { activeRound, enterScore, finishRound, setRoundPhoto } = useGolf();
  const [holeIdx, setHoleIdx] = useState(0);
  const [sheetPlayer, setSheetPlayer] = useState<Player | null>(null);
  const [hole, setHole] = useState({ score: 4, putts: 0, driving: 0, gir: 0, penalties: 0 });
  const [completedRound, setCompletedRound] = useState<Round | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Экран подтверждения после 18 лунки
  if (showConfirmation && activeRound) {
    const confirmFinish = () => {
      const snapshot = activeRound;
      finishRound();
      setCompletedRound({ ...snapshot, completed: true });
      setShowConfirmation(false);
    };

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: "#0a0a0a", paddingTop: "max(env(safe-area-inset-top), 32px)", paddingBottom: "max(env(safe-area-inset-bottom), 28px)" }}
      >
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="text-center mb-6">
            <div className="text-white/60 text-sm uppercase tracking-wider mb-2">Подтвердите счет</div>
            <div className="text-white font-black text-3xl">Раунд завершен</div>
          </div>

          {/* Players scorecard summary */}
          <div className="space-y-4">
            {activeRound.players.map((p) => {
              const scores = activeRound.scores[p.id] ?? [];
              const total = scores.reduce((a, s) => a + s.score, 0);
              const vsPar = scores.reduce((a, s) => {
                const h = course.holes.find((h) => h.number === s.hole);
                return a + (s.score - (h?.par ?? 4));
              }, 0);
              const vsParText = vsPar === 0 ? "E" : vsPar > 0 ? `+${vsPar}` : `${vsPar}`;

              return (
                <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: "#1a1a1a" }}>
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} tone={p.isMe ? "orange" : "muted"} />
                      <div>
                        <div className="text-white font-bold">{p.name}</div>
                        <div className="text-white/50 text-sm">HCP {p.hcp}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-white tabular-nums">{total}</div>
                      <div className="text-sm font-bold" style={{ color: vsPar < 0 ? "#22c55e" : vsPar === 0 ? "rgba(255,255,255,0.6)" : "#f87171" }}>
                        {vsParText}
                      </div>
                    </div>
                  </div>

                  {/* All hole scores */}
                  <div className="grid grid-cols-9 gap-1 px-3 pb-3">
                    {scores.slice(0, 18).map((s) => {
                      const h = course.holes.find((hole) => hole.number === s.hole);
                      const diff = s.score - (h?.par ?? 4);
                      return (
                        <div
                          key={s.hole}
                          className="aspect-square rounded-lg flex flex-col items-center justify-center text-center"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          <div className="text-white/40 text-[10px] leading-none">Лунка {s.hole}</div>
                          <div className={cn("text-xl font-black leading-none mt-1", scoreLabelColor(s.score, h?.par ?? 4))}>
                            {s.score}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-5 pt-4 space-y-3">
          <button
            onClick={confirmFinish}
            className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-wider active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            style={{ background: "#22c55e", color: "#000" }}
          >
            <Check className="h-5 w-5" strokeWidth={3} />
            ЗАВЕРШИТЬ РАУНД
          </button>
          <button
            onClick={() => setShowConfirmation(false)}
            className="w-full h-12 rounded-2xl font-semibold text-sm"
            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
          >
            Редактировать счет
          </button>
        </div>
      </div>
    );
  }

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
              {completedRound.courseName.split(" · ")[0]}
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
      putts: existing?.putts ?? 0,
      driving: existing?.driving ?? 0,
      gir: existing?.gir ?? 0,
      penalties: existing?.penalties ?? 0,
    });
    setSheetPlayer(p);
  };

  const openNextPlayer = () => {
    const next = activeRound.players.find(
      (p) => !activeRound.scores[p.id]?.find((x) => x.hole === currentHole.number)
    ) ?? activeRound.players[0];
    openSheet(next);
  };

  const submit = () => {
    if (!sheetPlayer) return;
    enterScore(sheetPlayer.id, { hole: currentHole.number, ...hole });
    setSheetPlayer(null);
    toast.success(`Лунка ${currentHole.number}: ${hole.score}`);

    // Все остальные игроки уже ввели счёт
    const allOthersScored = activeRound.players
      .filter((p) => p.id !== sheetPlayer.id)
      .every((p) => !!activeRound.scores[p.id]?.find((x) => x.hole === currentHole.number));

    if (allOthersScored) {
      // Если это последняя лунка - показываем экран подтверждения
      if (holeIdx === totalHoles - 1) {
        setTimeout(() => setShowConfirmation(true), 600);
      } else {
        // Иначе переходим на следующую лунку
        setTimeout(() => setHoleIdx((h) => Math.min(totalHoles - 1, h + 1)), 600);
      }
    }
  };

  const handleFinish = () => {
    const snapshot = activeRound;
    finishRound();
    setCompletedRound({ ...snapshot, completed: true });
  };

  const total = (p: Player) =>
    activeRound.scores[p.id]?.reduce((a, s) => a + (s.score || 0), 0) ?? 0;
  const totalVsPar = (p: Player) => {
    const played = activeRound.scores[p.id] ?? [];
    return played.reduce((a, s) => {
      const h = course.holes.find((h) => h.number === s.hole);
      return a + (s.score - (h?.par ?? 0));
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0a0a0a" }}>

      {/* ── Top: hole navigation ── */}
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setHoleIdx(Math.max(0, holeIdx - 1))}
            disabled={holeIdx === 0}
            className="h-9 w-9 grid place-items-center disabled:opacity-20"
          >
            <ChevronLeft className="h-6 w-6 text-white" strokeWidth={2.5} />
          </button>
          <span className="text-white font-bold text-base tracking-wider min-w-[90px] text-center">
            Лунка {currentHole.number}
          </span>
          <button
            onClick={() => setHoleIdx(Math.min(totalHoles - 1, holeIdx + 1))}
            disabled={holeIdx === totalHoles - 1}
            className="h-9 w-9 grid place-items-center disabled:opacity-20"
          >
            <ChevronRight className="h-6 w-6 text-white" strokeWidth={2.5} />
          </button>
        </div>

        <button
          onClick={handleFinish}
          className="h-9 px-4 rounded-full font-bold text-xs tracking-wider"
          style={{ background: "rgba(255,255,255,0.1)", color: "#4ade80" }}
        >
          ФИНИШ
        </button>
      </div>

      {/* ── Main card (widget style) ── */}
      <div className="flex-1 flex flex-col justify-center px-5 pb-4 gap-4 overflow-y-auto">

        {/* Widget card */}
        <div className="rounded-3xl overflow-hidden" style={{ background: "#1a1a1a" }}>

          {/* Card header */}
          <div className="flex items-center gap-2 px-5 pt-5 pb-3">
            {/* Shield icon like Tag Golf */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6L12 2z"
                stroke="white" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
            </svg>
            <span className="text-white/70 font-semibold text-sm tracking-[0.15em]">GOLF</span>
          </div>

          {/* Par + HCP */}
          <div className="flex items-baseline gap-6 px-5 pb-4">
            <div>
              <span className="text-white font-black text-4xl tracking-tight">ПАР {currentHole.par}</span>
            </div>
            <div>
              <span className="text-white/50 font-bold text-2xl tracking-tight">ГКП {currentHole.hcp}</span>
            </div>
          </div>

          {/* ВВЕСТИ СЧЁТ button */}
          <div className="px-5 pb-4">
            <button
              onClick={openNextPlayer}
              className="w-full h-12 rounded-full font-black text-sm tracking-[0.15em] active:scale-[0.97] transition-transform"
              style={{ background: "#22c55e", color: "#000" }}
            >
              ВВЕСТИ СЧЁТ
            </button>
          </div>

          {/* Card footer: course + hole number */}
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
          const sign = tp === 0 ? "E" : tp > 0 ? `+${tp}` : `${tp}`;
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
                  <div className="text-white/50 text-sm">{sign} · {t} уд.</div>
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
                  : activeRound.players.some((p) =>
                      activeRound.scores[p.id]?.find((s) => s.hole === course.holes[i].number)
                    )
                  ? "rgba(255,255,255,0.35)"
                  : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Score Sheet ── */}
      {sheetPlayer && (
        <div className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-150">
          <button className="absolute inset-0 bg-black/70" onClick={() => setSheetPlayer(null)} />
          <div
            className="relative w-full rounded-t-3xl animate-in slide-in-from-bottom duration-250"
            style={{ background: "#1a1a1a", paddingBottom: `max(env(safe-area-inset-bottom), 24px)` }}
          >
            {/* drag handle */}
            <div className="mx-auto w-10 h-1 rounded-full mt-3 mb-1" style={{ background: "rgba(255,255,255,0.15)" }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-3">
                <Avatar name={sheetPlayer.name} tone={sheetPlayer.isMe ? "orange" : "muted"} />
                <div>
                  <div className="text-white font-bold">{sheetPlayer.name.split(" ")[0]}</div>
                  <div className="text-white/40 text-xs">Лунка {currentHole.number} · Пар {currentHole.par}</div>
                </div>
              </div>
              <button
                onClick={() => setSheetPlayer(null)}
                className="h-9 w-9 rounded-full grid place-items-center"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            <div className="px-5 pt-5 pb-2">
              {/* Score counter */}
              <div className="mb-4">
                <ScoreCounter
                  label="СЧЁТ"
                  value={hole.score}
                  onChange={(v) => setHole({ ...hole, score: v })}
                  sublabel={scoreLabel(hole.score, currentHole.par)}
                  sublabelColor={scoreLabelColor(hole.score, currentHole.par)}
                />
              </div>

              {/* Stats counters */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                <StatCounter label="PUTTS" value={hole.putts} onChange={(v) => setHole({ ...hole, putts: v })} />
                <StatCounter label="DRIVING" value={hole.driving} onChange={(v) => setHole({ ...hole, driving: v })} />
                <StatCounter label="GIR" value={hole.gir} onChange={(v) => setHole({ ...hole, gir: v })} />
                <StatCounter label="PENALTIES" value={hole.penalties} onChange={(v) => setHole({ ...hole, penalties: v })} />
              </div>

              {/* Save button */}
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

const ScoreCounter = ({
  label, value, onChange, sublabel, sublabelColor,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  sublabel?: string;
  sublabelColor?: string;
}) => (
  <div className="rounded-2xl flex flex-col items-center" style={{ background: "rgba(255,255,255,0.06)" }}>
    <div className="text-[10px] font-bold uppercase tracking-widest pt-3 pb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</div>
    <button
      onClick={() => onChange(value + 1)}
      className="w-full h-14 grid place-items-center rounded-xl transition-colors active:bg-white/10"
      style={{ color: "#22c55e" }}
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </button>
    <div className="text-4xl font-black tabular-nums text-white py-0.5">{value}</div>
    {sublabel
      ? <div className={cn("text-[11px] font-bold mb-0.5", sublabelColor)}>{sublabel}</div>
      : <div className="mb-0.5 h-4" />
    }
    <button
      onClick={() => onChange(Math.max(1, value - 1))}
      className="w-full h-14 grid place-items-center rounded-xl transition-colors active:bg-white/10"
      style={{ color: "#22c55e" }}
    >
      <span className="text-3xl leading-none font-bold">−</span>
    </button>
  </div>
);

const StatCounter = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <button
    onClick={() => onChange(value + 1)}
    onContextMenu={(e) => {
      e.preventDefault();
      onChange(Math.max(0, value - 1));
    }}
    className="flex flex-col items-center gap-1 py-3 rounded-xl transition-colors"
    style={value > 0
      ? { background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e", color: "#22c55e" }
      : { background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
    }
  >
    <div className="h-8 w-8 rounded-full grid place-items-center font-black text-lg" style={{ background: value > 0 ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)" }}>
      {value || "—"}
    </div>
    <div className="text-[9px] font-semibold leading-tight text-center px-1">{label}</div>
  </button>
);

export default PlayPage;
