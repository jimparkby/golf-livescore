import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/PlayerAvatar";
import { COURSES } from "@/lib/courses";
import { useGolf, type Player } from "@/store/golfStore";
import { ChevronLeft, ChevronRight, Plus, Cog, Sprout, X, CheckCircle2, Waves, ShieldAlert, Crosshair, Mountain, PlayCircle, Timer } from "lucide-react";
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
        <StatTile label="Лучший" value={String(Math.min(...rounds.map((r) => r.players[0] ? r.scores[r.players[0].id].reduce((a, s) => a + s.score, 0) : 999)))} />
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
    <div className="text-2xl font-bold text-primary tabular-nums">{value}</div>
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
const RoundPlayer = ({ onExit }: { onExit: () => void }) => {
  const { activeRound, enterScore, finishRound } = useGolf();
  const [holeIdx, setHoleIdx] = useState(0);
  const [sheetPlayer, setSheetPlayer] = useState<Player | null>(null);
  const [hole, setHole] = useState({ score: 4, putts: 2, fairwayBunker: false, greenSideBunker: false, hazard: false, outOfBounds: false });
  const [startTime] = useState(Date.now());
  const [tick, setTick] = useState(0);

  // ticking timer
  useState(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  });
  void tick;

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

  const elapsed = (Date.now() - startTime) / 1000;
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  };

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

  const submit = () => {
    if (!sheetPlayer) return;
    enterScore(sheetPlayer.id, { hole: currentHole.number, ...hole });
    setSheetPlayer(null);
    toast.success(`Лунка ${currentHole.number}: ${hole.score}`);
  };

  const handleFinish = () => {
    finishRound();
    toast.success("Раунд завершён!");
    onExit();
  };

  const total = (p: Player) =>
    activeRound.scores[p.id]?.reduce((a, s) => a + (s.score || 0), 0) ?? 0;
  const totalPar = (p: Player) => {
    const played = activeRound.scores[p.id] ?? [];
    return played.reduce((a, s) => {
      const h = course.holes.find((h) => h.number === s.hole);
      return a + (s.score - (h?.par ?? 0));
    }, 0);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Hole header */}
      <Card className="p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setHoleIdx(Math.max(0, holeIdx - 1))}
            disabled={holeIdx === 0}
            className="h-10 w-10 rounded-full bg-muted grid place-items-center disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <div className="flex items-baseline gap-2 justify-center">
              <Sprout className="h-5 w-5 text-accent" strokeWidth={2.5} />
              <div className="text-3xl font-bold tabular-nums">
                {currentHole.number}
                <sup className="text-xs ml-0.5">{["ST", "ND", "RD"][currentHole.number - 1] || "TH"}</sup>
              </div>
            </div>
            <div className="flex gap-3 justify-center text-xs text-muted-foreground mt-1 items-center">
              <span>Par {currentHole.par}</span>
              <span className="inline-flex items-center gap-1 text-warning"><Mountain className="h-3 w-3" /> {currentHole.yards} yds</span>
              <span className="inline-flex items-center gap-1"><Crosshair className="h-3 w-3" /> HCP {currentHole.hcp}</span>
            </div>
          </div>
          <button
            onClick={() => setHoleIdx(Math.min(17, holeIdx + 1))}
            disabled={holeIdx === 17}
            className="h-10 w-10 rounded-full bg-muted grid place-items-center disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> Hole {fmt(elapsed % 600)} · Round {fmt(elapsed)}</div>
          <button onClick={handleFinish} className="text-action font-semibold">Завершить</button>
        </div>
      </Card>

      {/* Players */}
      {activeRound.players.map((p) => {
        const t = total(p);
        const tp = totalPar(p);
        const sign = tp === 0 ? "E" : tp > 0 ? `+${tp}` : `${tp}`;
        const has = activeRound.scores[p.id]?.find((x) => x.hole === currentHole.number);
        return (
          <Card key={p.id} className="p-4 shadow-soft flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={p.name} tone={p.isMe ? "orange" : "muted"} />
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.name} <span className="text-muted-foreground">[{p.hcp}]</span></div>
                <div className="text-sm text-muted-foreground">{sign} ({t})</div>
              </div>
            </div>
            <button
              onClick={() => openSheet(p)}
              className={cn(
                "min-w-[88px] px-3 py-3 rounded-xl border-2 text-center transition-spring hover:scale-105",
                has ? "border-accent bg-accent-soft text-accent-foreground" : "border-border bg-card text-action",
              )}
            >
              {has ? (
                <>
                  <div className="text-2xl font-bold tabular-nums">{has.score}</div>
                  <div className="text-[10px] text-muted-foreground">{has.putts} putts</div>
                </>
              ) : (
                <>
                  <div className="text-[11px]">●</div>
                  <div className="font-semibold text-sm">Add Score</div>
                </>
              )}
            </button>
          </Card>
        );
      })}

      {/* Score Sheet */}
      {sheetPlayer && (
        <div className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-200">
          <button className="absolute inset-0 bg-primary/40" onClick={() => setSheetPlayer(null)} />
          <div className="relative w-full max-w-3xl mx-auto bg-card rounded-t-3xl shadow-elevated animate-in slide-in-from-bottom duration-300">
            <div className="mx-auto w-12 h-1.5 bg-border rounded-full mt-3" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Avatar name={sheetPlayer.name} tone={sheetPlayer.isMe ? "orange" : "muted"} />
                  <div>
                    <div className="font-semibold">{sheetPlayer.name.split(" ")[0]} <span className="text-muted-foreground text-sm">[{sheetPlayer.hcp}]</span></div>
                    <div className="text-xs text-muted-foreground">Лунка {currentHole.number} · Par {currentHole.par}</div>
                  </div>
                </div>
                <Button onClick={submit} className="h-12 px-7 bg-action hover:bg-action/90 text-action-foreground rounded-xl font-semibold">
                  Enter
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-5">
                <Counter label="Score" value={hole.score} onChange={(v) => setHole({ ...hole, score: v })} />
                <Counter label="Putts" value={hole.putts} onChange={(v) => setHole({ ...hole, putts: v })} />
              </div>

              <div className="border-t border-border pt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-center text-sm font-semibold mb-2">Bunkers</div>
                    <div className="flex justify-center gap-3">
                      <Toggle icon={<Mountain className="h-4 w-4" />} label="Fairway" active={hole.fairwayBunker} onClick={() => setHole({ ...hole, fairwayBunker: !hole.fairwayBunker })} />
                      <Toggle icon={<Mountain className="h-4 w-4" />} label="Green Side" active={hole.greenSideBunker} onClick={() => setHole({ ...hole, greenSideBunker: !hole.greenSideBunker })} />
                    </div>
                  </div>
                  <div>
                    <div className="text-center text-sm font-semibold mb-2">Penalties</div>
                    <div className="flex justify-center gap-3">
                      <Toggle icon={<Waves className="h-4 w-4" />} label="Hazard" active={hole.hazard} onClick={() => setHole({ ...hole, hazard: !hole.hazard })} />
                      <Toggle icon={<ShieldAlert className="h-4 w-4" />} label="OB" active={hole.outOfBounds} onClick={() => setHole({ ...hole, outOfBounds: !hole.outOfBounds })} />
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={() => setSheetPlayer(null)} className="block mx-auto mt-5 text-sm text-muted-foreground">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {holeIdx === 17 && (
        <Button onClick={handleFinish} size="lg" className="w-full h-14 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-glow">
          <CheckCircle2 className="h-5 w-5 mr-2" /> Завершить раунд
        </Button>
      )}
    </div>
  );
};

const Counter = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div className="text-center">
    <div className="text-sm font-semibold mb-2">{label}</div>
    <div className="inline-flex flex-col bg-action/10 rounded-2xl">
      <button onClick={() => onChange(value + 1)} className="h-11 w-20 grid place-items-center text-action font-bold hover:bg-action/15 rounded-t-2xl transition-base">
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>
      <div className="text-3xl font-bold tabular-nums py-1 text-primary">{value}</div>
      <button onClick={() => onChange(Math.max(1, value - 1))} className="h-11 w-20 grid place-items-center text-action font-bold hover:bg-action/15 rounded-b-2xl transition-base">
        <span className="text-2xl leading-none">−</span>
      </button>
    </div>
  </div>
);

const Toggle = ({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-base min-w-[72px]",
      active ? "border-action bg-action/10 text-action" : "border-border text-muted-foreground hover:border-muted-foreground/40",
    )}
  >
    <div className={cn("h-9 w-9 rounded-full grid place-items-center", active ? "bg-action/20" : "bg-muted")}>
      {icon}
    </div>
    <div className="text-[10px] font-medium">{label}</div>
  </button>
);

export default PlayPage;
