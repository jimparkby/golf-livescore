import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/PlayerAvatar";
import { COURSES } from "@/lib/courses";
import { useGolf, type Player, type HolesMode } from "@/store/golfStore";
import { type FormatId } from "@/lib/formats";
import { api } from "@/lib/api";
import { ChevronLeft, Plus, X, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TOURNAMENT_FORMATS = [
  { id: "stroke_play" as FormatId, name: "Stroke Play", emoji: "🏅", desc: "Lowest total score wins. Classic scoring.", team: false },
  { id: "match_play" as FormatId, name: "Match Play", emoji: "⚔️", desc: "Win holes, not total strokes. Each hole decides.", team: false },
  { id: "stableford" as FormatId, name: "Stableford", emoji: "⭐", desc: "Points: Bogey 1 · Par 2 · Birdie 3 · Eagle 4", team: false },
  { id: "scramble" as FormatId, name: "Scramble", emoji: "🤝", desc: "2×2 команды: все бьют, лучший мяч выбирается", team: true },
  { id: "best_ball" as FormatId, name: "Fourball", emoji: "🎯", desc: "2×2 команды: каждый играет свой мяч, лучший счёт", team: true },
];

type Step = "format" | "players" | "setup" | "teams";

type UserResult = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  hcp: number | null;
  photo_url: string | null;
};

