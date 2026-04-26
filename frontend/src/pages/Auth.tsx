import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            username?: string
            first_name?: string
            last_name?: string
          }
        }
        ready: () => void
        expand: () => void
      }
    }
  }
}

const BOT_USERNAME = import.meta.env.VITE_TG_BOT_USERNAME ?? 'golflivescorebot'

export default function AuthPage() {
  const { signIn } = useAuth()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
  const isInTelegram = Boolean(tgUser?.id)

  const authWithTelegram = async () => {
    if (!tgUser?.id) return
    setStatus('loading')
    try {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: tgUser.id,
          username: tgUser.username ?? null,
          first_name: tgUser.first_name ?? '',
          last_name: tgUser.last_name ?? '',
        }),
      })
      let data: Record<string, string> = {}
      try { data = await res.json() } catch { /* non-json */ }
      if (!res.ok) throw new Error(data.error ?? `Ошибка сервера (${res.status})`)
      await signIn(data.jwt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
      setStatus('error')
    }
  }

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
    }
    if (tgUser?.id) {
      authWithTelegram()
    }
  }, [])

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center text-primary-foreground">
        <div className="font-black text-4xl tracking-wider mb-1">GOLFMINSK</div>
        <div className="text-xs opacity-60 uppercase tracking-[0.25em]">Live Scoring</div>
      </div>

      <div className="w-full max-w-xs text-center">
        {status === 'loading' ? (
          <div className="flex flex-col items-center gap-3 text-primary-foreground">
            <div className="h-8 w-8 rounded-full border-2 border-action border-t-transparent animate-spin" />
            <div className="text-sm opacity-70">Входим через Telegram…</div>
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-400 text-sm px-4 break-words">{error}</div>
            {isInTelegram ? (
              <button
                onClick={authWithTelegram}
                className="inline-flex items-center gap-2 bg-[#2AABEE] text-white font-semibold px-6 py-3.5 rounded-2xl text-sm"
              >
                Попробовать ещё раз
              </button>
            ) : (
              <a
                href={`https://t.me/${BOT_USERNAME}?startapp=open`}
                className="inline-flex items-center gap-2 bg-[#2AABEE] text-white font-semibold px-6 py-3.5 rounded-2xl text-sm"
              >
                <TelegramIcon />
                Открыть в Telegram
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Войдите через Telegram — никаких паролей
            </p>
            <a
              href={`https://t.me/${BOT_USERNAME}?startapp=open`}
              className="inline-flex items-center gap-2 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold px-7 py-4 rounded-2xl transition-colors shadow-lg"
            >
              <TelegramIcon />
              Войти через Telegram
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function TelegramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
    </svg>
  )
}
