import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/scoring/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Trophy, Users } from 'lucide-react'

type Tournament = {
  id: string
  name: string
  course_name: string
  format: string
  status: 'upcoming' | 'live' | 'finished'
  start_date: string
  total_holes: number
  total_par: number
}

const FORMAT_LABEL: Record<string, string> = {
  stroke_play: 'Stroke Play',
  stableford: 'Stableford',
  team_scramble: 'Scramble',
  team_best_ball: 'Best Ball',
}

const STATUS_STYLE: Record<string, string> = {
  live: 'bg-destructive text-destructive-foreground animate-pulse',
  upcoming: 'bg-secondary text-secondary-foreground',
  finished: 'bg-muted text-muted-foreground',
}

const STATUS_LABEL: Record<string, string> = {
  live: '● LIVE',
  upcoming: 'Скоро',
  finished: 'Завершён',
}

export default function Index() {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const data = await api.get('/api/tournaments')
      setTournaments(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <section className="bg-hero border-b border-border">
        <div className="container py-16 md:py-24">
          <Badge className="mb-4 bg-primary/15 text-primary hover:bg-primary/20">
            Минский гольф-клуб
          </Badge>
          <h1 className="font-display text-4xl uppercase tracking-wider md:text-6xl">
            Live Scoring
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground md:text-lg">
            Следите за турнирами в реальном времени. Лидерборд обновляется
            мгновенно, как только игроки вписывают счёт.
          </p>
          {!user && (
            <div className="mt-6 flex gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Войти и записать счёт</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="container py-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl uppercase tracking-wider">Турниры</h2>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Загрузка…</div>
        ) : tournaments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Пока нет турниров.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <Link key={t.id} to={`/t/${t.id}`}>
                <Card className="group h-full transition hover:border-primary/60 hover:shadow-elegant">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge className={STATUS_STYLE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {FORMAT_LABEL[t.format] ?? t.format}
                      </span>
                    </div>
                    <h3 className="font-display text-xl uppercase tracking-wide group-hover:text-primary">
                      {t.name}
                    </h3>
                    <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{t.course_name}</div>
                      <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(t.start_date).toLocaleDateString('ru-RU')}</div>
                      <div className="flex items-center gap-2"><Users className="h-4 w-4" />{t.total_holes} лунок · Par {t.total_par}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
