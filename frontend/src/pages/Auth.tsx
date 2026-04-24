import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

export default function AuthPage() {
  const { signIn } = useAuth()

  const [loginEmail, setLoginEmail] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [regFirst, setRegFirst] = useState('')
  const [regLast, setRegLast] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  const authFetch = async (url: string, body: object) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    let data: Record<string, string> = {}
    try { data = await res.json() } catch { /* non-JSON response */ }
    if (!res.ok) throw new Error(data.error ?? `Ошибка сервера (${res.status})`)
    return data
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail.trim()) return toast.error('Введите email')
    setLoginLoading(true)
    try {
      const data = await authFetch('/api/auth/login', { email: loginEmail.trim() })
      await signIn(data.jwt)
      toast.success('Добро пожаловать!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regFirst.trim() || !regLast.trim() || !regEmail.trim()) {
      return toast.error('Заполните все поля')
    }
    setRegLoading(true)
    try {
      const data = await authFetch('/api/auth/register', {
        email: regEmail.trim(),
        first_name: regFirst.trim(),
        last_name: regLast.trim(),
      })
      await signIn(data.jwt)
      toast.success('Аккаунт создан!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center text-primary-foreground mb-8">
          <div className="text-5xl mb-3">⛳</div>
          <div className="font-bold text-2xl tracking-wide">GOLFMINSK</div>
          <div className="text-xs opacity-70 uppercase tracking-[0.2em] mt-1">Live Scoring</div>
        </div>

        <Card className="shadow-elevated">
          <CardContent className="pt-6 pb-6">
            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="login">Войти</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      className="mt-1.5 h-11"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-action hover:bg-action/90 text-action-foreground rounded-xl font-semibold"
                    disabled={loginLoading}
                  >
                    {loginLoading ? 'Входим…' : 'Войти'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Имя</Label>
                      <Input
                        className="mt-1.5 h-11"
                        placeholder="Иван"
                        value={regFirst}
                        onChange={e => setRegFirst(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Фамилия</Label>
                      <Input
                        className="mt-1.5 h-11"
                        placeholder="Иванов"
                        value={regLast}
                        onChange={e => setRegLast(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      className="mt-1.5 h-11"
                      placeholder="you@example.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-action hover:bg-action/90 text-action-foreground rounded-xl font-semibold"
                    disabled={regLoading}
                  >
                    {regLoading ? 'Создаём…' : 'Создать аккаунт'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
