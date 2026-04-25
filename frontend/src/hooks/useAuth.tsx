import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useGolf } from '@/store/golfStore'

interface AuthCtx {
  deviceId: string
  loading: boolean
}

const getDeviceId = (): string => {
  let id = localStorage.getItem('golf_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('golf_device_id', id)
  }
  return id
}

const AuthContext = createContext<AuthCtx>({ deviceId: '', loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const deviceId = getDeviceId()
  const updateProfile = useGolf(s => s.updateProfile)

  useEffect(() => {
    fetch(`/api/profile?device_id=${deviceId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.first_name) {
          updateProfile({
            firstName: data.first_name,
            lastName: data.last_name,
            hcp: data.hcp ?? 0,
            homeClub: data.home_club ?? 'Golf Club Minsk',
            city: data.city ?? 'Минск, Беларусь',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return <AuthContext.Provider value={{ deviceId, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
