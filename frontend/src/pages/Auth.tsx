import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { BASE } from '@/lib/api'

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
            photo_url?: string
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'name_input'>('idle')
  const [error, setError] = useState('')
  const [errorRu, setErrorRu] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
  const isInTelegram = Boolean(tgUser?.id)

  const authWithTelegram = async (providedFirstName?: string, providedLastName?: string) => {
    if (!tgUser?.id) return
    setStatus('loading')
    setError('')
    setErrorRu('')
    try {
      const res = await fetch(`${BASE}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: tgUser.id,
          username: tgUser.username ?? null,
          first_name: providedFirstName || tgUser.first_name || '',
          last_name: providedLastName || tgUser.last_name || '',
          photo_url: tgUser.photo_url ?? null,
        }),
      })
      let data: Record<string, any> = {}
      try { data = await res.json() } catch { /* non-json */ }

      if (!res.ok) {
        // Check if we need name input
        if (data.requiresNameInput) {
          setError(data.error ?? 'Please enter your full name')
          setErrorRu(data.errorRu ?? '')
          setStatus('name_input')
          return
        }
        throw new Error(data.errorRu || data.error || `Server error (${res.status})`)
      }
      await signIn(data.jwt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both first and last name')
      setErrorRu('Пожалуйста, введите имя и фамилию')
      return
    }
    authWithTelegram(firstName.trim(), lastName.trim())
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
        <div className="mt-6 text-base font-medium opacity-90">
          Welcome to Golf Live Scoring Minsk.<br />
          Good luck out there!
        </div>
      </div>

      <div className="w-full max-w-xs text-center">
        {status === 'loading' ? (
          <div className="flex flex-col items-center gap-3 text-primary-foreground">
            <div className="h-8 w-8 rounded-full border-2 border-action border-t-transparent animate-spin" />
            <div className="text-sm opacity-70">Logging in via Telegram…</div>
          </div>
        ) : status === 'name_input' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-primary-foreground text-sm px-4">
              <p className="font-semibold mb-2">Введите ваши имя и фамилию</p>
              <p className="text-xs opacity-70">
                Для доступа введите имя и фамилию <strong>на английском</strong> как в Golf Club Minsk
              </p>
            </div>
            {(error || errorRu) && (
              <div className="text-red-400 text-sm px-4 break-words">
                {errorRu || error}
              </div>
            )}
            <form onSubmit={handleNameSubmit} className="w-full space-y-3">
              <input
                type="text"
                placeholder="First Name (English)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-primary-foreground placeholder:text-primary-foreground/50 border border-white/20 focus:border-action focus:outline-none"
                autoCapitalize="words"
                autoComplete="given-name"
              />
              <input
                type="text"
                placeholder="Last Name (English)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-primary-foreground placeholder:text-primary-foreground/50 border border-white/20 focus:border-action focus:outline-none"
                autoCapitalize="words"
                autoComplete="family-name"
              />
              <button
                type="submit"
                disabled={!firstName.trim() || !lastName.trim()}
                className="w-full bg-action hover:bg-action/90 disabled:bg-action/50 text-white font-semibold px-6 py-3.5 rounded-2xl text-sm transition-colors"
              >
                Продолжить
              </button>
            </form>
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-400 text-sm px-4 break-words">{error}</div>
            {isInTelegram ? (
              <button
                onClick={() => authWithTelegram()}
                className="inline-flex items-center gap-2 bg-[#2AABEE] text-white font-semibold px-6 py-3.5 rounded-2xl text-sm"
              >
                Try again
              </button>
            ) : (
              <a
                href={`https://t.me/${BOT_USERNAME}?startapp=open`}
                className="inline-flex items-center gap-2 bg-[#2AABEE] text-white font-semibold px-6 py-3.5 rounded-2xl text-sm"
              >
                <TelegramIcon />
                Open in Telegram
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Sign in via Telegram — no passwords needed
            </p>
            <a
              href={`https://t.me/${BOT_USERNAME}?startapp=open`}
              className="inline-flex items-center gap-2 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold px-7 py-4 rounded-2xl transition-colors shadow-lg"
            >
              <TelegramIcon />
              Sign in via Telegram
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
