import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { api, errMsg } from "@/lib/api";
import { ChevronLeft, Plus, X, Search, Trash2, Shuffle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Registration = {
  id: string; userId: string | null; name: string; hcp: number;
  paid: boolean; checkedIn: boolean; groupId: string | null; flightLabel: string | null; accessCode: string | null;
};
type Group = { id: string; flightLabel: string; groupNumber: number; roundId: string | null };
type Tournament = {
  id: string; name: string; date: string; start_time: string;
  status: "draft" | "open" | "live" | "completed"; flight_count: number; group_size: number;
};
type AdminData = { tournament: Tournament; registrations: Registration[]; groups: Group[] };

const STATUSES: Tournament["status"][] = ["draft", "open", "live", "completed"];
const STATUS_LABEL: Record<Tournament["status"], string> = {
  draft: "Черновик", open: "Регистрация", live: "Идёт сейчас", completed: "Завершён",
};

const AdminTournamentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminData | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [regrouping, setRegrouping] = useState(false);

  const load = () => api.get<AdminData>(`/api/official-tournaments/${id}/admin`).then(setData).catch(() => {});
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!data) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 rounded-full border-2 border-action border-t-transparent animate-spin" /></div>;
  }

  const { tournament: t, registrations, groups } = data;
  const paidCount = registrations.filter((r) => r.paid).length;

  const setStatus = async (status: Tournament["status"]) => {
    try {
      await api.put(`/api/official-tournaments/${t.id}`, { status });
      toast.success(`Статус: ${STATUS_LABEL[status]}`);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const togglePaid = async (r: Registration) => {
    try {
      await api.put(`/api/official-tournaments/${t.id}/registrations/${r.id}`, { paid: !r.paid });
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const removeReg = async (r: Registration) => {
    try {
      await api.delete(`/api/official-tournaments/${t.id}/registrations/${r.id}`);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const regroup = async () => {
    setRegrouping(true);
    try {
      await api.post(`/api/official-tournaments/${t.id}/regroup`, {});
      toast.success("Группы пересобраны по HCP");
      load();
    } catch (e) {
      toast.error(errMsg(e, "Не удалось перегруппировать"));
    } finally {
      setRegrouping(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <button onClick={() => navigate("/admin/official-tournaments")} className="flex items-center gap-1 text-action font-bold text-lg">
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> Турниры
      </button>

      <Card className="p-5 shadow-elevated space-y-3">
        <h1 className="text-lg font-bold">{t.name}</h1>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all",
                t.status === s ? "border-action bg-action/10 text-action" : "border-border text-muted-foreground")}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          Старт (открытие кода): {new Date(t.start_time).toLocaleString("ru-RU")}
        </div>
      </Card>

      <Card className="p-4 shadow-soft flex items-center justify-between">
        <div className="text-sm">
          <div className="font-semibold">{registrations.length} игроков</div>
          <div className="text-xs text-muted-foreground">{paidCount} оплатили · {groups.length} групп</div>
        </div>
        <button
          onClick={regroup}
          disabled={regrouping || t.status === "live" || t.status === "completed"}
          className="flex items-center gap-1.5 h-10 px-4 rounded-xl font-bold text-sm disabled:opacity-40"
          style={{ background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.3)", color: "#22c55e" }}
        >
          <Shuffle className="h-4 w-4" strokeWidth={2.5} /> Переделать группы по HCP
        </button>
      </Card>

      <Card className="overflow-hidden shadow-soft">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-action">Игроки</div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-action font-semibold text-xs">
            <Plus className="h-3.5 w-3.5" /> Добавить
          </button>
        </div>
        <div className="divide-y divide-border">
          {registrations.map((r) => (
            <div key={r.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  HCP {r.hcp}{r.flightLabel ? ` · ${r.flightLabel}` : ""}{r.checkedIn ? " · В игре" : ""}
                </div>
              </div>
              <button
                onClick={() => togglePaid(r)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
                style={r.paid ? { background: "rgba(34,197,94,0.15)", color: "#22c55e" } : { background: "rgba(255,255,255,0.08)", color: "var(--muted-foreground)" }}
              >
                {r.paid && <Check className="h-3 w-3" />} {r.paid ? "Оплачено" : "Не оплачено"}
              </button>
              <button onClick={() => removeReg(r)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {registrations.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Пока никого нет</div>}
        </div>
      </Card>

      {groups.length > 0 && (
        <Card className="overflow-hidden shadow-soft">
          <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-action">Группы</div>
          </div>
          <div className="divide-y divide-border">
            {groups.map((g) => (
              <div key={g.id} className="px-4 py-3">
                <div className="text-xs font-semibold text-muted-foreground mb-1">{g.flightLabel} · Группа {g.groupNumber}</div>
                <div className="text-sm">
                  {registrations.filter((r) => r.groupId === g.id).map((r) => `${r.name} (${r.accessCode ?? "—"})`).join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showAdd && (
        <AddPlayerSheet
          tournamentId={t.id}
          existingUserIds={registrations.map((r) => r.userId).filter(Boolean) as string[]}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load(); }}
        />
      )}
    </div>
  );
};

type UserResult = { id: string; first_name: string | null; last_name: string | null; username: string | null; hcp: number | null };
const mkName = (u: UserResult) => [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "Player";

const AddPlayerSheet = ({ tournamentId, existingUserIds, onClose, onAdded }: {
  tournamentId: string; existingUserIds: string[]; onClose: () => void; onAdded: () => void;
}) => {
  const [mode, setMode] = useState<"search" | "guest">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestHcp, setGuestHcp] = useState(18);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      api.get<UserResult[]>(`/api/users/search?q=${encodeURIComponent(q)}`).then(setResults).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const addUser = async (u: UserResult) => {
    try {
      await api.post(`/api/official-tournaments/${tournamentId}/registrations`, { userId: u.id, hcp: u.hcp ?? 0 });
      onAdded();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const addGuest = async () => {
    if (!guestName.trim()) { toast.error("Введите имя"); return; }
    try {
      await api.post(`/api/official-tournaments/${tournamentId}/registrations`, { guestName: guestName.trim(), hcp: guestHcp });
      onAdded();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-150">
      <button className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl animate-in slide-in-from-bottom duration-250 flex flex-col"
        style={{ background: "#1c1c1e", maxHeight: "85vh", paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}>
        <div className="mx-auto w-10 h-1 rounded-full mt-3 mb-4" style={{ background: "rgba(255,255,255,0.15)" }} />
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="text-white font-bold text-lg">Добавить игрока</div>
          <button onClick={onClose} className="h-8 w-8 rounded-full grid place-items-center" style={{ background: "rgba(255,255,255,0.1)" }}>
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="px-5 pb-3 flex rounded-full p-1 gap-1" style={{ background: "rgba(255,255,255,0.07)" }}>
          <button onClick={() => setMode("search")} className="flex-1 h-8 rounded-full text-xs font-bold tracking-wider"
            style={mode === "search" ? { background: "#22c55e", color: "#000" } : { color: "rgba(255,255,255,0.5)" }}>
            Игрок клуба
          </button>
          <button onClick={() => setMode("guest")} className="flex-1 h-8 rounded-full text-xs font-bold tracking-wider"
            style={mode === "guest" ? { background: "#22c55e", color: "#000" } : { color: "rgba(255,255,255,0.5)" }}>
            Гость
          </button>
        </div>

        {mode === "search" ? (
          <>
            <div className="px-5 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                <input
                  autoFocus
                  placeholder="Имя или @username..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full h-11 rounded-xl pl-10 pr-4 text-white text-sm outline-none placeholder:text-white/30"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.1)" }}
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-3 pb-3">
              {results.map((u) => {
                const added = existingUserIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    disabled={added}
                    onClick={() => addUser(u)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 active:scale-[0.98] transition-transform disabled:opacity-40"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-white font-semibold truncate">{mkName(u)}</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>HCP {u.hcp ?? "—"}</div>
                    </div>
                    {added ? (
                      <div className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>Добавлен</div>
                    ) : (
                      <div className="text-sm font-semibold" style={{ color: "#22c55e" }}>+ Add</div>
                    )}
                  </button>
                );
              })}
              {query.trim().length >= 2 && results.length === 0 && (
                <div className="text-center py-8 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Никого не найдено</div>
              )}
            </div>
          </>
        ) : (
          <div className="px-5 pb-5 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Имя</div>
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Фамилия Имя"
                className="w-full h-11 rounded-xl px-3 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>HCP</div>
              <input type="number" step="0.1" value={guestHcp} onChange={(e) => setGuestHcp(Number(e.target.value))}
                className="w-full h-11 rounded-xl px-3 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>
            <button onClick={addGuest} className="w-full h-12 rounded-xl font-bold text-sm" style={{ background: "#22c55e", color: "#000" }}>
              Добавить гостя
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTournamentDetailPage;
