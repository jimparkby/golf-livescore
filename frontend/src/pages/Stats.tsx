import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/scoring/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { stablefordPoints, formatToPar } from "@/lib/scoring";
import { BarChart3 } from "lucide-react";

export default function Stats() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(true);
  const [stats, setStats] = useState({
    rounds: 0,
    holes: 0,
    avgStrokes: 0,
    bestToPar: 0,
    eagles: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doublesPlus: 0,
    stableford: 0,
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: scores } = await supabase
        .from("scores")
        .select("tournament_id,hole_id,strokes")
        .eq("user_id", user.id)
        .not("strokes", "is", null);

      const rows = scores ?? [];
      if (rows.length === 0) {
        setBusy(false);
        return;
      }

      const holeIds = Array.from(new Set(rows.map((r: any) => r.hole_id)));
      const { data: holes } = await supabase
        .from("holes")
        .select("id,par")
        .in("id", holeIds);
      const parMap = new Map((holes ?? []).map((h: any) => [h.id, h.par]));

      const tournIds = Array.from(new Set(rows.map((r: any) => r.tournament_id)));
      const perTournToPar = new Map<string, number>();
      let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doublesPlus = 0, stbf = 0, totalStrokes = 0;

      for (const r of rows as any[]) {
        const par = parMap.get(r.hole_id) ?? 0;
        const diff = r.strokes - par;
        totalStrokes += r.strokes;
        if (diff <= -2) eagles++;
        else if (diff === -1) birdies++;
        else if (diff === 0) pars++;
        else if (diff === 1) bogeys++;
        else doublesPlus++;
        stbf += stablefordPoints(r.strokes, par);
        perTournToPar.set(r.tournament_id, (perTournToPar.get(r.tournament_id) ?? 0) + diff);
      }

      const bestToPar = Math.min(...Array.from(perTournToPar.values()));

      setStats({
        rounds: perTournToPar.size,
        holes: rows.length,
        avgStrokes: +(totalStrokes / rows.length).toFixed(2),
        bestToPar,
        eagles, birdies, pars, bogeys, doublesPlus,
        stableford: stbf,
      });
      setBusy(false);
    };
    load();
  }, [user]);

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <section className="container py-8">
        <h1 className="font-display text-2xl uppercase tracking-wider">Статистика</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ваши результаты по всем сыгранным турнирам.
        </p>

        {busy ? (
          <div className="mt-6 text-muted-foreground">Загрузка…</div>
        ) : stats.holes === 0 ? (
          <Card className="mt-6 border-dashed">
            <CardContent className="py-12 text-center">
              <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                Сыграйте хотя бы одну лунку, чтобы увидеть статистику.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Раунды" value={stats.rounds} />
              <StatTile label="Лунки" value={stats.holes} />
              <StatTile label="Средний удар" value={stats.avgStrokes} />
              <StatTile label="Лучший раунд" value={formatToPar(stats.bestToPar)} />
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="font-display text-base uppercase tracking-wider">
                  Распределение результатов
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <ScoreTile label="Орлы+" value={stats.eagles} className="text-under-par" />
                <ScoreTile label="Бёрди" value={stats.birdies} className="text-under-par" />
                <ScoreTile label="Пары" value={stats.pars} />
                <ScoreTile label="Боги" value={stats.bogeys} className="text-over-par" />
                <ScoreTile label="2+ боги" value={stats.doublesPlus} className="text-over-par" />
              </CardContent>
            </Card>

            <Card className="mt-3">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm uppercase tracking-wider text-muted-foreground">
                  Очки Stableford всего
                </span>
                <span className="font-mono-tab text-2xl font-semibold">
                  {stats.stableford}
                </span>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 font-mono-tab text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ScoreTile({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-center">
      <div className={`font-mono-tab text-xl font-semibold ${className}`}>{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}