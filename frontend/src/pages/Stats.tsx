import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/scoring/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatToPar } from '@/lib/scoring'
import { BarChart3 } from 'lucide-react'

type Stats = {
  rounds: number; holes: number; avgStrokes: number; bestToPar: number
  eagles: number; birdies: number; pars: number; bogeys: number; doublesPlus: number; stableford: number
}

export default function Stats() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
  }, [loading, user, navigate])

  useEffect(() => {
    if (!user) return
    api.get('/api/stats').then((data) => { setStats(data); setBusy(false) }).catch(() => setBusy(false))
  }, [user])

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <section className="container py-8">
        <h1 className="font-display text-2xl uppercase tracking-wider">Статистика</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ваши результаты по всем сыгранным турнирам.</p>

        {busy ? (
          <div className="mt-6 text-muted-foreground">Загрузка…</div>
        ) : !stats || stats.holes === 0 ? (
          <Card className="mt-6 border-dashed">
            <CardContent className="py-12 text-center">
              <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Сыграйте хотя бы одну лунку, чтобы увидеть статистику.</p>
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
                <CardTitle className="font-display text-base uppercase tracking-wider">Распределение результатов</CardTitle>
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
                <span className="text-sm uppercase tracking-wider text-muted-foreground">Очки Stableford всего</span>
                <span className="font-mono-tab text-2xl font-semibold">{stats.stableford}</span>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono-tab text-2xl font-semibold">{value}</div>
    </CardContent></Card>
  )
}

function ScoreTile({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-center">
      <div className={`font-mono-tab text-xl font-semibold ${className}`}>{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  )
}
