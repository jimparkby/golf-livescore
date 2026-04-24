import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { useGolf } from '@/store/golfStore'

export type AuthUser = {
  id: string
  email: string
  first_name: string
  last_name: string
  hcp: number
  home_club: string | null
  city: string | null
  is_admin: boolean
  created_at: string
}

type AuthCtx = {
  user: AuthUser | null
  loading: boolean
  signIn: (token: string) => Promise<void>
  signOut: () => void
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const syncProfile = (data: AuthUser) => {
    useGolf.getState().updateProfile({
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      hcp: data.hcp,
      homeClub: data.home_club ?? 'Golf Club Minsk',
      city: data.city ?? 'Минск, Беларусь',
      memberSince: new Date(data.created_at).getFullYear().toString(),
    })
  }

  const loadUser = async () => {
    const token = localStorage.getItem('golf_jwt')
    if (!token) { setLoading(false); return }
    try {
      const data = await api.get<AuthUser>('/api/profile')
      setUser(data)
      syncProfile(data)
    } catch {
      localStorage.removeItem('golf_jwt')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUser() }, [])

  const signIn = async (token: string) => {
    localStorage.setItem('golf_jwt', token)
    await loadUser()
  }

  const signOut = () => {
    localStorage.removeItem('golf_jwt')
    localStorage.removeItem('golfminsk-store')
    setUser(null)
    window.location.href = '/'
  }

  return (
    <Ctx.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
