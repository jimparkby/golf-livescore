import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/scoring/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Trophy, Shield } from 'lucide-react'
import { DEFAULT_PARS_18 } from '@/lib/scoring'

type Tournament = {
  id: string; name: string; format: string
  status: string; start_date: string; total_holes: number; total_par: number
}

export default function Admin() {
  const { user, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [name, setName] = useState('')
  const [courseName, setCourseName] = useState('Минский гольф-клуб')
  const [format, setFormat] = useState<'stroke_play' | 'stableford' | 'team_scramble' | 'team_best_ball'>('stroke_play')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
    if (!loading && user && !isAdmin) navigate('/')
  }, [user, loading, isAdmin, navigate])

  const loadTournaments = async () => {
    try {
      const data = await api.get('/api/tournaments')
      setTournaments(data)
    } catch {}
  }

  useEffect(() => {
    if (isAdmin) loadTournaments()
  }, [isAdmin])

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) { toast.error('Название слишком короткое'); return }
    setBusy(true)
    try {
      await api.post('/api/tournaments', { name, course_name: courseName, format, start_date: date })
      toast.success('Турнир создан')
      setName('')
      loadTournaments()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (id: string, status: 'upcoming' | 'live' | 'finished') => {
    try {
      await api.patch(`/api/tournaments/${id}/status`, { status })
      toast.success('Статус обновлён')
      loadTournaments()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const FORMAT_LABEL: Record<string, string> = {
    stroke_play: 'Stroke Play', stableford: 'Stableford',
    team_scramble: 'Team Scramble', team_best_ball: 'Best Ball',
  }
  const STATUS_STYLE: Record<string, string> = {
    live: 'bg-destructive text-destructive-foreground',
    upcoming: 'bg-secondary text-secondary-foreground',
    finished: 'bg-muted text-muted-foreground',
  }

  if (loading) return null

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <section className="container py-8">
        <div className="mb-6 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl uppercase tracking-wider">Администратор</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-display text-base uppercase tracking-wider">Создать турнир</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createTournament} className="space-y-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={name} maxLength={80} required onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Поле / площадка</Label>
                <Input value={courseName} maxLength={80} onChange={(e) => setCourseName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Формат</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as any)}>
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
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Создаём…' : 'Создать турнир (18 лунок)'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <h2 className="font-display mb-3 text-xl uppercase tracking-wider">Все турниры</h2>
        <div className="space-y-3">
          {tournaments.length === 0 && <p className="text-muted-foreground">Нет турниров.</p>}
          {tournaments.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={STATUS_STYLE[t.status]}>{t.status.toUpperCase()}</Badge>
                      <span className="text-xs text-muted-foreground">{FORMAT_LABEL[t.format]}</span>
                    </div>
                    <Link to={`/t/${t.id}`} className="font-display text-lg uppercase tracking-wide hover:text-primary">
                      {t.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{new Date(t.start_date).toLocaleDateString('ru-RU')} · Par {t.total_par}</p>
                  </div>
                  <div className="flex gap-2">
                    {t.status !== 'upcoming' && <Button size="sm" variant="outline" onClick={() => setStatus(t.id, 'upcoming')}>Скоро</Button>}
                    {t.status !== 'live' && <Button size="sm" variant="outline" onClick={() => setStatus(t.id, 'live')}>Live</Button>}
                    {t.status !== 'finished' && <Button size="sm" variant="outline" onClick={() => setStatus(t.id, 'finished')}>Завершить</Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
