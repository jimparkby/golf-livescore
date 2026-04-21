import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { Header } from '@/components/scoring/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { LogOut, Shield, User as UserIcon, Send } from 'lucide-react'

export default function Profile() {
  const { user, loading, isAdmin, signOut, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [country, setCountry] = useState('')
  const [handicap, setHandicap] = useState('0')
  const [tgUsername, setTgUsername] = useState('')
  const [tgFirstName, setTgFirstName] = useState('')
  const [tgLastName, setTgLastName] = useState('')

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
  }, [loading, user, navigate])

  useEffect(() => {
    if (!user) return
    setDisplayName(user.display_name ?? '')
    setCountry(user.country ?? '')
    setHandicap(String(user.handicap ?? 0))
    setTgUsername(user.telegram_username ?? '')
    setTgFirstName(user.telegram_first_name ?? '')
    setTgLastName(user.telegram_last_name ?? '')
  }, [user])

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/api/profile', {
        display_name: displayName,
        country,
        handicap: Number(handicap) || 0,
        telegram_username: tgUsername,
        telegram_first_name: tgFirstName,
        telegram_last_name: tgLastName,
      })
      await refreshUser()
      toast.success('Профиль сохранён')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <section className="container py-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <UserIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display truncate text-2xl uppercase tracking-wider">
              {user?.display_name || 'Игрок'}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {user?.telegram_username ? `@${user.telegram_username}` : `tg: ${user?.telegram_id}`}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {isAdmin && (
                <Badge variant="outline">
                  <Shield className="mr-1 h-3 w-3" /> Админ
                </Badge>
              )}
              <Badge variant="outline" className="border-[#229ED9] text-[#229ED9]">
                <Send className="mr-1 h-3 w-3" /> Telegram
              </Badge>
            </div>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="font-display text-base uppercase tracking-wider">
              Данные игрока
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя (отображаемое)</Label>
              <Input id="name" value={displayName} maxLength={50}
                onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Страна</Label>
              <Input id="country" value={country} maxLength={2} placeholder="BY"
                onChange={(e) => setCountry(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hcp">Гандикап</Label>
              <Input id="hcp" type="number" step="0.1" value={handicap}
                onChange={(e) => setHandicap(e.target.value)} />
            </div>

            <div className="border-t pt-4">
              <p className="mb-3 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                <Send className="h-3 w-3" /> Данные Telegram
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="tg-first">Имя</Label>
                  <Input id="tg-first" value={tgFirstName} maxLength={64}
                    onChange={(e) => setTgFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tg-last">Фамилия</Label>
                  <Input id="tg-last" value={tgLastName} maxLength={64}
                    onChange={(e) => setTgLastName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tg-username">Username (@)</Label>
                  <Input id="tg-username" value={tgUsername} maxLength={32} placeholder="username"
                    onChange={(e) => setTgUsername(e.target.value.replace(/^@/, ''))} />
                </div>
              </div>
            </div>

            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </CardContent>
        </Card>

        {isAdmin && (
          <Button variant="outline" className="mt-3 w-full" onClick={() => navigate('/admin')}>
            <Shield className="mr-2 h-4 w-4" /> Панель администратора
          </Button>
        )}

        <Button variant="outline" className="mt-3 w-full"
          onClick={() => { signOut(); navigate('/') }}>
          <LogOut className="mr-2 h-4 w-4" /> Выйти
        </Button>
      </section>
    </div>
  )
}
