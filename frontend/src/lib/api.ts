const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const getToken = () => localStorage.getItem('golf_jwt')

async function request(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json()
}

export const api = {
  get:   (path: string)                  => request(path),
  post:  (path: string, body: unknown)   => request(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:   (path: string, body: unknown)   => request(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch: (path: string, body: unknown)   => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
}
