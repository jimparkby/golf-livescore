import { useState } from "react";
import { useGolf } from "@/store/golfStore";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Check, MapPin, Mail, Calendar, Trophy, LogOut } from "lucide-react";
import { toast } from "sonner";

const ProfilePage = () => {
  const { profile, updateProfile, rounds } = useGolf();
  const { signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);

  const save = () => {
    updateProfile(draft);
    setEditing(false);
    toast.success("Профиль обновлён");

    const token = localStorage.getItem("golf_jwt");
    if (token) {
      fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name: draft.firstName,
          last_name: draft.lastName,
          hcp: draft.hcp,
          home_club: draft.homeClub,
          city: draft.city,
        }),
      }).catch(console.error);
    }
  };

  const playedTotals = rounds
    .map((r) => {
      const me = r.players.find((p) => p.isMe);
      return me ? r.scores[me.id]?.reduce((a, s) => a + s.score, 0) ?? null : null;
    })
    .filter((x): x is number => x !== null);

  const best = playedTotals.length ? Math.min(...playedTotals) : 0;
  const avg = playedTotals.length
    ? Math.round(playedTotals.reduce((a, b) => a + b, 0) / playedTotals.length)
    : 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Hero */}
      <Card className="p-6 shadow-elevated overflow-hidden relative">
        <div className="absolute inset-0 gradient-hero opacity-95" />
        <div className="relative z-10 text-primary-foreground">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-warning grid place-items-center font-bold text-2xl text-primary shadow-glow">
              {profile.initials || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-bold">{profile.firstName} {profile.lastName}</div>
              <div className="text-sm opacity-80 flex items-center gap-1.5 mt-1">
                <MapPin className="h-3.5 w-3.5" /> {profile.city || "—"}
              </div>
              <div className="text-sm opacity-80 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> {profile.homeClub || "—"}
              </div>
            </div>
            <button
              onClick={() => (editing ? save() : setEditing(true))}
              className="h-10 w-10 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 grid place-items-center transition-base"
            >
              {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <HeroStat label="HCP" value={String(profile.hcp || 0)} />
            <HeroStat label="Best" value={best ? String(best) : "—"} />
            <HeroStat label="Avg" value={avg ? String(avg) : "—"} />
          </div>
        </div>
      </Card>

      {/* Edit form */}
      {editing ? (
        <Card className="p-5 shadow-soft space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Имя">
              <Input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
            </Field>
            <Field label="Фамилия">
              <Input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
            </Field>
            <Field label="HCP">
              <Input
                type="number"
                value={draft.hcp}
                onChange={(e) => setDraft({ ...draft, hcp: Number(e.target.value) })}
              />
            </Field>
            <Field label="Город">
              <Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </Field>
            <Field label="Домашний клуб" className="col-span-2">
              <Input value={draft.homeClub} onChange={(e) => setDraft({ ...draft, homeClub: e.target.value })} />
            </Field>
          </div>
          <Button onClick={save} className="w-full bg-action hover:bg-action/90 text-action-foreground rounded-xl h-12">
            Сохранить изменения
          </Button>
        </Card>
      ) : (
        <Card className="p-5 shadow-soft space-y-3 text-sm">
          <Row icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email || "—"} />
          <Row icon={<Calendar className="h-4 w-4" />} label="Член клуба с" value={profile.memberSince || "—"} />
          <Row icon={<Trophy className="h-4 w-4" />} label="Сыграно раундов" value={String(rounds.length)} />
        </Card>
      )}

      {/* Frequent friends */}
      {useGolf.getState().frequent.length > 0 && (
        <Card className="p-5 shadow-soft">
          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Частые партнёры</div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {useGolf.getState().frequent.map((f) => (
              <div key={f.id} className="flex flex-col items-center gap-1.5 shrink-0">
                <Avatar name={f.name} tone="muted" />
                <div className="text-xs font-medium">{f.name}</div>
                <div className="text-[10px] text-muted-foreground">HCP {f.hcp}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sign out */}
      <Button
        variant="outline"
        className="w-full h-11 text-muted-foreground"
        onClick={() => {
          if (confirm("Выйти из аккаунта?")) signOut();
        }}
      >
        <LogOut className="h-4 w-4 mr-2" /> Выйти
      </Button>
    </div>
  );
};

const HeroStat = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center bg-primary-foreground/10 backdrop-blur rounded-xl py-3">
    <div className="text-2xl font-bold tabular-nums">{value}</div>
    <div className="text-[10px] uppercase tracking-wider opacity-70 mt-0.5">{label}</div>
  </div>
);

const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={className}>
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
    <div className="mt-1">{children}</div>
  </div>
);

const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
    <div className="font-medium">{value}</div>
  </div>
);

export default ProfilePage;