const mkName = (u: UserResult) =>
  [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "Player";
const mkInitials = (name: string) =>
  name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const CreateTournamentPage = () => {
  const navigate = useNavigate();
  const { addCustomTournament, startRound, profile } = useGolf();

  const [step, setStep] = useState<Step>("format");
  const [format, setFormat] = useState<FormatId>("stroke_play");
  const [players, setPlayers] = useState<Player[]>([
    {
      id: "me",
      name: `${profile.firstName} ${profile.lastName}`.trim() || "Me",
      initials: profile.initials || "ME",
      hcp: profile.hcp,
      isMe: true,
      photoUrl: profile.photoUrl,
    },
  ]);
  const [courseId, setCourseId] = useState(COURSES[0].id);
  const [holesMode, setHolesMode] = useState<HolesMode>("18");
  const [name, setName] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [teamAssignment, setTeamAssignment] = useState([0, 0, 1, 1]);

  const isTeamFormat = format === "scramble" || format === "best_ball";
  const course = COURSES.find((c) => c.id === courseId)!;

  const fmt = TOURNAMENT_FORMATS.find((f) => f.id === format)!;

  const addPlayer = (p: Player) => {
    if (players.find((x) => x.id === p.id)) return;
    const maxP = isTeamFormat ? 4 : 4;
    if (players.length >= maxP) return;
    setPlayers((prev) => [...prev, p]);
    setTeamAssignment((prev) => [...prev.slice(0, players.length), players.length < 2 ? 0 : 1]);
  };

  const removePlayer = (id: string) => {
    const idx = players.findIndex((p) => p.id === id);
    if (idx < 0) return;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    setTeamAssignment((prev) => prev.filter((_, i) => i !== idx));
  };

  const movePlayer = (playerId: string) => {
    const idx = players.findIndex((p) => p.id === playerId);
    if (idx < 0) return;
    const cur = teamAssignment[idx];
    const other = 1 - cur;
    const otherCount = teamAssignment.filter((t) => t === other).length;
    if (otherCount < 2) {
      setTeamAssignment((prev) => {
        const next = [...prev];
        next[idx] = other;
        return next;
      });
    }
  };

  const canNextFromPlayers = isTeamFormat
    ? players.length === 4
    : players.length >= (format === "match_play" ? 2 : 1);

  const handleCreate = () => {
    const id = `ct-${Date.now()}`;
    const now = new Date();
    const autoName =
      name.trim() ||
      `${fmt.name} · ${now.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;

    const teams: [string[], string[]] | undefined =
      isTeamFormat && players.length === 4
        ? [
            players.filter((_, i) => teamAssignment[i] === 0).map((p) => p.id),
            players.filter((_, i) => teamAssignment[i] === 1).map((p) => p.id),
          ]
        : undefined;

    addCustomTournament({
      id,
      name: autoName,
      format,
      courseId,
      holesMode,
      teams,
      date: String(now.getDate()),
      day: now.toLocaleDateString("ru-RU", { weekday: "short" }).toUpperCase(),
      month: now.toLocaleDateString("ru-RU", { month: "long" }),
    });

    startRound(course, players, id, format, holesMode, teams);
    navigate(`/tournament/${id}`);
  };

  const teamAPlayers = players.filter((_, i) => teamAssignment[i] === 0);
  const teamBPlayers = players.filter((_, i) => teamAssignment[i] === 1);

  /* ── Step: format ── */
  if (step === "format") {
    return (
      <div className="space-y-5 animate-in fade-in duration-300">
        <button onClick={() => navigate("/tournaments")} className="flex items-center gap-1 text-action font-bold text-lg">
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> Создать турнир
        </button>

        <div className="space-y-2">
          {TOURNAMENT_FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={cn(
                "w-full p-4 rounded-2xl border-2 text-left transition-all",
                format === f.id ? "border-action bg-action/5" : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{f.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold text-sm flex items-center gap-2">
                    {f.name}
                    {f.team && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                        2×2
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{f.desc}</div>
                </div>
                {format === f.id && (
                  <div className="h-5 w-5 rounded-full bg-action grid place-items-center shrink-0">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setStep("players")}
          className="w-full h-14 rounded-xl font-bold text-base"
          style={{ background: "#22c55e", color: "#000" }}
        >
          Далее →
        </button>
      </div>
    );
  }

  /* ── Step: players ── */
  if (step === "players") {
    const slots = Array.from({ length: isTeamFormat ? 4 : 4 });
    return (
      <>
        <div className="space-y-5 animate-in slide-in-from-right duration-300">
          <button onClick={() => setStep("format")} className="flex items-center gap-1 text-action font-bold text-lg">
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> Игроки
          </button>

          <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <span className="text-lg">{fmt.emoji}</span>
            <span className="text-sm font-semibold text-action">{fmt.name}</span>
            {isTeamFormat && <span className="text-xs text-muted-foreground">— нужно ровно 4 игрока</span>}
            {format === "match_play" && <span className="text-xs text-muted-foreground">— мин. 2 игрока</span>}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider border-b border-border">
              <div>Игрок / HCP</div>
              <div className="w-8" />
            </div>
            {slots.map((_, i) => {
              const p = players[i];
              if (!p) {
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-4 border-t border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full border-2 border-dashed border-border" />
                      <div className="text-muted-foreground text-sm">Игрок {i + 1}</div>
                    </div>
                    <button
                      onClick={() => setShowSheet(true)}
                      className="flex items-center gap-1 text-action font-semibold text-sm"
                    >
                      <Plus className="h-4 w-4" /> Добавить
                    </button>
                  </div>
                );
              }
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={p.name} tone={p.isMe ? "orange" : "muted"} photoUrl={p.photoUrl} />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">HCP {p.hcp}</div>
                    </div>
                  </div>
                  {!p.isMe && (
                    <button onClick={() => removePlayer(p.id)} className="text-muted-foreground hover:text-destructive ml-3">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setStep("setup")}
            disabled={!canNextFromPlayers}
            className="w-full h-14 rounded-xl font-bold text-base disabled:opacity-40"
            style={{ background: "#22c55e", color: "#000" }}
          >
            Далее →
          </button>
        </div>

        {showSheet && (
          <PlayerPickerSheet
            players={players}
            onAdd={(p) => { addPlayer(p); setShowSheet(false); }}
            onClose={() => setShowSheet(false)}
          />
        )}
      </>
    );
  }

  /* ── Step: setup ── */
  if (step === "setup") {
    return (
      <div className="space-y-5 animate-in slide-in-from-right duration-300">
        <button onClick={() => setStep("players")} className="flex items-center gap-1 text-action font-bold text-lg">
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> Настройки
        </button>

        {/* Name */}
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">Название (необязательно)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`${fmt.name} · ${new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`}
            className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-action text-sm"
          />
        </div>

        {/* Course */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Поле</div>
          <div className="grid grid-cols-2 gap-2">
            {COURSES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCourseId(c.id)}
                className={cn(
                  "p-3 rounded-xl border-2 text-left transition-all",
                  courseId === c.id ? "border-action bg-action/5" : "border-border hover:border-muted-foreground/30"
                )}
              >
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {c.tees[0]?.totalMeters}m · Par {c.totalPar}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Holes */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Лунки</div>
          <div className="grid grid-cols-3 gap-2">
            {(["18", "front9", "back9"] as HolesMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setHolesMode(m)}
                className={cn(
                  "py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                  holesMode === m ? "border-action bg-action/10 text-action" : "border-border text-muted-foreground"
                )}
              >
                {m === "18" ? "18 лунок" : m === "front9" ? "Front 9" : "Back 9"}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => isTeamFormat ? setStep("teams") : handleCreate()}
          className="w-full h-14 rounded-xl font-bold text-base"
          style={{ background: "#22c55e", color: "#000" }}
        >
          {isTeamFormat ? "Далее → Команды" : `Начать · ${course.name}`}
        </button>
      </div>
    );
  }

  /* ── Step: teams ── */
  return (
    <div className="space-y-5 animate-in slide-in-from-right duration-300">
      <button onClick={() => setStep("setup")} className="flex items-center gap-1 text-action font-bold text-lg">
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> Команды
      </button>

      <p className="text-sm text-muted-foreground">
        Нажмите на игрока чтобы переместить в другую команду
      </p>

      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((teamIdx) => {
          const teamPlayers = players.filter((_, i) => teamAssignment[i] === teamIdx);
          return (
            <div key={teamIdx} className="rounded-2xl overflow-hidden" style={{ background: "#1a1a1a" }}>
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-center" style={{ color: teamIdx === 0 ? "#22c55e" : "#60a5fa", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {teamIdx === 0 ? "Team A" : "Team B"}
              </div>
              {teamPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => !p.isMe && movePlayer(p.id)}
                  disabled={p.isMe}
                  className="w-full flex items-center gap-2 px-3 py-3 border-t border-white/5 active:scale-[0.97] transition-transform disabled:opacity-60"
                >
                  <Avatar name={p.name} size="sm" tone={p.isMe ? "orange" : "muted"} photoUrl={p.photoUrl} />
                  <div className="text-left min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{p.name.split(" ")[0]}</div>
                    <div className="text-white/40 text-[10px]">HCP {p.hcp}</div>
                  </div>
                  {!p.isMe && (
                    <div className="ml-auto text-white/30 text-xs">⇄</div>
                  )}
                </button>
              ))}
              {teamPlayers.length < 2 && (
                <div className="flex items-center justify-center py-4 text-white/20 text-xs">
                  <Users className="h-4 w-4 mr-1" /> пусто
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleCreate}
        disabled={teamAPlayers.length !== 2 || teamBPlayers.length !== 2}
        className="w-full h-14 rounded-xl font-bold text-base disabled:opacity-40"
        style={{ background: "#22c55e", color: "#000" }}
      >
        Начать · {course.name}
      </button>
    </div>
  );
};

/* ── Player Picker Sheet ── */
const PlayerPickerSheet = ({
  players,
  onAdd,
  onClose,
}: {
  players: Player[];
  onAdd: (p: Player) => void;
  onClose: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [allUsers, setAllUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<UserResult[]>("/api/users/all")
      .then(setAllUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? allUsers.filter((u) => {
        const n = mkName(u).toLowerCase();
        const un = (u.username ?? "").toLowerCase();
        return n.includes(q) || un.includes(q);
      })
    : allUsers;

  const alreadyAdded = (id: string) => !!players.find((p) => p.id === id);

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-150">
      <button className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full rounded-t-3xl animate-in slide-in-from-bottom duration-250 flex flex-col"
        style={{ background: "#1c1c1e", maxHeight: "85vh", paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
      >
        <div className="mx-auto w-10 h-1 rounded-full mt-3 mb-4" style={{ background: "rgba(255,255,255,0.15)" }} />
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="text-white font-bold text-lg">Добавить игрока</div>
          <button onClick={onClose} className="h-8 w-8 rounded-full grid place-items-center" style={{ background: "rgba(255,255,255,0.1)" }}>
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
            <input
              type="text"
              autoFocus
              placeholder="Имя или @username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-11 rounded-xl pl-10 pr-4 text-white text-sm outline-none placeholder:text-white/30"
              style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.1)" }}
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-3 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 rounded-full border-2 border-action border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              {q ? "Никого не найдено" : "Нет других игроков"}
            </div>
          ) : (
            filtered.map((u) => {
              const n = mkName(u);
              const added = alreadyAdded(u.id);
              return (
                <button
                  key={u.id}
                  disabled={added}
                  onClick={() =>
                    onAdd({
                      id: u.id,
                      name: n,
                      initials: mkInitials(n),
                      hcp: u.hcp ?? 0,
                      photoUrl: u.photo_url ?? undefined,
                    })
                  }
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 active:scale-[0.98] transition-transform disabled:opacity-40"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  {u.photo_url ? (
                    <img src={u.photo_url} alt={n} className="h-12 w-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <Avatar name={n} tone="muted" />
                  )}
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">{n}</div>
                    <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {u.username ? `@${u.username}` : `HCP ${u.hcp ?? "—"}`}
                    </div>
                  </div>
                  {added ? (
                    <div className="text-xs font-semibold shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>Добавлен</div>
                  ) : (
                    <div className="text-sm font-semibold shrink-0" style={{ color: "#22c55e" }}>+ Add</div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTournamentPage;
