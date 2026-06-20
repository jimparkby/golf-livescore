import { useState, useMemo, useRef, useEffect } from "react";
import { BASE } from "@/lib/api";
import { useGolf } from "@/store/golfStore";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/store/settingsStore";
import { useTranslation } from "@/hooks/useTranslation";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Check, Trophy, Camera, LogOut, Trash2, ChevronRight, X, Calendar, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getDifferentials, calcHandicapIndex } from "@/lib/handicap";
import { TEE_CONFIG, COURSES, type TeeColor } from "@/lib/courses";
import { compressImage } from "@/lib/imageUtils";

// Helper to get par for a hole from course data
const getHolePar = (courseId: string, holeNumber: number): number => {
  const course = COURSES.find(c => c.id === courseId);
  if (!course) return 4; // fallback
  const hole = course.holes.find(h => h.number === holeNumber);
  return hole?.par ?? 4;
};

const ProfilePage = () => {
  const { profile, updateProfile, rounds } = useGolf();
  const { signOut } = useAuth();
  const { statsMode } = useSettings();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [showTeePicker, setShowTeePicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 400);
    updateProfile({ photoUrl: compressed });
    toast.success(t.profilePhotoUpdated);
    e.target.value = "";
  };

  // HCP calculation from completed rounds
  const diffs = useMemo(() => getDifferentials(rounds, "me", profile.hcp), [rounds, profile.hcp]);
  const hcpIndex = calcHandicapIndex(diffs.map((d) => d.differential));

  // Auto-apply calculated HCP to profile whenever it changes
  useEffect(() => {
    const target = hcpIndex ?? 0;
    if (Math.abs(target - profile.hcp) < 0.1) return;
    updateProfile({ hcp: target });
    const token = localStorage.getItem('golf_jwt');
    fetch(`${BASE}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ hcp: target }),
    }).catch(console.error);
  }, [hcpIndex]);

  const pushSetting = (patch: Partial<typeof profile>) => {
    updateProfile(patch);
    const token = localStorage.getItem('golf_jwt');
    fetch(`${BASE}/api/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ default_tee: patch.defaultTee }),
    }).catch(console.error);
  };

  const syncProfile = (data: typeof draft) => {
    const token = localStorage.getItem('golf_jwt');
    fetch(`${BASE}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        first_name: data.firstName,
        last_name: data.lastName,
        username: data.username,
        hcp: data.hcp,
        home_club: data.homeClub,
        city: data.city,
      }),
    }).catch(console.error);
  };

  const save = () => {
    updateProfile(draft);
    setEditing(false);
    toast.success(t.profileUpdated);
    syncProfile(draft);
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
  const hcpToShow = hcpIndex ?? profile.hcp;

  // Calculate performance stats from completed rounds
  const perfStats = useMemo(() => {
    const completedRounds = rounds.filter(r => r.completed);
    if (completedRounds.length === 0) return null;

    // Use only last round if statsMode is 'last'
    const roundsToAnalyze = statsMode === "last" ? [completedRounds[0]] : completedRounds;

    let totalHoles = 0, girCount = 0, fairwayCount = 0, scrambleAttempts = 0, scrambleSuccess = 0;
    let totalPutts = 0, totalPenalties = 0;

    roundsToAnalyze.forEach(r => {
      const me = r.players.find(p => p.isMe);
      if (!me) return;
      const myScores = r.scores[me.id] || [];

      myScores.forEach(s => {
        if (s.score > 0) {
          totalHoles++;
          if (s.gir) girCount++;
          if (s.driving) fairwayCount++;
          if (!s.gir) {
            scrambleAttempts++;
            // Consider it a scramble success if score <= par
            const holePar = getHolePar(r.courseId, s.hole);
            if (s.score <= holePar) scrambleSuccess++;
          }
          totalPutts += s.putts || 0;
          totalPenalties += s.penalties || 0;
        }
      });
    });

    const gir = totalHoles > 0 ? Math.round((girCount / totalHoles) * 100) : 0;
    const fairways = totalHoles > 0 ? Math.round((fairwayCount / totalHoles) * 100) : 0;
    const scrambling = scrambleAttempts > 0 ? Math.round((scrambleSuccess / scrambleAttempts) * 100) : 0;
    const puttsPerRound = roundsToAnalyze.length > 0 ? (totalPutts / roundsToAnalyze.length).toFixed(1) : "0";
    const penaltiesPerRound = roundsToAnalyze.length > 0 ? (totalPenalties / roundsToAnalyze.length).toFixed(1) : "0";

    return { gir, fairways, scrambling, putts: puttsPerRound, penalties: penaltiesPerRound };
  }, [rounds, statsMode]);

  // Calculate scoring breakdown
  const scoringBreakdown = useMemo(() => {
    let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0;

    rounds.forEach(r => {
      const me = r.players.find(p => p.isMe);
      if (!me) return;
      const myScores = r.scores[me.id] || [];

      myScores.forEach(s => {
        if (s.score > 0) {
          const holePar = getHolePar(r.courseId, s.hole);
          const diff = s.score - holePar;
          if (diff <= -2) eagles++;
          else if (diff === -1) birdies++;
          else if (diff === 0) pars++;
          else if (diff === 1) bogeys++;
          else if (diff >= 2) doubles++;
        }
      });
    });

    const total = eagles + birdies + pars + bogeys + doubles;
    return [
      { key: "eagle", label: "Eagles", count: eagles, color: "var(--score-eagle)" },
      { key: "birdie", label: "Birdies", count: birdies, color: "var(--score-birdie)" },
      { key: "par", label: "Pars", count: pars, color: "var(--score-par)" },
      { key: "bogey", label: "Bogeys", count: bogeys, color: "var(--score-bogey)" },
      { key: "double", label: "Double+", count: doubles, color: "var(--score-double)" },
    ].filter(s => total > 0);
  }, [rounds]);

  const scoreTotal = scoringBreakdown.reduce((a, s) => a + s.count, 0);

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
                <div className="text-base opacity-80">{t.enterYourName}</div>
              ) : (
                <div className="text-xl font-bold">{profile.firstName} {profile.lastName}</div>
              )}
              <div className="text-sm opacity-80 flex items-center gap-1.5 mt-1">
                <Trophy className="h-3.5 w-3.5" /> Golf Club Minsk
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="h-10 w-10 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 grid place-items-center transition-base"
              >
                <Settings className="h-4 w-4" />
              </button>
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
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="text-center bg-primary-foreground/10 backdrop-blur rounded-xl py-3 relative">
              <div className="text-2xl font-bold tabular-nums">{hcpToShow.toFixed(1)}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-70 mt-0.5">
                HCP
              </div>
              {hcpIndex !== null && (
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-action grid place-items-center">
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
            <HeroStat label={t.best} value={best ? String(best) : "—"} />
            <HeroStat label={t.avg} value={avg ? String(avg) : "—"} />
          </div>
        </div>
      </Card>

      {/* Edit form */}
      {editing ? (
        <Card className="p-5 shadow-soft space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.firstName}>
              <Input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} autoFocus />
            </Field>
            <Field label={t.lastName}>
              <Input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
            </Field>
            <Field label={`HCP (${t.manual})`} className="col-span-2">
              <Input type="number" step="0.1" value={draft.hcp} onChange={(e) => setDraft({ ...draft, hcp: Number(e.target.value) })} />
            </Field>
          </div>
          {draft.photoUrl && (
            <button
              onClick={() => setDraft({ ...draft, photoUrl: "" })}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
            >
              <Trash2 className="h-4 w-4" /> {t.deletePhoto}
            </button>
          )}
          <Button onClick={save} className="w-full bg-action hover:bg-action/90 text-action-foreground rounded-xl h-12">
            {t.saveChanges}
          </Button>
        </Card>
      ) : (
        <Card className="p-5 shadow-soft space-y-3 text-sm">
          <Row icon={<Calendar className="h-4 w-4" />} label={t.memberSince} value={profile.memberSince || "—"} />
          <Row icon={<Trophy className="h-4 w-4" />} label={t.roundsPlayed} value={String(rounds.length)} />
        </Card>
      )}

      {/* Performance stats */}
      {perfStats && !editing && (
        <div>
          <div className="gm-eyebrow mb-3 px-1">{t.stats} · {t.last} {rounds.filter(r => r.completed).length}</div>
          <div className="grid grid-cols-3 gap-3">
            <PerfTile value={`${perfStats.gir}%`} label="GIR" accent />
            <PerfTile value={`${perfStats.fairways}%`} label="FAIRWAYS" />
            <PerfTile value={`${perfStats.scrambling}%`} label="SCRAMBLING" />
            <PerfTile value={perfStats.putts} label="PUTTS / ROUND" />
            <PerfTile value={perfStats.penalties} label="PENALTIES" />
            <PerfTile value="—" label="DRIVE" />
          </div>
        </div>
      )}

      {/* Scoring breakdown */}
      {scoreTotal > 0 && !editing && (
        <Card className="p-5 shadow-soft">
          <div className="flex items-baseline justify-between mb-4">
            <div className="font-bold">{t.holeScoring}</div>
            <div className="gm-nums text-xs" style={{ color: "var(--text-secondary)" }}>{scoreTotal} {t.holes}</div>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {scoringBreakdown.map((s) => (
              <div key={s.key} title={s.label} style={{ flex: s.count, background: s.color }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-4">
            {scoringBreakdown.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-sm flex-1" style={{ color: "var(--text-body)" }}>{s.label}</span>
                <span className="gm-nums text-sm font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Settings */}
      <Card className="overflow-hidden shadow-soft">
        {/* Default tee */}
        <button
          onClick={() => setShowTeePicker(true)}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <div className="text-sm font-medium">{t.defaultTee}</div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div
              className="w-4 h-4 rounded-sm border"
              style={{
                background: TEE_CONFIG[profile.defaultTee].cssColor,
                borderColor: TEE_CONFIG[profile.defaultTee].border,
              }}
            />
            <span className="text-sm">{TEE_CONFIG[profile.defaultTee].label}</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </button>
      </Card>

      {/* Sign out */}
      <button
        onClick={() => {
          signOut();
          const tg = (window as any)?.Telegram?.WebApp;
          if (tg?.close) {
            tg.close();
          }
        }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        {t.signOut}
      </button>

      {/* Frequent partners */}
      {useGolf.getState().frequent.length > 0 && (
        <Card className="p-5 shadow-soft">
          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">{t.frequentPartners}</div>
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

      {/* Default tee picker sheet */}
      {showTeePicker && (
        <div className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-150">
          <button className="absolute inset-0 bg-black/70" onClick={() => setShowTeePicker(false)} />
          <div
            className="relative w-full rounded-t-3xl animate-in slide-in-from-bottom duration-250"
            style={{ background: "#1c1c1e", paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
          >
            <div className="mx-auto w-10 h-1 rounded-full mt-3 mb-4" style={{ background: "rgba(255,255,255,0.15)" }} />
            <div className="flex items-center justify-between px-5 pb-4">
              <div className="text-white font-bold text-lg">{t.defaultTee}</div>
              <button
                onClick={() => setShowTeePicker(false)}
                className="h-8 w-8 rounded-full grid place-items-center"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {(Object.keys(TEE_CONFIG) as TeeColor[]).map((color) => (
                <button
                  key={color}
                  onClick={() => { pushSetting({ defaultTee: color }); setShowTeePicker(false); toast.success(`${t.defaultTee}: ${TEE_CONFIG[color].label}`); }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl active:scale-[0.98] transition-transform"
                  style={{
                    background: profile.defaultTee === color ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
                    border: profile.defaultTee === color ? "2px solid rgba(255,255,255,0.25)" : "2px solid transparent",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-md shrink-0 border-2"
                    style={{ background: TEE_CONFIG[color].cssColor, borderColor: TEE_CONFIG[color].border }}
                  />
                  <div className="text-white font-bold">{TEE_CONFIG[color].label}</div>
                  {profile.defaultTee === color && (
                    <Check className="h-5 w-5 ml-auto" style={{ color: "#22c55e" }} strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const { language, theme, statsMode, setLanguage, setTheme, setStatsMode } = useSettings();
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-card rounded-t-3xl shadow-elevated p-5 animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: "85vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">{t.settings}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-secondary hover:bg-secondary/80 grid place-items-center transition-base"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Language */}
        <Card className="p-4 mb-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t.language}</div>
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage("en")}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                language === "en"
                  ? "bg-action text-action-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("ru")}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                language === "ru"
                  ? "bg-action text-action-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              Русский
            </button>
          </div>
        </Card>

        {/* Theme */}
        <Card className="p-4 mb-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t.theme}</div>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                theme === "dark"
                  ? "bg-action text-action-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              {t.dark}
            </button>
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                theme === "light"
                  ? "bg-action text-action-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              {t.light}
            </button>
          </div>
        </Card>

        {/* Stats Mode */}
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t.statistics}</div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatsMode("all")}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                statsMode === "all"
                  ? "bg-action text-action-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              {t.allRounds}
            </button>
            <button
              onClick={() => setStatsMode("last")}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                statsMode === "last"
                  ? "bg-action text-action-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              {t.lastRound}
            </button>
          </div>
        </Card>
      </div>
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

const PerfTile = ({ value, label, accent }: { value: string; label: string; accent?: boolean }) => (
  <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface-card)", border: "1px solid var(--border-hairline)" }}>
    <div className="gm-nums text-2xl font-extrabold leading-none" style={{ color: accent ? "var(--accent)" : "var(--text-primary)", letterSpacing: "-0.02em" }}>
      {value}
    </div>
    <div className="mt-1.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>
      {label}
    </div>
  </div>
);

export default ProfilePage;
