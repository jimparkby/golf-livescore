import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '@/lib/api'

export type AuthUser = {
  id: string
  telegram_id: string
  telegram_username: string | null
  telegram_first_name: string | null
  telegram_last_name: string | null
  display_name: string
  country: string | null
  handicap: number
  is_admin: boolean
}

type AuthCtx = {
  user: AuthUser | null
  loading: boolean
  isAdmin: boolean
  signOut: () => void
  refreshUser: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  isAdmin: false,
  signOut: () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = async () => {
    const token = localStorage.getItem('golf_jwt')
    if (!token) { setLoading(false); return }
    try {
      const data = await api.get('/api/profile')
      setUser(data)
    } catch {
      localStorage.removeItem('golf_jwt')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUser() }, [])

  const signOut = () => {
    localStorage.removeItem('golf_jwt')
    setUser(null)
  }

  return (
    <Ctx.Provider value={{ user, loading, isAdmin: user?.is_admin ?? false, signOut, refreshUser: loadUser }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
