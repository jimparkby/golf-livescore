import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/scoring/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { formatToPar, toParColorClass, stablefordPoints, holeLabel } from '@/lib/scoring'

type Hole = { id: string; hole_number: number; par: number }
type Score = { hole_id: string; hole_number: number; strokes: number | null; stableford_points: number | null }

export default function Scorecard() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [holes, setHoles] = useState<Hole[]>([])
  const [scores, setScores] = useState<Map<string, Score>>(new Map())
  const [savingHole, setSavingHole] = useState<string | null>(null)
  const [tournamentName, setTournamentName] = useState('')
  const [enrolled, setEnrolled] = useState<boolean | null>(null)

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth')
  }, [user, authLoading, navigate])

  const load = async () => {
    if (!id || !user) return
    try {
      const data = await api.get(`/api/tournaments/${id}`)
      setTournamentName(data.tournament.name)
      setHoles(data.holes)
      setEnrolled(data.players.some((p: any) => p.user_id === user.id))
      const map = new Map<string, Score>()
      data.scores.filter((s: any) => s.user_id === user.id).forEach((s: any) => map.set(s.hole_id, s))
      setScores(map)
    } catch {}
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [id, user])

  const totals = useMemo(() => {
    let strokes = 0, par = 0, played = 0, stbf = 0
    holes.forEach((h) => {
      const sc = scores.get(h.id)
      if (sc?.strokes != null) {
        played++
        strokes += sc.strokes
        par += h.par
        stbf += stablefordPoints(sc.strokes, h.par)
      }
    })
    return { strokes, toPar: strokes - par, played, stbf }
  }, [holes, scores])

  const setStrokes = async (hole: Hole, strokes: number | null) => {
    if (!user || !id) return
    setSavingHole(hole.id)
    try {
      await api.put('/api/scores', {
        tournament_id: id,
        hole_id: hole.id,
        hole_number: hole.hole_number,
        strokes,
        stableford_points: strokes !== null ? stablefordPoints(strokes, hole.par) : null,
      })
      const next = new Map(scores)
      if (strokes === null) {
        next.delete(hole.id)
      } else {
        next.set(hole.id, { hole_id: hole.id, hole_number: hole.hole_number, strokes, stableford_points: stablefordPoints(strokes, hole.par) })
      }
      setScores(next)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingHole(null)
    }
  }

  if (authLoading || enrolled === null) return <div><Header /><div className="container py-10 text-muted-foreground">Загрузка…</div></div>
  if (!enrolled) return <div><Header /><div className="container py-10"><p className="mb-3 text-muted-foreground">Вы не записаны на этот турнир.</p><Button asChild><Link to={`/t/${id}`}>К турниру</Link></Button></div></div>

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <section className="bg-hero border-b border-border">
        <div className="container py-6">
          <Link to={`/t/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> К турниру
          </Link>
          <h1 className="font-display text-2xl uppercase tracking-wider md:text-3xl">Карточка счёта</h1>
          <p className="text-muted-foreground">{tournamentName}</p>
        </div>
      </section>

      <section className="container py-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Лунок сыграно" value={`${totals.played} / ${holes.length}`} />
          <Stat label="Удары" value={String(totals.strokes)} />
          <Stat label="To Par" value={totals.played === 0 ? '—' : formatToPar(totals.toPar)} className={toParColorClass(totals.toPar)} />
          <Stat label="Stableford" value={String(totals.stbf)} />
        </div>
      </section>

      <section className="container">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {holes.map((h) => {
            const sc = scores.get(h.id)
            const strokes = sc?.strokes ?? null
            return (
              <Card key={h.id} className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Лунка</div>
                    <div className="font-display text-2xl">{h.hole_number}</div>
                  </div>
                  <Badge variant="outline">PAR {h.par}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Button variant="outline" size="icon"
                    disabled={savingHole === h.id || strokes === null || strokes <= 1}
                    onClick={() => setStrokes(h, strokes === null ? null : Math.max(1, strokes - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <div className={`font-mono-tab text-4xl font-bold ${strokes != null ? toParColorClass(strokes - h.par) : 'text-muted-foreground'}`}>
                      {strokes ?? '—'}
                    </div>
                    {strokes != null && <div className="text-xs uppercase tracking-wider text-muted-foreground">{holeLabel(strokes, h.par)}</div>}
                  </div>
                  <Button variant="outline" size="icon"
                    disabled={savingHole === h.id || (strokes != null && strokes >= 15)}
                    onClick={() => setStrokes(h, (strokes ?? h.par) + (strokes === null ? 0 : 1))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1">
                  {[1,2,3,4,5,6,7].map((n) => (
                    <Button key={n} size="sm" variant={strokes === n ? 'default' : 'secondary'}
                      className="h-9 px-0 font-mono-tab" disabled={savingHole === h.id}
                      onClick={() => setStrokes(h, n)}>{n}</Button>
                  ))}
                </div>
                {strokes != null && (
                  <Button variant="ghost" size="sm" className="mt-2 w-full text-muted-foreground"
                    onClick={() => setStrokes(h, null)}>Очистить</Button>
                )}
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono-tab text-2xl font-semibold ${className ?? ''}`}>{value}</div>
    </Card>
  )
}
