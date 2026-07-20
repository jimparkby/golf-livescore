import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { COURSES, type Course, type Hole } from "@/lib/courses";
import { type HolesMode } from "@/store/golfStore";
import { courseHandicap, netStablefordPoints } from "@/lib/handicap";
import { api, errMsg } from "@/lib/api";
import { ChevronLeft, ChevronRight, X, Trophy, Plus, Flag } from "lucide-react";
import { toast } from "sonner";

type TournamentDetail = {
  id: string;
  name: string;
  courseId: string | null;
  tee: string;
  date: string;
  startTime: string;
  status: "draft" | "open" | "live" | "completed";
  holesMode: HolesMode;
  handicapAllowancePct: number;
  myRegistration: {
    id: string;
    paid: boolean;
    checkedIn: boolean;
    accessCode: string | null;
    groupId: string | null;
    flightLabel: string | null;
    hcp: number;
  } | null;
  group: {
    id: string;
    flightLabel: string;
    groupNumber: number;
    roundId: string | null;
    players: { id: string; name: string; hcp: number }[];
  } | null;
};

type LiveData = {
  tournament: {
    id: string; name: string; courseId: string | null; tee: string; holesMode: HolesMode;
    rating: number; slope: number; handicapAllowancePct: number; status: string;
  };
  groups: { id: string; flightLabel: string; groupNumber: number; roundId: string | null }[];
  players: { id: string; groupId: string; flightLabel: string; hcp: number; name: string }[];
  scores: { roundId: string; playerId: string; hole: number; score: number }[];
};

function playHolesFor(holes: Hole[], mode: HolesMode) {
  return mode === "front9" ? holes.filter((h) => h.number <= 9)
       : mode === "back9" ? holes.filter((h) => h.number > 9)
       : holes;
}

// Marker pairing derived purely from position in the group — no extra DB field needed.
// Even-sized groups pair up mutually (0↔1, 2↔3 …); odd-sized groups chain (0→1→2→0).
function markerPartnerIndex(size: number, i: number): number | null {
  if (size <= 1) return null;
  if (size % 2 === 1) return (i + 1) % size;
  const pairStart = i - (i % 2);
  return pairStart === i ? i + 1 : pairStart;
}

const scoreLabel = (score: number, par: number) => {
  const d = score - par;
  if (d <= -2) return "Eagle";
  if (d === -1) return "Birdie";
  if (d === 0) return "Par";
  if (d === 1) return "Bogey";
  return `+${d}`;
};

const OfficialTournamentPlayPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.get<TournamentDetail>(`/api/official-tournaments/${id}`).then(setTournament).catch(() => {});

  useEffect(() => {
    load().finally(() => setLoading(false));
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-action border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!tournament) {
    return (
      <div className="space-y-4">
        <BackBtn onClick={() => navigate("/tournaments")} />
        <Card className="p-8 text-center text-muted-foreground">Турнир не найден</Card>
      </div>
    );
  }

  const reg = tournament.myRegistration;

  if (!reg || !reg.paid) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <BackBtn onClick={() => navigate("/tournaments")} />
        <Card className="p-6 shadow-elevated">
          <h1 className="text-lg font-bold mb-2">{tournament.name}</h1>
          <p className="text-sm text-muted-foreground">
            Вы не зарегистрированы на этот турнир. Обратитесь к администратору клуба для оплаты и регистрации.
          </p>
        </Card>
      </div>
    );
  }

  if (reg.checkedIn && tournament.group) {
    return <TournamentGroupPlayer tournament={tournament} onExit={() => navigate("/tournaments")} />;
  }

  const startMs = new Date(tournament.startTime).getTime();
  const isOpenForCheckin = tournament.status === "live" || Date.now() >= startMs;

  if (!isOpenForCheckin) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <BackBtn onClick={() => navigate("/tournaments")} />
        <Card className="p-6 shadow-elevated text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">{tournament.name}</div>
          <div className="text-sm text-action font-semibold mb-4">Оплачено — до старта:</div>
          <Countdown target={startMs} />
        </Card>
      </div>
    );
  }

  return <CheckInScreen tournament={tournament} onBack={() => navigate("/tournaments")} onCheckedIn={load} />;
};

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-1 text-action font-bold text-lg">
    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> Турниры
  </button>
);

