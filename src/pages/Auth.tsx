import { useEffect, useState } from "react";
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
import { Trophy } from "lucide-react";

const emailSchema = z.string().trim().email("Неверный email").max(255);
const passwordSchema = z.string().min(6, "Минимум 6 символов").max(72);
const nameSchema = z.string().trim().min(2, "Минимум 2 символа").max(50);

export default function Auth() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate("/", { replace: true });
  }, [session, loading, navigate]);

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
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Добро пожаловать!");
      navigate("/");
    }
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
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Аккаунт создан! Теперь войдите.");
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
          <CardContent>
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