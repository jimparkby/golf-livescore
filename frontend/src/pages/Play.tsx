import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/PlayerAvatar";
import { COURSES, TEE_CONFIG, type TeeColor } from "@/lib/courses";
import { useGolf, type Player, type Round, type HolesMode } from "@/store/golfStore";
import { calcCourseHcpForMode, holeRankInSet, holeStrokesInSet } from "@/lib/handicap";
import { compressImage } from "@/lib/imageUtils";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus, X, PlayCircle, Flag, Camera, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import heroImg from "@/assets/golfminsk/hero.jpg";
import photo1 from "@/assets/golfminsk/photo1.jpg";
import photo2 from "@/assets/golfminsk/photo2.jpg";

type Step = "home" | "setup" | "playing";

const PlayPage = () => {
  // ── All hooks must come before any conditional returns ────────────────────
  const [confirmId, setConfirmId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('confirm')
  );
  const { profile, frequent, activeRound, startRound, cancelActiveRound, loadRounds } = useGolf();
  const [step, setStep] = useState<Step>(activeRound ? "playing" : "home");
  const initialHadRound = useRef(!!activeRound);
  const [courseId, setCourseId] = useState<string>(COURSES[0].id);
  const [players, setPlayers] = useState<Player[]>([
    { id: "me", name: `${profile.firstName} ${profile.lastName}`, initials: profile.initials, hcp: profile.hcp, tee: profile.defaultTee ?? "yellow", isMe: true },
  ]);

  useEffect(() => {
    if (confirmId) window.history.replaceState({}, '', window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When activeRound loads from DB (localStorage was cleared by Telegram), auto-navigate
  useEffect(() => {
    if (activeRound && step === "home" && !initialHadRound.current) {
      setStep("playing");
    }
  }, [activeRound]);

  const course = COURSES.find((c) => c.id === courseId)!;

  // ── Conditional renders (after all hooks) ────────────────────────────────
  if (confirmId) {
    return (
      <ScorecardConfirmModal
        pendingId={confirmId}
        onDone={() => { loadRounds(); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    );
  }

  if (step === "playing") return <RoundPlayer onExit={() => { cancelActiveRound(); setStep("home"); }} onCancel={() => setStep("home")} />;
  if (activeRound && step === "home") return (
    <HomeScreen onStart={(id) => { if (id) setCourseId(id); setStep("setup"); }} activeRound={activeRound} onResume={() => setStep("playing")} onAbandon={() => { cancelActiveRound(); }} />
  );

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
        onStart={(mode) => {
          startRound(course, players, undefined, undefined, mode);
          setStep("playing");
        }}
      />
    );
  }

  return (
    <HomeScreen
      onStart={(id?: string) => {
        if (id) setCourseId(id);
        setStep("setup");
      }}
    />
  );

};

/* ────────── HOME ────────── */
const HomeScreen = ({ onStart, activeRound, onResume, onAbandon }: {
  onStart: (courseId?: string) => void;
  activeRound?: import("@/store/golfStore").Round | null;
  onResume?: () => void;
  onAbandon?: () => void;
}) => {
  const { rounds, profile } = useGolf();
  const last = rounds[0];
  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {activeRound && onResume && (
        <Card className="p-4 shadow-elevated" style={{ border: "1.5px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.06)" }}>
          <div className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: "#22c55e" }}>
            Unfinished round
          </div>
          <div className="font-semibold text-foreground mb-1">{activeRound.courseName.split(" · ")[0]}</div>
          <div className="text-sm text-muted-foreground mb-3">
            {Object.values(activeRound.scores).flat().filter(s => s.score > 0).length > 0
              ? `Holes played: ${Math.max(...Object.values(activeRound.scores).flat().map(s => s.hole), 0)}`
              : "Round started, no scores entered"}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onResume}
              className="flex-1 h-10 rounded-xl font-bold text-sm"
              style={{ background: "#22c55e", color: "#000" }}
            >
              Resume
            </button>
            <button
              onClick={onAbandon}
              className="h-10 px-4 rounded-xl font-bold text-sm"
              style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1.5px solid rgba(239,68,68,0.25)" }}
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden border-0 shadow-elevated">
        <div className="relative h-44">
          <img src={heroImg} alt="Golf Club Minsk Course" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />
          <div className="absolute inset-0 p-5 flex flex-col justify-end text-primary-foreground">
            <div className="text-xs uppercase tracking-[0.2em] opacity-80">Golf Club Minsk</div>
            <div className="text-2xl font-bold mt-1">Ready to play?</div>
          </div>
        </div>
        <div className="p-5 bg-card">
          <Button
            onClick={() => onStart()}
            size="lg"
            className="w-full h-14 text-base font-semibold bg-action hover:bg-action/90 text-action-foreground rounded-xl shadow-glow transition-spring hover:scale-[1.01]"
          >
            <PlayCircle className="h-5 w-5 mr-2" strokeWidth={2.5} /> Start Round
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="HCP" value={String(profile.hcp)} />
        <StatTile label="Rounds" value={String(rounds.length)} />
        <StatTile label="Best" value={rounds.length === 0 ? "—" : String(Math.min(...rounds.map((r) => r.players[0] ? (r.scores[r.players[0].id] ?? []).reduce((a, s) => a + s.score, 0) : 999)))} />
      </div>

      {last && (
        <Card className="p-5 shadow-soft">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Last Round</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{last.courseName}</div>
              <div className="text-sm text-muted-foreground">{last.tee} · {last.rating} / {last.slope}%</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-action tabular-nums">
                {last.players[0] ? (last.scores[last.players[0].id] ?? []).reduce((a, s) => a + s.score, 0) : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground">{new Date(last.date).toLocaleDateString("en-US")}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onStart("championship")}
          className="overflow-hidden rounded-xl shadow-soft aspect-[4/3] relative group focus:outline-none active:scale-[0.97] transition-transform"
        >
          <img src={photo1} alt="Golf Club Minsk — Fairway" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-spring group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-between p-3">
            <div className="self-end opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="h-7 w-7 rounded-full bg-action/90 grid place-items-center">
                <PlayCircle className="h-4 w-4 text-action-foreground" strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-left">
              <div className="text-primary-foreground text-xs font-semibold uppercase tracking-wider">Championship</div>
              <div className="text-primary-foreground/60 text-[10px] mt-0.5">18 holes · Par 72</div>
            </div>
          </div>
        </button>
        <button
          onClick={() => onStart("academy")}
          className="overflow-hidden rounded-xl shadow-soft aspect-[4/3] relative group focus:outline-none active:scale-[0.97] transition-transform"
        >
          <img src={photo2} alt="Golf Club Minsk — Green" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-spring group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-between p-3">
            <div className="self-end opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="h-7 w-7 rounded-full bg-action/90 grid place-items-center">
                <PlayCircle className="h-4 w-4 text-action-foreground" strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-left">
              <div className="text-primary-foreground text-xs font-semibold uppercase tracking-wider">Academy</div>
              <div className="text-primary-foreground/60 text-[10px] mt-0.5">9 holes · Par 27</div>
            </div>
          </div>
        </button>
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
  onStart: (mode: HolesMode) => void;
}) => {
  const { addFrequent } = useGolf();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [teePickerFor, setTeePickerFor] = useState<string | null>(null);
  const [holesMode, setHolesMode] = useState<HolesMode>("18");
  const is9Hole = holesMode !== "18";
  const slots = Array.from({ length: 4 });

  const updatePlayerTee = (playerId: string, tee: TeeColor) => {
    setPlayers(players.map((p) => (p.id === playerId ? { ...p, tee } : p)));
    setTeePickerFor(null);
  };

  const addPlayer = (p: Player) => {
    if (players.length >= 4 || players.find((x) => x.id === p.id)) return;
    setPlayers([...players, p]);
    addFrequent(p);
  };
  const removePlayer = (id: string) => setPlayers(players.filter((p) => p.id !== id || (p as Player).isMe));

  return (
    <>
      <div className="space-y-5 animate-in slide-in-from-right duration-300">
        <button onClick={onBack} className="flex items-center gap-1 text-action font-bold text-lg">
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> PLAYER SETUP
        </button>

        {/* Course selector */}
        <Card className="p-4 shadow-soft">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Course</div>
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
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {c.tees.find(t => t.color === "yellow")?.totalMeters ?? c.tees[0]?.totalMeters ?? ""}m · Par {c.totalPar}
                </div>
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
                  <button
                    className="flex items-center gap-1 text-action font-semibold text-sm"
                    onClick={() => setShowAddSheet(true)}
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
                    {(() => {
                      const teeInfo = course?.tees.find(t => t.color === (p.tee ?? "yellow")) ?? course?.tees[0]
                      const ch = teeInfo ? calcCourseHcpForMode(p.hcp, teeInfo.slope, teeInfo.rating, course!.totalPar, holesMode) : p.hcp
                      return <div className="text-xs text-muted-foreground">HCP {p.hcp} · CH {ch}</div>
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTeePickerFor(p.id)}
                    className="w-10 h-10 rounded-md border-2 transition-base"
                    style={{
                      background: TEE_CONFIG[p.tee ?? "yellow"].cssColor,
                      borderColor: TEE_CONFIG[p.tee ?? "yellow"].border,
                    }}
                    title={TEE_CONFIG[p.tee ?? "yellow"].label}
                  />
                  <div className="relative">
                    {(() => {
                      const teeInfo = course?.tees.find(t => t.color === (p.tee ?? "yellow")) ?? course?.tees[0]
                      const ch = teeInfo ? calcCourseHcpForMode(p.hcp, teeInfo.slope, teeInfo.rating, course!.totalPar, holesMode) : Math.round(p.hcp)
                      return (
                        <div className="h-12 w-12 rounded-full bg-warning grid place-items-center font-bold text-primary">
                          {ch}
                        </div>
                      )
                    })()}
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

        {/* Round format */}
        <Card className="p-4 shadow-soft">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Round</div>
          <div className="grid grid-cols-3 gap-2">
            {(["18", "front9", "back9"] as HolesMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setHolesMode(m)}
                className={cn(
                  "py-3 rounded-xl border-2 text-sm font-semibold transition-base",
                  holesMode === m
                    ? "border-action bg-action/10 text-action"
                    : "border-border text-muted-foreground hover:border-muted-foreground/30",
                )}
              >
                {m === "18" ? "18 Holes" : m === "front9" ? "Front 9" : "Back 9"}
              </button>
            ))}
          </div>
        </Card>

        <Button
          onClick={() => onStart(holesMode)}
          size="lg"
          className="h-14 bg-action hover:bg-action/90 text-action-foreground rounded-xl text-base font-semibold shadow-glow transition-spring"
        >
          Start Round · {course?.name}
        </Button>
      </div>

      {showAddSheet && (
        <AddPlayerSheet
          players={players}
          frequent={frequent}
          onAdd={(p) => { addPlayer(p); setShowAddSheet(false); }}
          onClose={() => setShowAddSheet(false)}
        />
      )}

      {teePickerFor && (
        <TeePickerSheet
          course={course!}
          currentTee={players.find(p => p.id === teePickerFor)?.tee ?? "yellow"}
          onSelect={(tee) => updatePlayerTee(teePickerFor, tee)}
          onClose={() => setTeePickerFor(null)}
        />
      )}
    </>
  );
};

/* ────────── TEE PICKER SHEET ────────── */
const TeePickerSheet = ({
  course,
  currentTee,
  onSelect,
  onClose,
}: {
  course: import("@/lib/courses").Course;
  currentTee: TeeColor;
  onSelect: (tee: TeeColor) => void;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-150">
    <button className="absolute inset-0 bg-black/70" onClick={onClose} />
    <div
      className="relative w-full rounded-t-3xl animate-in slide-in-from-bottom duration-250"
      style={{ background: "#1c1c1e", paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
    >
      <div className="mx-auto w-10 h-1 rounded-full mt-3 mb-4" style={{ background: "rgba(255,255,255,0.15)" }} />
      <div className="flex items-center justify-between px-5 pb-4">
        <div className="text-white font-bold text-lg">Select Tee</div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full grid place-items-center"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      <div className="px-4 pb-4 space-y-2">
        {course.tees.map((t) => (
          <button
            key={t.color}
            onClick={() => onSelect(t.color)}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl active:scale-[0.98] transition-transform"
            style={{
              background: currentTee === t.color ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
              border: currentTee === t.color ? "2px solid rgba(255,255,255,0.25)" : "2px solid transparent",
            }}
          >
            <div
              className="w-10 h-10 rounded-md shrink-0 border-2"
              style={{ background: t.cssColor, borderColor: TEE_CONFIG[t.color].border }}
            />
            <div className="text-left flex-1">
              <div className="text-white font-bold">{t.label}</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {t.totalMeters}m · CR {t.rating} / Slope {t.slope}
              </div>
            </div>
            {currentTee === t.color && <Check className="h-5 w-5" style={{ color: "#22c55e" }} strokeWidth={3} />}
          </button>
        ))}
      </div>
    </div>
  </div>
);

/* ────────── ADD PLAYER SHEET ────────── */
type UserResult = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  hcp: number | null;
};

const mkPlayerName = (u: UserResult) =>
  [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "Player";

const mkInitials = (name: string) =>
  name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const AddPlayerSheet = ({
  players,
  frequent,
  onAdd,
  onClose,
}: {
  players: Player[];
  frequent: Player[];
  onAdd: (p: Player) => void;
  onClose: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<UserResult[]>(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data.map((u) => ({
          id: u.id,
          name: mkPlayerName(u),
          initials: mkInitials(mkPlayerName(u)),
          hcp: u.hcp ?? 0,
        })));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const alreadyAdded = (id: string) => !!players.find((p) => p.id === id);
  const isSearching = query.trim().length >= 2;
  const list = isSearching ? results : frequent.filter((f) => !alreadyAdded(f.id));

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-150">
      <button className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full rounded-t-3xl animate-in slide-in-from-bottom duration-250 flex flex-col"
        style={{ background: "#1c1c1e", maxHeight: "80vh", paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
      >
        <div className="mx-auto w-10 h-1 rounded-full mt-3 mb-4" style={{ background: "rgba(255,255,255,0.15)" }} />

        <div className="flex items-center justify-between px-5 pb-3">
          <div className="text-white font-bold text-lg">Add Player</div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full grid place-items-center"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="px-5 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
            <input
              type="text"
              autoFocus
              placeholder="Search by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-11 rounded-xl pl-10 pr-4 text-white text-sm outline-none placeholder:text-white/30"
              style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.1)" }}
            />
          </div>
        </div>

        <div className="px-5 pb-2">
          <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
            {isSearching
              ? loading ? "Searching..." : `Results (${results.length})`
              : "Frequently played"}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-3 pb-2">
          {!loading && list.length === 0 ? (
            <div className="text-center py-10 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              {isSearching ? "No results found" : "No frequent players"}
            </div>
          ) : (
            list.map((p) => (
              <button
                key={p.id}
                disabled={alreadyAdded(p.id)}
                onClick={() => onAdd(p)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 active:scale-[0.98] transition-transform disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <Avatar name={p.name} tone="muted" />
                <div className="text-left flex-1 min-w-0">
                  <div className="text-white font-semibold truncate">{p.name}</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>HCP {p.hcp}</div>
                </div>
                {alreadyAdded(p.id)
                  ? <div className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>Added</div>
                  : <div className="text-sm font-semibold" style={{ color: "#22c55e" }}>+ Add</div>
                }
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ────────── PLAYING ────────── */
const scoreLabel = (score: number, par: number) => {
  const d = score - par;
  if (d <= -2) return "Eagle";
  if (d === -1) return "Birdie";
  if (d === 0) return "Par";
  if (d === 1) return "Bogey";
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

const RoundPlayer = ({ onExit, onCancel }: { onExit: () => void; onCancel: () => void }) => {
  const { activeRound, enterScore, finishRound, setRoundPhoto, syncRound, setCurrentHole } = useGolf();

  // Compute play holes before useState so initializer can use them
  const _course = COURSES.find(c => c.id === activeRound?.courseId) ?? COURSES[0];
  const _mode = activeRound?.holesMode ?? "18";
  const playHoles = _mode === "front9"
    ? _course.holes.filter(h => h.number <= 9)
    : _mode === "back9"
    ? _course.holes.filter(h => h.number > 9)
    : _course.holes;

  // Course Handicap for a player (based on their tee and holes mode)
  const getCh = (p: Player) => {
    const teeInfo = _course.tees.find(t => t.color === (p.tee ?? "yellow")) ?? _course.tees[0]
    return calcCourseHcpForMode(p.hcp, teeInfo.slope, teeInfo.rating, _course.totalPar, _mode)
  }

  // Strokes received/given on a specific hole for a player
  const getHoleStrokes = (p: Player, h: typeof _course.holes[0]) => {
    const rank = holeRankInSet(h, playHoles)
    return holeStrokesInSet(getCh(p), rank, playHoles.length)
  }

  // Running net vs par (gross - strokes - par per each played hole)
  const calcNetVsPar = (p: Player) =>
    (activeRound?.scores[p.id] ?? []).reduce((acc, s) => {
      const h = playHoles.find(h => h.number === s.hole)
      if (!h) return acc
      return acc + s.score - getHoleStrokes(p, h) - h.par
    }, 0)

  const [holeIdx, setHoleIdx] = useState(() => {
    if (!activeRound) return 0;
    if (activeRound.currentHoleIndex != null) {
      const idx = activeRound.currentHoleIndex;
      if (idx >= 0 && idx < playHoles.length) return idx;
    }
    const firstUnscored = playHoles.findIndex(h =>
      !activeRound.players.every(p =>
        activeRound.scores[p.id]?.some(s => s.hole === h.number)
      )
    );
    return firstUnscored >= 0 ? firstUnscored : playHoles.length - 1;
  });

  // Persist current hole to store → saved to DB on visibilitychange (Telegram close)
  useEffect(() => {
    setCurrentHole(holeIdx);
  }, [holeIdx]);

  const [sheetPlayer, setSheetPlayer] = useState<Player | null>(null);
  const [hole, setHole] = useState({ score: 4, putts: 2, driving: false, gir: false, bunker: 0, penalties: 0 });
  const [completedRound, setCompletedRound] = useState<Round | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
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
        style={{ background: "#0a0a0a" }}
      >
        <div className="shrink-0 flex items-end justify-center" style={{ height: "calc(var(--header-h) + var(--tg-safe-top) + var(--tg-close-btn))", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "10px" }}>
          <span className="text-white font-bold tracking-[0.18em] text-base">GOLF</span>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="text-center mb-6">
            <div className="text-white/60 text-sm uppercase tracking-wider mb-2">Confirm Score</div>
            <div className="text-white font-black text-3xl">Round Complete</div>
          </div>

          {/* Players scorecard summary */}
          <div className="space-y-4">
            {activeRound.players.map((p) => {
              const scores = activeRound.scores[p.id] ?? [];
              const total = scores.reduce((a, s) => a + s.score, 0);
              const vsPar = scores.reduce((a, s) => {
                const h = _course.holes.find((h) => h.number === s.hole);
                return a + (s.score - (h?.par ?? 4));
              }, 0);
              const vsParText = vsPar === 0 ? "E" : vsPar > 0 ? `+${vsPar}` : `${vsPar}`;
              const ch = getCh(p);
              const netVsParVal = vsPar - ch;
              const netVsParText = netVsParVal === 0 ? "E" : netVsParVal > 0 ? `+${netVsParVal}` : `${netVsParVal}`;
              return (
                <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: "#1a1a1a" }}>
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} tone={p.isMe ? "orange" : "muted"} />
                      <div>
                        <div className="text-white font-bold">{p.name}</div>
                        <div className="text-white/50 text-sm">HCP {p.hcp} · CH {ch}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-white tabular-nums">{total}</div>
                      <div className="text-sm font-bold" style={{ color: vsPar < 0 ? "#22c55e" : vsPar === 0 ? "rgba(255,255,255,0.6)" : "#f87171" }}>
                        {vsParText}
                      </div>
                      <div className="text-xs font-semibold" style={{ color: netVsParVal < 0 ? "#22c55e" : netVsParVal === 0 ? "rgba(255,255,255,0.4)" : "#fbbf24" }}>
                        Net {netVsParText}
                      </div>
                    </div>
                  </div>

                  {/* All hole scores */}
                  <div className="grid grid-cols-9 gap-1 px-3 pb-3">
                    {scores.slice(0, 18).map((s) => {
                      const h = _course.holes.find((hole) => hole.number === s.hole);
                      return (
                        <div
                          key={s.hole}
                          className="aspect-square rounded-lg flex flex-col items-center justify-center text-center"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          <div className="text-white/40 text-[10px] leading-none">Hole {s.hole}</div>
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
            FINISH ROUND
          </button>
          <button
            onClick={() => setShowConfirmation(false)}
            className="w-full h-12 rounded-2xl font-semibold text-sm"
            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
          >
            Edit Score
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
      toast.success("Photo added!");
      e.target.value = "";
    };

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: "#0a0a0a" }}
      >
        <div className="shrink-0 flex items-end justify-center" style={{ height: "calc(var(--header-h) + var(--tg-safe-top) + var(--tg-close-btn))", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "10px" }}>
          <span className="text-white font-bold tracking-[0.18em] text-base">GOLF</span>
        </div>
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
              Round Complete
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
                <Camera className="h-4 w-4" /> Replace Photo
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
                Add Round Photo
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
            DONE
          </button>
        </div>
      </div>
    );
  }

  if (!activeRound) {
    return (
      <Card className="p-8 text-center">
        <div className="text-muted-foreground mb-4">No active round</div>
        <Button onClick={onExit}>Back</Button>
      </Card>
    );
  }

  const course = _course;
  const currentHole = playHoles[holeIdx] ?? playHoles[0];
  const totalHoles = playHoles.length;
  const mePlayer = activeRound.players.find((p) => p.isMe);

  const openSheet = (p: Player) => {
    const existing = activeRound.scores[p.id]?.find((x) => x.hole === currentHole.number);
    setHole({
      score: currentHole.par,
      putts: existing?.putts ?? 2,
      driving: existing?.driving ?? false,
      gir: existing?.gir ?? false,
      bunker: existing?.bunker ?? 0,
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

    const allOthersScored = activeRound.players
      .filter((p) => p.id !== sheetPlayer.id)
      .every((p) => !!activeRound.scores[p.id]?.find((x) => x.hole === currentHole.number));

    if (allOthersScored) {
      // Build updated scores including the score just entered (state not yet updated)
      const updatedScores = {
        ...activeRound.scores,
        [sheetPlayer.id]: [
          ...(activeRound.scores[sheetPlayer.id]?.filter((x) => x.hole !== currentHole.number) ?? []),
          { hole: currentHole.number, ...hole },
        ],
      };

      // Round is complete only when ALL play holes have scores for ALL players
      const allHolesScored = playHoles.every((h) =>
        activeRound.players.every((p) => updatedScores[p.id]?.some((s) => s.hole === h.number))
      );

      if (allHolesScored) {
        setTimeout(() => setShowConfirmation(true), 600);
      } else if (holeIdx === totalHoles - 1) {
        // Last index but not all holes done — wrap to first unscored hole
        const nextIdx = playHoles.findIndex((h) =>
          !activeRound.players.every((p) => updatedScores[p.id]?.some((s) => s.hole === h.number))
        );
        if (nextIdx >= 0) setTimeout(() => setHoleIdx(nextIdx), 600);
      } else {
        setTimeout(() => setHoleIdx((h) => Math.min(totalHoles - 1, h + 1)), 600);
      }
    }
  };

  const handleFinish = () => {
    const snapshot = activeRound;
    finishRound();
    setCompletedRound({ ...snapshot!, completed: true });
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

      {/* ── GILDA-style header ── */}
      <div
        className="shrink-0 flex items-end justify-center"
        style={{
          height: "calc(var(--header-h) + var(--tg-safe-top) + var(--tg-close-btn))",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          paddingBottom: "10px",
        }}
      >
        <span className="text-white font-bold tracking-[0.18em] text-base">GOLF</span>
      </div>

      {/* ── Hole navigation (fully below Telegram bar) ── */}
      <div
        className="flex items-center justify-between px-5 shrink-0"
        style={{ paddingTop: 14, paddingBottom: 10 }}
      >
        <button
          onClick={() => setShowExitConfirm(true)}
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
            Hole {currentHole.number}
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
          FINISH
        </button>
      </div>

      {/* ── Main card (widget style) ── */}
      <div className="flex-1 flex flex-col justify-center px-5 pb-4 gap-4 overflow-y-auto">

        {/* Widget card */}
        <div className="rounded-3xl overflow-hidden" style={{ background: "#1a1a1a" }}>

          {/* Card header */}
          <div className="flex items-center gap-2 px-5 pt-5 pb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6L12 2z"
                stroke="white" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
            </svg>
            <span className="text-white/70 font-semibold text-sm tracking-[0.15em]">GOLF</span>
          </div>

          {/* Par + HCP */}
          <div className="flex items-baseline gap-6 px-5 pb-4">
            <div>
              <span className="text-white font-black text-4xl tracking-tight">PAR {currentHole.par}</span>
            </div>
            <div>
              <span className="text-white/50 font-bold text-2xl tracking-tight">HCP {currentHole.hcp}</span>
            </div>
          </div>

          {/* ВВЕСТИ СЧЁТ button */}
          <div className="px-5 pb-4">
            <button
              onClick={openNextPlayer}
              className="w-full h-12 rounded-full font-black text-sm tracking-[0.15em] active:scale-[0.97] transition-transform"
              style={{ background: "#22c55e", color: "#000" }}
            >
              ENTER SCORE
            </button>
          </div>

          {/* Card footer: course + hole number */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ background: "rgba(255,255,255,0.05)", borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div>
              <div className="text-white/80 text-sm font-semibold">{course.club}</div>
              <div className="text-white/40 text-xs">{course.name} · {currentHole.meters[mePlayer?.tee ?? "yellow"]} m</div>
            </div>
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5" style={{ color: "#22c55e" }} />
              <span className="text-white font-black text-2xl tabular-nums">{currentHole.number}</span>
            </div>
          </div>
        </div>

        {/* Player score cards */}
        {activeRound.players.map((p) => {
          const tp = totalVsPar(p);
          const sign = tp === 0 ? "E" : tp > 0 ? `+${tp}` : `${tp}`;
          const np = calcNetVsPar(p);
          const netSign = np === 0 ? "E" : np > 0 ? `+${np}` : `${np}`;
          const pCh = getCh(p);
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
                    <span className="text-white/40 text-sm font-normal ml-1">CH {pCh}</span>
                  </div>
                  <div className="text-white/50 text-sm">{sign} · Net {netSign}</div>
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
          {playHoles.map((h, i) => (
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
                      activeRound.scores[p.id]?.find((s) => s.hole === h.number)
                    )
                  ? "rgba(255,255,255,0.35)"
                  : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Exit confirmation ── */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 animate-in fade-in duration-150" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full rounded-3xl p-6 space-y-4" style={{ background: "#1a1a1a" }}>
            <div className="text-center">
              <div className="text-white font-black text-xl mb-1">Leave round?</div>
              <div className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Round saved — come back anytime and continue where you left off
              </div>
            </div>
            <button
              onClick={() => {
                setShowExitConfirm(false);
                if (activeRound) syncRound(activeRound).catch(() => {});
                onCancel();
              }}
              className="w-full h-13 rounded-2xl font-bold text-sm py-4"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
            >
              Minimize — continue later
            </button>
            <button
              onClick={() => { setShowExitConfirm(false); onExit(); }}
              className="w-full h-13 rounded-2xl font-bold text-sm py-4"
              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1.5px solid rgba(239,68,68,0.3)" }}
            >
              Cancel round
            </button>
          </div>
        </div>
      )}

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
                  <div className="text-white/40 text-xs">
                    Hole {currentHole.number} · Par {currentHole.par}
                    {(() => { const s = getHoleStrokes(sheetPlayer, currentHole); return s !== 0 ? <span style={{ color: s > 0 ? "#22c55e" : "#f87171" }}> · {s > 0 ? `+${s}` : s} stroke</span> : null })()}
                  </div>
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
              {/* Score + Putts counters */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <ScoreCounter
                  label="SCORE"
                  value={hole.score}
                  onChange={(v) => setHole({ ...hole, score: v })}
                  sublabel={scoreLabel(hole.score, currentHole.par)}
                  sublabelColor={scoreLabelColor(hole.score, currentHole.par)}
                />
                <ScoreCounter
                  label="PUTTS"
                  value={hole.putts}
                  onChange={(v) => setHole((h) => ({ ...h, putts: v, score: Math.max(1, h.score + (v - h.putts)) }))}
                />
              </div>

              {/* Stats toggles and counters */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                <StatToggle label="FIR" active={hole.driving} onClick={() => setHole({ ...hole, driving: !hole.driving })} />
                <StatToggle label="GIR" active={hole.gir} onClick={() => setHole({ ...hole, gir: !hole.gir })} />
                <StatCounter label="BUNKER" value={hole.bunker} onChange={(v) => setHole((h) => ({ ...h, bunker: v, score: Math.max(1, h.score + (v - h.bunker)) }))} />
                <StatCounter label="PENALTIES" value={hole.penalties} onChange={(v) => setHole((h) => ({ ...h, penalties: v, score: Math.max(1, h.score + (v - h.penalties)) }))} />
              </div>

              {/* Save button */}
              <button
                onClick={submit}
                className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-wider active:scale-[0.98] transition-transform"
                style={{ background: "#22c55e", color: "#000" }}
              >
                SAVE
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

/* ────────── SCORECARD CONFIRM MODAL ────────── */
type PendingScore = { hole: number; score: number };

const ScorecardConfirmModal = ({
  pendingId,
  onDone,
  onCancel,
}: {
  pendingId: string;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const { profile } = useGolf();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<PendingScore[]>([]);
  const [courseId, setCourseId] = useState<string>(COURSES[0].id);
  const [tee, setTee] = useState<TeeColor>("yellow");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    api
      .get<{ id: string; scores: PendingScore[]; courseName: string | null; holesCount: number }>(
        `/api/scorecards/${pendingId}`
      )
      .then((data) => {
        const sorted = [...data.scores].sort((a, b) => a.hole - b.hole);
        setScores(sorted);
        if (data.courseName) {
          const match = COURSES.find(
            (c) =>
              c.name.toLowerCase().includes(data.courseName!.toLowerCase()) ||
              data.courseName!.toLowerCase().includes(c.name.toLowerCase())
          );
          if (match) setCourseId(match.id);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "Scorecard not found");
        setLoading(false);
      });
  }, [pendingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateScore = (hole: number, val: number) =>
    setScores((prev) => prev.map((s) => (s.hole === hole ? { ...s, score: val } : s)));

  const course = COURSES.find((c) => c.id === courseId)!;
  const teeInfo = course.tees.find((t) => t.color === tee) ?? course.tees[0];
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);

  const determineHolesMode = (): HolesMode => {
    if (scores.length > 9) return "18";
    const max = Math.max(...scores.map((s) => s.hole));
    return max <= 9 ? "front9" : "back9";
  };

  const confirm = async () => {
    if (!scores.length) return;
    setConfirming(true);
    try {
      const playerName =
        `${profile.firstName} ${profile.lastName}`.trim() || profile.username || "Me";
      const round: Round = {
        id: `r-${Date.now()}`,
        date: new Date(date + "T12:00:00").toISOString(),
        courseId,
        courseName: `${course.name} · ${course.club}`,
        tee: teeInfo.label,
        rating: teeInfo.rating,
        slope: teeInfo.slope,
        players: [
          {
            id: "me",
            name: playerName,
            initials: profile.initials || playerName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
            hcp: profile.hcp,
            isMe: true,
          },
        ],
        scores: {
          me: scores.map((s) => ({
            hole: s.hole,
            score: s.score,
            putts: 0,
            driving: false,
            gir: false,
            bunker: 0,
            penalties: 0,
          })),
        },
        completed: true,
        holesMode: determineHolesMode(),
      };

      await api.post("/api/rounds", { round });
      await api.delete(`/api/scorecards/${pendingId}`);
      toast.success("Round added!");
      onDone();
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Save error");
      setConfirming(false);
    }
  };

  const discard = async () => {
    try { await api.delete(`/api/scorecards/${pendingId}`); } catch { /* ignore */ }
    onCancel();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm">Loading scorecard…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 animate-in fade-in">
        <Card className="p-6 text-center">
          <div className="text-3xl mb-3">❌</div>
          <div className="font-semibold mb-1">Scorecard not found</div>
          <div className="text-sm text-muted-foreground mb-4">{error}</div>
          <Button onClick={onCancel} variant="outline" className="w-full">Back</Button>
        </Card>
      </div>
    );
  }

  const front9 = scores.filter((s) => s.hole <= 9);
  const back9 = scores.filter((s) => s.hole >= 10);

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-6">
      <div>
        <div className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: "#22c55e" }}>
          Scorecard Import
        </div>
        <h2 className="text-xl font-bold">Confirm Scores</h2>
        <p className="text-sm text-muted-foreground">Review and edit if needed</p>
      </div>

      {/* Date */}
      <Card className="p-4 shadow-soft">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Date</div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-transparent text-foreground text-sm font-medium focus:outline-none"
        />
      </Card>

      {/* Course */}
      <Card className="p-4 shadow-soft">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Course</div>
        <div className="grid grid-cols-2 gap-2">
          {COURSES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCourseId(c.id)}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition-base",
                courseId === c.id ? "border-action bg-action/5" : "border-border hover:border-muted-foreground/30"
              )}
            >
              <div className="font-semibold text-sm">{c.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Par {c.totalPar}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Tee */}
      <Card className="p-4 shadow-soft">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Tee</div>
        <div className="flex gap-2">
          {course.tees.map((t) => (
            <button
              key={t.color}
              onClick={() => setTee(t.color)}
              className={cn(
                "flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-base",
                tee === t.color ? "border-action bg-action/5" : "border-border"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Scores grid */}
      <Card className="p-4 shadow-soft">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Scores</div>

        {front9.length > 0 && (
          <div className="mb-3">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${front9.length}, 1fr)` }}>
              {front9.map((s) => (
                <div key={s.hole} className="text-center text-[10px] text-muted-foreground font-semibold">{s.hole}</div>
              ))}
            </div>
            <div className="grid gap-1 mt-1" style={{ gridTemplateColumns: `repeat(${front9.length}, 1fr)` }}>
              {front9.map((s) => (
                <input
                  key={s.hole}
                  type="number"
                  min={1}
                  max={15}
                  value={s.score}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(15, parseInt(e.target.value) || 1));
                    updateScore(s.hole, v);
                  }}
                  className="w-full h-10 rounded-lg border border-border bg-transparent text-center text-sm font-bold focus:outline-none focus:border-action"
                />
              ))}
            </div>
          </div>
        )}

        {back9.length > 0 && (
          <div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${back9.length}, 1fr)` }}>
              {back9.map((s) => (
                <div key={s.hole} className="text-center text-[10px] text-muted-foreground font-semibold">{s.hole}</div>
              ))}
            </div>
            <div className="grid gap-1 mt-1" style={{ gridTemplateColumns: `repeat(${back9.length}, 1fr)` }}>
              {back9.map((s) => (
                <input
                  key={s.hole}
                  type="number"
                  min={1}
                  max={15}
                  value={s.score}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(15, parseInt(e.target.value) || 1));
                    updateScore(s.hole, v);
                  }}
                  className="w-full h-10 rounded-lg border border-border bg-transparent text-center text-sm font-bold focus:outline-none focus:border-action"
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{scores.length} holes · Total</span>
          <span className="text-2xl font-bold tabular-nums">{totalScore}</span>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={discard}
          className="flex-1 h-12 rounded-xl border-2 border-border text-sm font-semibold text-muted-foreground active:scale-[0.98] transition-transform"
        >
          Discard
        </button>
        <button
          onClick={confirm}
          disabled={confirming || !scores.length}
          className="flex-[2] h-12 rounded-xl font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          style={{ background: "#22c55e", color: "#000" }}
        >
          {confirming ? "Saving…" : "Confirm Round"}
        </button>
      </div>
    </div>
  );
};

const StatToggle = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1 py-3 rounded-xl transition-colors"
    style={active
      ? { background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e", color: "#22c55e" }
      : { background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
    }
  >
    <div className="h-8 w-8 rounded-full grid place-items-center" style={{ background: active ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)" }}>
      {active && <Check className="h-5 w-5" strokeWidth={3} />}
    </div>
    <div className="text-[9px] font-semibold leading-tight text-center px-1">{label}</div>
  </button>
);

const StatCounter = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div
    className="flex flex-col items-center rounded-xl overflow-hidden"
    style={value > 0
      ? { background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }
      : { background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)" }
    }
  >
    <div className="text-[9px] font-semibold uppercase tracking-widest pt-2" style={{ color: value > 0 ? "#22c55e" : "rgba(255,255,255,0.4)" }}>{label}</div>
    <button
      onClick={() => onChange(value + 1)}
      className="w-full h-8 grid place-items-center active:bg-white/10"
      style={{ color: value > 0 ? "#22c55e" : "rgba(255,255,255,0.35)" }}
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} />
    </button>
    <div className="text-xl font-black tabular-nums leading-none" style={{ color: value > 0 ? "#22c55e" : "rgba(255,255,255,0.3)" }}>{value}</div>
    <button
      onClick={() => onChange(Math.max(0, value - 1))}
      disabled={value === 0}
      className="w-full h-8 grid place-items-center active:bg-white/10 disabled:opacity-25"
      style={{ color: value > 0 ? "#22c55e" : "rgba(255,255,255,0.35)" }}
    >
      <span className="text-xl leading-none font-bold">−</span>
    </button>
  </div>
);

export default PlayPage;