/* ── Countdown ── */
const Countdown = ({ target }: { target: number }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <div className="flex items-center justify-center gap-3">
      {[[d, "дн"], [h, "ч"], [m, "мин"], [s, "сек"]].map(([v, label]) => (
        <div key={label as string} className="text-center">
          <div className="text-3xl font-black tabular-nums">{String(v).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
};

/* ── Check-in ── */
const CheckInScreen = ({ tournament, onBack, onCheckedIn }: {
  tournament: TournamentDetail; onBack: () => void; onCheckedIn: () => void;
}) => {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const reg = tournament.myRegistration!;

  if (!reg.groupId) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <BackBtn onClick={onBack} />
        <Card className="p-6 shadow-elevated text-center text-sm text-muted-foreground">
          Группы ещё не сформированы. Обратитесь к организатору.
        </Card>
      </div>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/api/official-tournaments/${tournament.id}/checkin`, { code: code.trim() });
      toast.success("Добро пожаловать на турнир!");
      onCheckedIn();
    } catch (e) {
      toast.error(errMsg(e, "Неверный код"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <BackBtn onClick={onBack} />
      <Card className="p-6 shadow-elevated text-center space-y-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{tournament.name}</div>
        <div className="text-sm text-muted-foreground">Ваш код на сегодня:</div>
        <div className="text-4xl font-black tracking-[0.2em] text-action tabular-nums">{reg.accessCode}</div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Введите код"
          className="w-full h-14 text-center text-xl font-bold tracking-[0.2em] bg-muted rounded-xl outline-none focus:ring-2 focus:ring-action"
        />
        <Button
          onClick={submit}
          disabled={submitting || !code.trim()}
          className="w-full h-14 text-base font-semibold bg-action hover:bg-action/90 text-action-foreground rounded-xl"
        >
          Начать игру
        </Button>
      </Card>
    </div>
  );
};

/* ── Group scoring + live ── */
const TournamentGroupPlayer = ({ tournament, onExit }: { tournament: TournamentDetail; onExit: () => void }) => {
  const group = tournament.group!;
  const reg = tournament.myRegistration!;
  const course = COURSES.find((c) => c.id === tournament.courseId);

  const [view, setView] = useState<"scoring" | "live">("scoring");
  const [holeIdx, setHoleIdx] = useState(0);
  const [live, setLive] = useState<LiveData | null>(null);
  const [selfScore, setSelfScore] = useState(4);
  const [partnerScore, setPartnerScore] = useState(4);
  const [saving, setSaving] = useState(false);

  const loadLive = () => api.get<LiveData>(`/api/official-tournaments/${tournament.id}/live`).then(setLive).catch(() => {});
  useEffect(() => {
    loadLive();
    const t = setInterval(loadLive, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id]);

  const playHoles = course ? playHolesFor(course.holes, tournament.holesMode) : [];
  const currentHole = playHoles[holeIdx];
  const totalHoles = playHoles.length;

  const myIndex = group.players.findIndex((p) => p.id === reg.id);
  const partnerIdx = markerPartnerIndex(group.players.length, myIndex);
  const partner = partnerIdx !== null ? group.players[partnerIdx] : null;

  const roundId = live?.groups.find((g) => g.id === group.id)?.roundId ?? group.roundId;
  const scoreFor = (playerId: string, hole: number) =>
    live?.scores.find((s) => s.roundId === roundId && s.playerId === playerId && s.hole === hole)?.score;

  useEffect(() => {
    if (!currentHole) return;
    setSelfScore(scoreFor(reg.id, currentHole.number) ?? currentHole.par);
    setPartnerScore(partner ? (scoreFor(partner.id, currentHole.number) ?? currentHole.par) : currentHole.par);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeIdx, live]);

  const save = async () => {
    if (!currentHole) return;
    setSaving(true);
    const scores = [{ playerId: reg.id, hole: currentHole.number, score: selfScore }];
    if (partner) scores.push({ playerId: partner.id, hole: currentHole.number, score: partnerScore });
    try {
      await api.post(`/api/official-tournaments/${tournament.id}/groups/${group.id}/scores`, { scores });
      await loadLive();
      if (holeIdx < totalHoles - 1) setHoleIdx((h) => h + 1);
    } catch (e) {
      toast.error(errMsg(e, "Ошибка сохранения"));
    } finally {
      setSaving(false);
    }
  };

  if (!course || !currentHole) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4" style={{ background: "#0a0a0a" }}>
        <div className="text-white/60 text-sm">Данные поля не найдены</div>
        <button onClick={onExit} className="text-action font-semibold">Назад</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5" style={{ paddingTop: "calc(var(--tg-safe-top) + 10px)", paddingBottom: 10 }}>
        <button onClick={onExit} className="h-9 w-9 rounded-full grid place-items-center" style={{ background: "rgba(255,255,255,0.1)" }}>
          <X className="h-4 w-4 text-white" strokeWidth={2.5} />
        </button>
        {view === "scoring" ? (
          <div className="flex items-center gap-3">
            <button onClick={() => setHoleIdx(Math.max(0, holeIdx - 1))} disabled={holeIdx === 0} className="h-9 w-9 grid place-items-center disabled:opacity-20">
              <ChevronLeft className="h-6 w-6 text-white" strokeWidth={2.5} />
            </button>
            <span className="text-white font-bold text-base tracking-wider min-w-[90px] text-center">Лунка {currentHole.number}</span>
            <button onClick={() => setHoleIdx(Math.min(totalHoles - 1, holeIdx + 1))} disabled={holeIdx === totalHoles - 1} className="h-9 w-9 grid place-items-center disabled:opacity-20">
              <ChevronRight className="h-6 w-6 text-white" strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <span className="text-white font-bold text-base tracking-wider">Live</span>
        )}
        <div className="w-9" />
      </div>

      {/* View toggle */}
      <div className="px-5 pb-3">
        <div className="flex rounded-full p-1 gap-1" style={{ background: "rgba(255,255,255,0.07)" }}>
          <button
            onClick={() => setView("scoring")}
            className="flex-1 h-8 rounded-full text-xs font-bold tracking-wider transition-all"
            style={view === "scoring" ? { background: "#22c55e", color: "#000" } : { color: "rgba(255,255,255,0.5)" }}
          >
            СЧЁТ
          </button>
          <button
            onClick={() => setView("live")}
            className="flex-1 h-8 rounded-full text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-1"
            style={view === "live" ? { background: "#22c55e", color: "#000" } : { color: "rgba(255,255,255,0.5)" }}
          >
            <Trophy className="h-3 w-3" /> ЛАЙВ
          </button>
        </div>
      </div>

      {view === "live" ? (
        <LiveView data={live} course={course} />
      ) : (
        <div className="flex-1 flex flex-col justify-center px-5 pb-4 gap-4 overflow-y-auto">
          <div className="rounded-3xl overflow-hidden" style={{ background: "#1a1a1a" }}>
            <div className="flex items-baseline gap-6 px-5 pt-5 pb-4">
              <span className="text-white font-black text-4xl tracking-tight">PAR {currentHole.par}</span>
              <span className="text-white/50 font-bold text-2xl tracking-tight">HCP {currentHole.hcp}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3" style={{ background: "rgba(255,255,255,0.05)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-white/70 text-sm font-semibold">{group.flightLabel} · Группа {group.groupNumber}</div>
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5" style={{ color: "#22c55e" }} />
                <span className="text-white font-black text-2xl tabular-nums">{currentHole.number}</span>
              </div>
            </div>
          </div>

          {partner && (
            <ScoreRow label={partner.name.split(" ")[0]} sub="вы — маркер" score={partnerScore} par={currentHole.par} onChange={setPartnerScore} accent="#60a5fa" />
          )}
          <ScoreRow label="Я" score={selfScore} par={currentHole.par} onChange={setSelfScore} accent="#22c55e" />

          <button
            onClick={save}
            disabled={saving}
            className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-wider active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{ background: "#22c55e", color: "#000" }}
          >
            Сохранить
          </button>

          <div className="flex items-center justify-center gap-1.5 pt-1">
            {playHoles.map((h, i) => {
              const scored = !!scoreFor(reg.id, h.number);
              return (
                <button
                  key={i}
                  onClick={() => setHoleIdx(i)}
                  className="rounded-full transition-all duration-200"
                  style={{ width: i === holeIdx ? 20 : 8, height: 8, background: i === holeIdx ? "#22c55e" : scored ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)" }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreRow = ({ label, sub, score, par, onChange, accent }: {
  label: string; sub?: string; score: number; par: number; onChange: (v: number) => void; accent: string;
}) => (
  <div className="rounded-2xl p-4 flex items-center justify-between gap-3" style={{ background: "#1a1a1a", borderLeft: `3px solid ${accent}` }}>
    <div className="min-w-0">
      <div className="text-white font-bold text-sm truncate">{label}</div>
      {sub && <div className="text-white/40 text-xs">{sub}</div>}
      <div className="text-xs font-bold mt-0.5" style={{ color: accent }}>{scoreLabel(score, par)}</div>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <button onClick={() => onChange(Math.max(1, score - 1))} className="h-10 w-10 rounded-full grid place-items-center text-xl font-bold" style={{ background: "rgba(255,255,255,0.08)", color: accent }}>−</button>
      <div className="text-3xl font-black tabular-nums text-white w-8 text-center">{score}</div>
      <button onClick={() => onChange(score + 1)} className="h-10 w-10 rounded-full grid place-items-center" style={{ background: "rgba(255,255,255,0.08)", color: accent }}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  </div>
);

/* ── Live: flights results + groups start-list ── */
const LiveView = ({ data, course }: { data: LiveData | null; course: Course }) => {
  const [sub, setSub] = useState<"results" | "groups">("results");
  const [flight, setFlight] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="flex-1 grid place-items-center">
        <div className="h-6 w-6 rounded-full border-2 border-action border-t-transparent animate-spin" />
      </div>
    );
  }

  const flights = Array.from(new Set(data.players.map((p) => p.flightLabel)));
  const activeFlight = flight ?? flights[0] ?? null;

  const playHoles = playHolesFor(course.holes, data.tournament.holesMode);
  const par = playHoles.reduce((a, h) => a + h.par, 0);

  const entries = data.players
    .filter((p) => p.flightLabel === activeFlight)
    .map((p) => {
      const roundId = data.groups.find((g) => g.id === p.groupId)?.roundId;
      const scores = data.scores.filter((s) => s.roundId === roundId && s.playerId === p.id);
      const ch = courseHandicap(p.hcp, data.tournament.slope, data.tournament.rating, par);
      const allowance = Math.round(ch * data.tournament.handicapAllowancePct / 100);
      let points = 0;
      scores.forEach((s) => {
        const hole = playHoles.find((h) => h.number === s.hole);
        if (hole) points += netStablefordPoints(s.score, hole, playHoles, allowance);
      });
      return { player: p, points, holesPlayed: scores.length };
    })
    .sort((a, b) => b.points - a.points);

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2 space-y-3">
      <div className="flex rounded-full p-1 gap-1" style={{ background: "rgba(255,255,255,0.07)" }}>
        {(["results", "groups"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className="flex-1 h-8 rounded-full text-xs font-bold tracking-wider transition-all"
            style={sub === s ? { background: "#22c55e", color: "#000" } : { color: "rgba(255,255,255,0.5)" }}
          >
            {s === "results" ? "РЕЗУЛЬТАТЫ" : "ГРУППЫ"}
          </button>
        ))}
      </div>

      {sub === "results" ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {flights.map((f) => (
              <button
                key={f}
                onClick={() => setFlight(f)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={f === activeFlight ? { background: "#22c55e", color: "#000" } : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1a1a1a" }}>
            <div className="grid px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ gridTemplateColumns: "2rem 1fr auto auto", color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div>#</div><div>Игрок</div><div className="w-12 text-center">Pts</div><div className="w-14 text-center">Лунок</div>
            </div>
            {entries.map((e, i) => (
              <div key={e.player.id} className="grid items-center px-4 py-3 border-t border-white/5" style={{ gridTemplateColumns: "2rem 1fr auto auto" }}>
                <div className="text-sm font-black" style={{ color: i < 3 ? "#22c55e" : "rgba(255,255,255,0.3)" }}>{i + 1}</div>
                <div className="min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{e.player.name} <span className="text-white/40 font-normal">[{e.player.hcp}]</span></div>
                </div>
                <div className="w-12 text-center text-white font-black text-base tabular-nums">{e.points}</div>
                <div className="w-14 text-center text-white/60 font-bold text-sm tabular-nums">{e.holesPlayed}</div>
              </div>
            ))}
            {entries.length === 0 && <div className="py-8 text-center text-white/30 text-sm">Нет данных</div>}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {flights.map((f) => (
            <div key={f} className="rounded-2xl overflow-hidden" style={{ background: "#1a1a1a" }}>
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-action" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{f}</div>
              {data.groups.filter((g) => g.flightLabel === f).map((g) => (
                <div key={g.id} className="px-4 py-3 border-t border-white/5 first:border-t-0">
                  <div className="text-white/50 text-xs mb-1">Группа {g.groupNumber}</div>
                  <div className="text-white text-sm">
                    {data.players.filter((p) => p.groupId === g.id).map((p) => p.name.split(" ")[0]).join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OfficialTournamentPlayPage;
