import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trophy, Send } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const emailSchema = z.string().trim().email("Неверный email").max(255);
const passwordSchema = z.string().min(6, "Минимум 6 символов").max(72);
const nameSchema = z.string().trim().min(2, "Минимум 2 символа").max(50);

export default function Auth() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [tgPending, setTgPending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && session) navigate("/", { replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) };
  }, []);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPwd, setSignInPwd] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPwd, setSignUpPwd] = useState("");
  const [signUpName, setSignUpName] = useState("");

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(signInEmail);
      passwordSchema.parse(signInPwd);
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message ?? "Ошибка валидации");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPwd,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Добро пожаловать!"); navigate("/"); }
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nameSchema.parse(signUpName);
      emailSchema.parse(signUpEmail);
      passwordSchema.parse(signUpPwd);
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message ?? "Ошибка валидации");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: signUpName },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Аккаунт создан! Теперь войдите.");
  };

  const onTelegramLogin = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/tg-link`);
      if (!res.ok) throw new Error("Ошибка сервера");
      const { url, token } = await res.json();

      window.open(url, "_blank");
      setTgPending(true);
      setBusy(false);

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`${BACKEND_URL}/api/auth/tg-status?token=${token}`);
          const status = await statusRes.json();

          if (status.expired) {
            clearInterval(pollRef.current!);
            setTgPending(false);
            toast.error("Ссылка истекла. Попробуйте снова.");
            return;
          }

          if (status.verified) {
            clearInterval(pollRef.current!);
            const { error } = await supabase.auth.verifyOtp({
              token_hash: status.hashed_token,
              type: "magiclink",
            });
            if (error) {
              setTgPending(false);
              toast.error(error.message);
            } else {
              toast.success("Вы вошли через Telegram!");
              navigate("/");
            }
          }
        } catch {
          // ignore network errors during polling
        }
      }, 2000);
    } catch (err: any) {
      setBusy(false);
      toast.error(err.message ?? "Не удалось подключиться к серверу");
    }
  };

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
          <CardContent className="space-y-4">
            <Button
              type="button"
              className="w-full bg-[#229ED9] hover:bg-[#1a8dbf] text-white"
              onClick={onTelegramLogin}
              disabled={busy || tgPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {tgPending ? "Ожидаем подтверждения в Telegram…" : "Войти через Telegram"}
            </Button>

            {tgPending && (
              <p className="text-center text-sm text-muted-foreground">
                Откройте бота и нажмите <strong>Start</strong>
              </p>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">или</span>
              </div>
            </div>

            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Вход</TabsTrigger>
                <TabsTrigger value="signup">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" required maxLength={255}
                      value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-pwd">Пароль</Label>
                    <Input id="si-pwd" type="password" required maxLength={72}
                      value={signInPwd} onChange={(e) => setSignInPwd(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Входим…" : "Войти"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={onSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Имя игрока</Label>
                    <Input id="su-name" required maxLength={50}
                      value={signUpName} onChange={(e) => setSignUpName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" required maxLength={255}
                      value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pwd">Пароль</Label>
                    <Input id="su-pwd" type="password" required maxLength={72}
                      value={signUpPwd} onChange={(e) => setSignUpPwd(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Создаём…" : "Создать аккаунт"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
