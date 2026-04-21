import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/scoring/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play as PlayIcon, Trophy } from 'lucide-react'

type Row = {
  id: string; name: string; course_name: string
  status: 'upcoming' | 'live' | 'finished'
  format: string; total_holes: number
}

export default function Play() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
  }, [loading, user, navigate])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const all = await api.get('/api/tournaments')
        const myRows: Row[] = []
        for (const t of all) {
          try {
            const detail = await api.get(`/api/tournaments/${t.id}`)
            if (detail.players.some((p: any) => p.user_id === user.id)) {
              myRows.push(t)
            }
          } catch {}
        }
        setRows(myRows)
      } finally {
        setBusy(false)
      }
    }
    load()
  }, [user])

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <section className="container py-8">
        <h1 className="font-display text-2xl uppercase tracking-wider">Играть раунд</h1>
        <p className="mt-1 text-sm text-muted-foreground">Турниры, в которых вы участвуете.</p>

        <div className="mt-6 space-y-3">
          {busy ? (
            <div className="text-muted-foreground">Загрузка…</div>
          ) : rows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="mb-4 text-muted-foreground">Вы пока не записаны ни в один турнир.</p>
                <Button asChild><Link to="/">Найти турнир</Link></Button>
              </CardContent>
            </Card>
          ) : (
            rows.map((r) => (
              <Card key={r.id} className="transition hover:border-primary/60">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      {r.status === 'live' && <Badge className="animate-pulse bg-destructive text-destructive-foreground">● LIVE</Badge>}
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">{r.total_holes} лунок</span>
                    </div>
                    <div className="font-display truncate text-lg uppercase tracking-wide">{r.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.course_name}</div>
                  </div>
                  <Button asChild size="sm">
                    <Link to={`/t/${r.id}/score`}><PlayIcon className="mr-1 h-4 w-4" /> Счёт</Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
