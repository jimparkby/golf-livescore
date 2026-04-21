import { useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Trophy } from 'lucide-react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? ''
const BOT_USERNAME = import.meta.env.VITE_TG_BOT_USERNAME || ''

declare global {
  interface Window {
    onTelegramAuth: (user: Record<string, string>) => void
  }
}

export default function Auth() {
  const { user, loading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  useEffect(() => {
    if (!containerRef.current) return

    window.onTelegramAuth = async (tgUser) => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tgUser),
        })
        if (!res.ok) throw new Error('Ошибка авторизации')
        const data = await res.json()
        localStorage.setItem('golf_jwt', data.jwt)
        await refreshUser()
        toast.success('Добро пожаловать!')
        navigate('/')
      } catch (err: any) {
        toast.error(err.message ?? 'Ошибка входа')
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-lang', 'ru')
    script.async = true

    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(script)
  }, [loading])

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
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-muted-foreground">Войдите через Telegram</p>
              <div ref={containerRef} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
