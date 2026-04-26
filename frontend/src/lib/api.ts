export const BASE = import.meta.env.VITE_BACKEND_URL
  ? `https://${import.meta.env.VITE_BACKEND_URL}`
  : ''

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('golf_jwt')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Ошибка запроса')
  return data as T
}

export const api = {
  get:  <T>(path: string)                => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT',  body: JSON.stringify(body) }),
}
