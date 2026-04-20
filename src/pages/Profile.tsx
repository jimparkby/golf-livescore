import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/scoring/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Shield, User as UserIcon } from "lucide-react";

export default function Profile() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [handicap, setHandicap] = useState<string>("0");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name,country,handicap")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setCountry(data.country ?? "");
        setHandicap(String(data.handicap ?? 0));
      }
      setBusy(false);
    };
    load();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        country: country.trim() || null,
        handicap: Number(handicap) || 0,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Профиль сохранён");
  };

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <section className="container py-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <UserIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display truncate text-2xl uppercase tracking-wider">
              {displayName || "Игрок"}
            </h1>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            {isAdmin && (
              <Badge className="mt-1" variant="outline">
                <Shield className="mr-1 h-3 w-3" /> Админ
              </Badge>
            )}
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="font-display text-base uppercase tracking-wider">
              Данные игрока
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {busy ? (
              <div className="text-muted-foreground">Загрузка…</div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={displayName}
                    maxLength={50}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Страна</Label>
                  <Input
                    id="country"
                    value={country}
                    maxLength={2}
                    placeholder="BY"
                    onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hcp">Гандикап</Label>
                  <Input
                    id="hcp"
                    type="number"
                    step="0.1"
                    value={handicap}
                    onChange={(e) => setHandicap(e.target.value)}
                  />
                </div>
                <Button onClick={save} disabled={saving} className="w-full">
                  {saving ? "Сохраняем…" : "Сохранить"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => navigate("/admin")}
          >
            <Shield className="mr-2 h-4 w-4" /> Панель администратора
          </Button>
        )}

        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Выйти
        </Button>
      </section>
    </div>
  );
}