import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Trophy, Send } from 'lucide-react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default function Auth() {
  const { user, loading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [tgPending, setTgPending] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const onTelegramLogin = async () => {
    setBusy(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/tg-link`)
      if (!res.ok) throw new Error('Ошибка сервера')
      const { url, token } = await res.json()

      window.open(url, '_blank')
      setTgPending(true)
      setBusy(false)

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`${BACKEND_URL}/api/auth/tg-status?token=${token}`)
          const status = await statusRes.json()

          if (status.expired) {
            clearInterval(pollRef.current!)
            setTgPending(false)
            toast.error('Ссылка истекла. Попробуйте снова.')
            return
          }

          if (status.verified) {
            clearInterval(pollRef.current!)
            localStorage.setItem('golf_jwt', status.jwt)
            await refreshUser()
            toast.success('Вы вошли через Telegram!')
            navigate('/')
          }
        } catch {
          // ignore network errors during polling
        }
      }, 2000)
    } catch (err: any) {
      setBusy(false)
      toast.error(err.message ?? 'Не удалось подключиться к серверу')
    }
  }

  return (
    <div className="min-h-screen bg-hero">
      <div className="container flex min-h-screen items-center justify-center py-10">
        <Card className="w-full max-w-md border-border/60 shadow-elegant">
          <CardHeader className="text-center">
            <Link to="/" className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Trophy className="h-6 w-6" />
            </Link>
            <CardTitle className="font-display text-2xl uppercase tracking-wider">Minsk Golf</CardTitle>
            <CardDescription>Лайвскоринг турниров</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full bg-[#229ED9] hover:bg-[#1a8dbf] text-white"
              onClick={onTelegramLogin}
              disabled={busy || tgPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {tgPending ? 'Ожидаем подтверждения в Telegram…' : 'Войти через Telegram'}
            </Button>

            {tgPending && (
              <p className="text-center text-sm text-muted-foreground">
                Откройте бота и нажмите <strong>Start</strong>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
