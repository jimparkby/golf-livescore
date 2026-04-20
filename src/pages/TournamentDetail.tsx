import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/scoring/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, ClipboardList } from "lucide-react";
import {
  formatToPar,
  toParColorClass,
  stablefordPoints,
} from "@/lib/scoring";

type Tournament = {
  id: string;
  name: string;
  course_name: string;
  format: "stroke_play" | "stableford" | "team_scramble" | "team_best_ball";
  status: "upcoming" | "live" | "finished";
  start_date: string;
  total_holes: number;
  total_par: number;
};
type Hole = { id: string; hole_number: number; par: number };
type Player = {
  id: string;
  user_id: string;
  team_name: string | null;
  display_name: string;
  handicap: number | null;
};
type Score = {
  user_id: string;
  hole_id: string;
  hole_number: number;
  strokes: number | null;
  stableford_points: number | null;
};

const FORMAT_LABEL: Record<string, string> = {
  stroke_play: "Stroke Play",
  stableford: "Stableford",
  team_scramble: "Team Scramble",
  team_best_ball: "Best Ball",
};

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const loadAll = async () => {
    if (!id) return;
    const [{ data: t }, { data: h }, { data: tp }, { data: s }] = await Promise.all([
      supabase.from("tournaments").select("*").eq("id", id).maybeSingle(),
      supabase.from("holes").select("*").eq("tournament_id", id).order("hole_number"),
      supabase.from("tournament_players").select("id,user_id,team_name").eq("tournament_id", id),
      supabase.from("scores").select("user_id,hole_id,hole_number,strokes,stableford_points").eq("tournament_id", id),
    ]);
    setTournament(t as any);
    setHoles((h ?? []) as Hole[]);
    setScores((s ?? []) as Score[]);

    const ids = (tp ?? []).map((p: any) => p.user_id);
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,display_name,handicap")
        .in("user_id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      setPlayers(
        (tp as any[]).map((p) => ({
          id: p.id,
          user_id: p.user_id,
          team_name: p.team_name,
          display_name: map.get(p.user_id)?.display_name ?? "Игрок",
          handicap: map.get(p.user_id)?.handicap ?? 0,
        }))
      );
    } else {
      setPlayers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    if (!id) return;
    const ch = supabase
      .channel(`t-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "scores", filter: `tournament_id=eq.${id}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_players", filter: `tournament_id=eq.${id}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${id}` }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const playerStats = useMemo(() => {
    if (!tournament) return [];
    const parByHole = new Map(holes.map((h) => [h.id, h.par]));
    return players.map((pl) => {
      const mine = scores.filter((s) => s.user_id === pl.user_id && s.strokes != null);
      const playedHoles = mine.length;
      const strokes = mine.reduce((sum, s) => sum + (s.strokes ?? 0), 0);
      const par = mine.reduce((sum, s) => sum + (parByHole.get(s.hole_id) ?? 0), 0);
      const toPar = strokes - par;
      const stbf = mine.reduce(
        (sum, s) => sum + stablefordPoints(s.strokes ?? 0, parByHole.get(s.hole_id) ?? 0),
        0
      );
      const lastHole = mine.reduce((m, s) => Math.max(m, s.hole_number), 0);
      const thru = playedHoles >= tournament.total_holes ? "F" : String(lastHole || "—");
      return {
        ...pl,
        playedHoles,
        strokes,
        toPar,
        stableford: stbf,
        thru,
      };
    });
  }, [players, scores, holes, tournament]);

  const sorted = useMemo(() => {
    const isStbf = tournament?.format === "stableford";
    const arr = [...playerStats];
    arr.sort((a, b) => {
      if (isStbf) return b.stableford - a.stableford;
      // Stroke play: lower toPar wins, but unplayed go to bottom
      if (a.playedHoles === 0 && b.playedHoles === 0) return 0;
      if (a.playedHoles === 0) return 1;
      if (b.playedHoles === 0) return -1;
      if (a.toPar !== b.toPar) return a.toPar - b.toPar;
      return a.strokes - b.strokes;
    });
    // assign positions with ties
    let lastKey: string | null = null;
    let lastPos = 0;
    return arr.map((p, idx) => {
      const key = isStbf ? `${p.stableford}` : `${p.toPar}-${p.strokes}-${p.playedHoles === 0}`;
      let pos = idx + 1;
      if (key === lastKey) pos = lastPos;
      else { lastKey = key; lastPos = pos; }
      return { ...p, pos };
    });
  }, [playerStats, tournament]);

  const isPlayer = !!user && players.some((p) => p.user_id === user.id);

  const join = async () => {
    if (!user || !id) return;
    setJoining(true);
    const { error } = await supabase
      .from("tournament_players")
      .insert({ tournament_id: id, user_id: user.id });
    setJoining(false);
    if (error) toast.error(error.message);
    else toast.success("Вы участвуете в турнире");
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="container py-10 text-muted-foreground">Загрузка…</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div>
        <Header />
        <div className="container py-10">
          <Link to="/" className="text-primary hover:underline">← На главную</Link>
          <p className="mt-4 text-muted-foreground">Турнир не найден.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <section className="bg-hero border-b border-border">
        <div className="container py-8">
          <Link to="/" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Все турниры
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                {tournament.status === "live" && (
                  <Badge className="animate-pulse bg-destructive text-destructive-foreground">● LIVE</Badge>
                )}
                <Badge variant="outline">{FORMAT_LABEL[tournament.format]}</Badge>
              </div>
              <h1 className="font-display text-3xl uppercase tracking-wider md:text-5xl">
                {tournament.name}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {tournament.course_name} · {tournament.total_holes} лунок · Par {tournament.total_par}
              </p>
            </div>
            <div className="flex gap-2">
              {user && !isPlayer && (
                <Button onClick={join} disabled={joining}>
                  {joining ? "Записываем…" : "Участвовать"}
                </Button>
              )}
              {isPlayer && (
                <Button asChild>
                  <Link to={`/t/${tournament.id}/score`}>
                    <ClipboardList className="mr-2 h-4 w-4" /> Ввести счёт
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container py-8">
        <h2 className="font-display mb-3 text-xl uppercase tracking-wider">Лидерборд</h2>
        <Card className="overflow-hidden bg-leaderboard">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-3 text-left">POS</th>
                  <th className="px-3 py-3 text-left">Игрок</th>
                  {tournament.format === "stableford" ? (
                    <th className="px-3 py-3 text-right">Очки</th>
                  ) : (
                    <th className="px-3 py-3 text-right">TO PAR</th>
                  )}
                  <th className="px-3 py-3 text-right">THRU</th>
                  <th className="px-3 py-3 text-right hidden sm:table-cell">УДАРЫ</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      Пока нет участников.
                    </td>
                  </tr>
                )}
                {sorted.map((p) => (
                  <tr key={p.user_id}
                    className={`row-divider transition hover:bg-muted/20 ${user?.id === p.user_id ? "bg-primary/5" : ""}`}>
                    <td className="px-3 py-3 font-mono-tab text-base font-semibold">{p.pos}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{p.display_name}</div>
                      {p.team_name && (
                        <div className="text-xs text-muted-foreground">{p.team_name}</div>
                      )}
                    </td>
                    {tournament.format === "stableford" ? (
                      <td className="px-3 py-3 text-right font-mono-tab text-lg font-semibold">
                        {p.stableford}
                      </td>
                    ) : (
                      <td className={`px-3 py-3 text-right font-mono-tab text-lg font-semibold ${toParColorClass(p.toPar)}`}>
                        {p.playedHoles === 0 ? "—" : formatToPar(p.toPar)}
                      </td>
                    )}
                    <td className="px-3 py-3 text-right font-mono-tab text-muted-foreground">{p.thru}</td>
                    <td className="px-3 py-3 text-right font-mono-tab hidden sm:table-cell">
                      {p.playedHoles === 0 ? "—" : p.strokes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}