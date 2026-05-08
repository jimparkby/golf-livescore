import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useGolf } from '@/store/golfStore'
import { BASE } from '@/lib/api'

interface AuthCtx {
  userId: string | null
  loading: boolean
  signIn: (jwt: string) => Promise<void>
  signOut: () => void
}

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

const AuthContext = createContext<AuthCtx>({
  userId: null,
  loading: true,
  signIn: async () => {},
  signOut: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const updateProfile = useGolf(s => s.updateProfile)
  const loadRounds = useGolf(s => s.loadRounds)

  const loadProfile = async () => {
    const token = localStorage.getItem('golf_jwt')
    if (!token) return
    try {
      const res = await fetch(`${BASE}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        updateProfile({
          firstName: data.first_name ?? '',
          lastName: data.last_name ?? '',
          username: data.username ?? '',
          hcp: Number(data.hcp) || 0,
          homeClub: data.home_club ?? 'Golf Club Minsk',
          city: data.city ?? 'Минск, Беларусь',
          notificationsEnabled: data.notifications_enabled ?? true,
          defaultTee: (data.default_tee as import('@/lib/courses').TeeColor) ?? 'yellow',
        })
        await loadRounds()
      }
    } catch {}
  }

  const signIn = async (jwt: string) => {
    localStorage.setItem('golf_jwt', jwt)
    const payload = parseJwt(jwt)
    if (payload?.userId) {
      setUserId(payload.userId)
      await loadProfile()
    }
  }

  const signOut = () => {
    localStorage.removeItem('golf_jwt')
    localStorage.removeItem('golfminsk-store')
    useGolf.getState().resetStore()
    setUserId(null)
  }

  useEffect(() => {
    const token = localStorage.getItem('golf_jwt')
    if (!token) {
      setLoading(false)
      return
    }
    const payload = parseJwt(token)
    if (!payload?.userId || (payload.exp && payload.exp * 1000 < Date.now())) {
      localStorage.removeItem('golf_jwt')
      setLoading(false)
      return
    }
    setUserId(payload.userId)
    loadProfile().finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ userId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
