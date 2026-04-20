import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/scoring/Header";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trophy, Shield } from "lucide-react";
import { DEFAULT_PARS_18 } from "@/lib/scoring";

type Tournament = {
  id: string;
  name: string;
  format: string;
  status: string;
  start_date: string;
  total_holes: number;
  total_par: number;
};

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [name, setName] = useState("");
  const [format, setFormat] = useState<"stroke_play"|"stableford"|"team_scramble"|"team_best_ball">("stroke_play");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [hasAdminInDb, setHasAdminInDb] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    const check = async () => {
      const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
      setHasAdminInDb((count ?? 0) > 0);
    };
    check();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const { data } = await supabase.from("tournaments").select("*").order("start_date", { ascending: false });
      setTournaments((data ?? []) as any);
    };
    load();
  }, [isAdmin, busy]);

  const claimAdmin = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Вы — админ. Перезагрузите страницу."); setTimeout(() => location.reload(), 800); }
  };

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (name.trim().length < 2) { toast.error("Название слишком короткое"); return; }
    setBusy(true);

    const totalPar = DEFAULT_PARS_18.reduce((a, b) => a + b, 0);
    const { data: t, error } = await supabase.from("tournaments").insert({
      name: name.trim(),
      format,
      start_date: date,
      status: "live",
      total_holes: 18,
      total_par: totalPar,
      created_by: user.id,
    }).select().single();

    if (error || !t) { setBusy(false); toast.error(error?.message ?? "Ошибка"); return; }

    const holeRows = DEFAULT_PARS_18.map((par, i) => ({
      tournament_id: t.id,
      hole_number: i + 1,
      par,
      handicap_index: i + 1,
    }));
    const { error: he } = await supabase.from("holes").insert(holeRows);
    setBusy(false);
    if (he) toast.error(he.message);
    else { toast.success("Турнир создан"); setName(""); }
  };

  const setStatus = async (id: string, status: "upcoming"|"live"|"finished") => {
    const { error } = await supabase.from("tournaments").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Статус обновлён");
  };

  if (loading) {
    return (<div><Header /><div className="container py-10 text-muted-foreground">Загрузка…</div></div>);
  }

  if (!isAdmin) {
    return (
      <div>
        <Header />
        <div className="container py-10">
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Админ-панель
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasAdminInDb === false ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    В системе ещё нет администратора. Первый зарегистрированный
                    пользователь может стать админом.
                  </p>
                  <Button onClick={claimAdmin} disabled={busy} className="w-full">
                    Сделать меня админом
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  У вас нет прав администратора. Обратитесь к админу клуба.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <section className="bg-hero border-b border-border">
        <div className="container py-8">
          <h1 className="font-display text-3xl uppercase tracking-wider md:text-4xl">
            Админ-панель
          </h1>
          <p className="text-muted-foreground">Управление турнирами Минского гольф-клуба</p>
        </div>
      </section>

      <section className="container py-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Новый турнир
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createTournament} className="space-y-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Minsk Open 2026" required />
              </div>
              <div className="space-y-2">
                <Label>Формат</Label>
                <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stroke_play">Stroke Play</SelectItem>
                    <SelectItem value="stableford">Stableford</SelectItem>
                    <SelectItem value="team_scramble">Team Scramble</SelectItem>
                    <SelectItem value="team_best_ball">Best Ball</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Дата</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <p className="text-xs text-muted-foreground">
                Создаётся 18 лунок Par 72 (стандарт). Можно отредактировать в БД.
              </p>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Создаём…" : "Создать турнир"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Турниры</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tournaments.length === 0 && <p className="text-sm text-muted-foreground">Пока нет турниров.</p>}
            {tournaments.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <Link to={`/t/${t.id}`} className="font-medium hover:text-primary">{t.name}</Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                    {t.start_date}
                  </div>
                </div>
                <Select value={t.status} onValueChange={(v: any) => setStatus(t.id, v)}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Скоро</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="finished">Завершён</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}