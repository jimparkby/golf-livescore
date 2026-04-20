import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/scoring/Header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { formatToPar, toParColorClass, stablefordPoints } from '@/lib/scoring'

type Tournament = {
  id: string; name: string; course_name: string
  format: 'stroke_play' | 'stableford' | 'team_scramble' | 'team_best_ball'
  status: 'upcoming' | 'live' | 'finished'
  start_date: string; total_holes: number; total_par: number
}
type Hole = { id: string; hole_number: number; par: number }
type Player = { user_id: string; team_name: string | null; display_name: string; handicap: number | null }
type Score = { user_id: string; hole_id: string; hole_number: number; strokes: number | null; stableford_points: number | null }

const FORMAT_LABEL: Record<string, string> = {
  stroke_play: 'Stroke Play', stableford: 'Stableford',
  team_scramble: 'Team Scramble', team_best_ball: 'Best Ball',
}

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [holes, setHoles] = useState<Hole[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  const load = async () => {
    if (!id) return
    try {
      const data = await api.get(`/api/tournaments/${id}`)
      setTournament(data.tournament)
      setHoles(data.holes)
      setPlayers(data.players)
      setScores(data.scores)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [id])

  const playerStats = useMemo(() => {
    if (!tournament) return []
    const parByHole = new Map(holes.map((h) => [h.id, h.par]))
    return players.map((pl) => {
      const mine = scores.filter((s) => s.user_id === pl.user_id && s.strokes != null)
      const strokes = mine.reduce((sum, s) => sum + (s.strokes ?? 0), 0)
      const par = mine.reduce((sum, s) => sum + (parByHole.get(s.hole_id) ?? 0), 0)
      const toPar = strokes - par
      const stbf = mine.reduce((sum, s) => sum + stablefordPoints(s.strokes ?? 0, parByHole.get(s.hole_id) ?? 0), 0)
      const lastHole = mine.reduce((m, s) => Math.max(m, s.hole_number), 0)
      const thru = mine.length >= tournament.total_holes ? 'F' : String(lastHole || '—')
      return { ...pl, playedHoles: mine.length, strokes, toPar, stableford: stbf, thru }
    })
  }, [players, scores, holes, tournament])

  const sorted = useMemo(() => {
    const isStbf = tournament?.format === 'stableford'
    return [...playerStats]
      .sort((a, b) => {
        if (isStbf) return b.stableford - a.stableford
        if (a.playedHoles === 0 && b.playedHoles === 0) return 0
        if (a.playedHoles === 0) return 1
        if (b.playedHoles === 0) return -1
        return a.toPar !== b.toPar ? a.toPar - b.toPar : a.strokes - b.strokes
      })
      .map((p, idx, arr) => {
        const prev = arr[idx - 1]
        const key = isStbf ? p.stableford : `${p.toPar}-${p.strokes}-${p.playedHoles === 0}`
        const prevKey = prev ? (isStbf ? prev.stableford : `${prev.toPar}-${prev.strokes}-${prev.playedHoles === 0}`) : null
        return { ...p, pos: prevKey !== null && String(key) === String(prevKey) ? (idx) : idx + 1 }
      })
  }, [playerStats, tournament])

  const isPlayer = !!user && players.some((p) => p.user_id === user.id)

  const join = async () => {
    if (!user || !id) return
    setJoining(true)
    try {
      await api.post(`/api/tournaments/${id}/join`, {})
      toast.success('Вы участвуете в турнире')
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setJoining(false)
    }
  }

  if (loading) return <div><Header /><div className="container py-10 text-muted-foreground">Загрузка…</div></div>
  if (!tournament) return <div><Header /><div className="container py-10"><Link to="/" className="text-primary hover:underline">← На главную</Link><p className="mt-4 text-muted-foreground">Турнир не найден.</p></div></div>

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <section className="bg-hero border-b border-border">
        <div className="container py-8">
          <Link to="/" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Все турниры
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                {tournament.status === 'live' && <Badge className="animate-pulse bg-destructive text-destructive-foreground">● LIVE</Badge>}
                <Badge variant="outline">{FORMAT_LABEL[tournament.format]}</Badge>
              </div>
              <h1 className="font-display text-3xl uppercase tracking-wider md:text-5xl">{tournament.name}</h1>
              <p className="mt-1 text-muted-foreground">{tournament.course_name} · {tournament.total_holes} лунок · Par {tournament.total_par}</p>
            </div>
            <div className="flex gap-2">
              {user && !isPlayer && <Button onClick={join} disabled={joining}>{joining ? 'Записываем…' : 'Участвовать'}</Button>}
              {isPlayer && <Button asChild><Link to={`/t/${tournament.id}/score`}><ClipboardList className="mr-2 h-4 w-4" /> Ввести счёт</Link></Button>}
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
                  {tournament.format === 'stableford'
                    ? <th className="px-3 py-3 text-right">Очки</th>
                    : <th className="px-3 py-3 text-right">TO PAR</th>}
                  <th className="px-3 py-3 text-right">THRU</th>
                  <th className="px-3 py-3 text-right hidden sm:table-cell">УДАРЫ</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Пока нет участников.</td></tr>}
                {sorted.map((p) => (
                  <tr key={p.user_id} className={`row-divider transition hover:bg-muted/20 ${user?.id === p.user_id ? 'bg-primary/5' : ''}`}>
                    <td className="px-3 py-3 font-mono-tab text-base font-semibold">{p.pos}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{p.display_name}</div>
                      {p.team_name && <div className="text-xs text-muted-foreground">{p.team_name}</div>}
                    </td>
                    {tournament.format === 'stableford'
                      ? <td className="px-3 py-3 text-right font-mono-tab text-lg font-semibold">{p.stableford}</td>
                      : <td className={`px-3 py-3 text-right font-mono-tab text-lg font-semibold ${toParColorClass(p.toPar)}`}>{p.playedHoles === 0 ? '—' : formatToPar(p.toPar)}</td>}
                    <td className="px-3 py-3 text-right font-mono-tab text-muted-foreground">{p.thru}</td>
                    <td className="px-3 py-3 text-right font-mono-tab hidden sm:table-cell">{p.playedHoles === 0 ? '—' : p.strokes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  )
}
