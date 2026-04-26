import { useState, useMemo, useRef } from "react";
import { BASE } from "@/lib/api";
import { useGolf } from "@/store/golfStore";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Check, MapPin, Calendar, Trophy, Camera, LogOut } from "lucide-react";
import { toast } from "sonner";
import { getDifferentials, calcHandicapIndex, playingHandicap } from "@/lib/handicap";
import { COURSES } from "@/lib/courses";
import { compressImage } from "@/lib/imageUtils";

const ProfilePage = () => {
  const { profile, updateProfile, rounds } = useGolf();
  const { signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 400);
    updateProfile({ photoUrl: compressed });
    toast.success("Фото профиля обновлено");
    e.target.value = "";
  };

  // WHS calculation
  const diffs = useMemo(() => getDifferentials(rounds, "me", profile.hcp), [rounds, profile.hcp]);
  const whsIndex = calcHandicapIndex(diffs.map((d) => d.differential));

  const save = () => {
    updateProfile(draft);
    setEditing(false);
    toast.success("Профиль обновлён");
    const token = localStorage.getItem('golf_jwt');
    fetch(`${BASE}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        first_name: draft.firstName,
        last_name: draft.lastName,
        hcp: draft.hcp,
        home_club: draft.homeClub,
        city: draft.city,
      }),
    }).catch(console.error);
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

  const isEmpty = !profile.firstName && !profile.lastName;
  const hcpToShow = whsIndex ?? profile.hcp;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Hero */}
      <Card className="p-6 shadow-elevated overflow-hidden relative">
        <div className="absolute inset-0 gradient-hero opacity-95" />
        <div className="relative z-10 text-primary-foreground">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-full overflow-hidden shadow-glow border-2 border-action/30">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.firstName} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-warning grid place-items-center font-bold text-2xl text-primary">
                    {profile.initials || "?"}
                  </div>
                )}
              </div>
              <button
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full grid place-items-center shadow-md"
                style={{ background: "#22c55e" }}
              >
                <Camera className="h-3.5 w-3.5 text-black" />
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="flex-1 min-w-0">
              {isEmpty ? (
                <div className="text-base opacity-80">Введите ваше имя →</div>
              ) : (
                <div className="text-xl font-bold">{profile.firstName} {profile.lastName}</div>
              )}
              <div className="text-sm opacity-80 flex items-center gap-1.5 mt-1">
                <MapPin className="h-3.5 w-3.5" /> {profile.city || "—"}
              </div>
              <div className="text-sm opacity-80 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> {profile.homeClub || "—"}
              </div>
            </div>
            <button
              onClick={() => {
                if (editing) save();
                else { setDraft(profile); setEditing(true); }
              }}
              className="h-10 w-10 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 grid place-items-center transition-base"
            >
              {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="text-center bg-primary-foreground/10 backdrop-blur rounded-xl py-3 relative">
              <div className="text-2xl font-bold tabular-nums">{hcpToShow.toFixed(1)}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-70 mt-0.5">
                {whsIndex !== null ? "WHS" : "HCP"}
              </div>
              {whsIndex !== null && (
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-action grid place-items-center">
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
            <HeroStat label="Best" value={best ? String(best) : "—"} />
            <HeroStat label="Avg" value={avg ? String(avg) : "—"} />
          </div>
        </div>
      </Card>

      {/* WHS Handicap detail */}
      {whsIndex !== null && (
        <Card className="p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-action">WHS Гандикап-Индекс</div>
            <div className="text-2xl font-black text-foreground tabular-nums">{whsIndex.toFixed(1)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {COURSES.map((c) => {
              const ph = playingHandicap(whsIndex, c.slope, c.rating, c.totalPar);
              return (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted">
                  <div>
                    <div className="text-xs font-semibold">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">{c.tee} · {c.rating}/{c.slope}</div>
                  </div>
                  <div className="text-xl font-black text-foreground tabular-nums">{ph}</div>
                </div>
              );
            })}
          </div>
          {Math.abs(whsIndex - profile.hcp) >= 0.1 && (
            <button
              onClick={() => { updateProfile({ hcp: whsIndex }); toast.success(`HCP обновлён до ${whsIndex.toFixed(1)}`); }}
              className="mt-3 w-full h-10 rounded-xl font-bold text-sm transition-colors"
              style={{ background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.4)", color: "#22c55e" }}
            >
              Применить WHS: {profile.hcp} → {whsIndex.toFixed(1)}
            </button>
          )}
        </Card>
      )}

      {/* Edit form */}
      {editing ? (
        <Card className="p-5 shadow-soft space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Имя">
              <Input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} autoFocus />
            </Field>
            <Field label="Фамилия">
              <Input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
            </Field>
            <Field label="HCP (ручной)">
              <Input type="number" step="0.1" value={draft.hcp} onChange={(e) => setDraft({ ...draft, hcp: Number(e.target.value) })} />
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
          <Row icon={<Calendar className="h-4 w-4" />} label="Член клуба с" value={profile.memberSince || "—"} />
          <Row icon={<Trophy className="h-4 w-4" />} label="Сыграно раундов" value={String(rounds.length)} />
        </Card>
      )}

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Выйти из аккаунта
      </button>

      {/* Frequent partners */}
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
