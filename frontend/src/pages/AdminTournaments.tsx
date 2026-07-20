import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { COURSES } from "@/lib/courses";
import { api, errMsg } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus, X, Trophy } from "lucide-react";
import { toast } from "sonner";

type AdminTournament = {
  id: string;
  name: string;
  date: string;
  startTime: string;
  status: "draft" | "open" | "live" | "completed";
};

const STATUS_LABEL: Record<AdminTournament["status"], string> = {
  draft: "Черновик", open: "Регистрация", live: "Идёт сейчас", completed: "Завершён",
};

const AdminTournamentsPage = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => api.get<AdminTournament[]>("/api/official-tournaments").then(setTournaments).catch(() => {});

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/profile")} className="flex items-center gap-1 text-action font-bold text-lg">
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> Админ
        </button>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 h-10 px-4 rounded-xl font-bold text-sm"
          style={{ background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.3)", color: "#22c55e" }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Создать
        </button>
      </div>

      <Card className="overflow-hidden shadow-soft">
        {tournaments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Нет турниров</div>
        ) : (
          <div className="divide-y divide-border">
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/admin/official-tournament/${t.id}`)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left"
              >
                <div className="h-9 w-9 rounded-full grid place-items-center shrink-0 bg-action/10 text-action">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-snug">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(t.date ?? t.startTime).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} · {STATUS_LABEL[t.status]}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </Card>

      {showCreate && (
        <CreateSheet onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}
    </div>
  );
};

const CreateSheet = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState(COURSES[0].id);
  const course = COURSES.find((c) => c.id === courseId)!;
  const [tee, setTee] = useState(course.tees[2]?.color ?? course.tees[0].color);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [holesMode, setHolesMode] = useState<"18" | "front9" | "back9">("18");
  const [allowance, setAllowance] = useState(80);
  const [flightCount, setFlightCount] = useState(3);
  const [groupSize, setGroupSize] = useState(4);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error("Введите название"); return; }
    const teeInfo = course.tees.find((t) => t.color === tee)!;
    setSaving(true);
    try {
      await api.post("/api/official-tournaments", {
        name: name.trim(),
        courseId,
        courseName: `${course.name} · ${course.club}`,
        tee,
        rating: teeInfo.rating,
        slope: teeInfo.slope,
        date,
        startTime: new Date(startTime).toISOString(),
        holesMode,
        handicapAllowancePct: allowance,
        flightCount,
        groupSize,
      });
      toast.success("Турнир создан");
      onCreated();
    } catch (e) {
      toast.error(errMsg(e, "Ошибка создания"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-150">
      <button className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full rounded-t-3xl animate-in slide-in-from-bottom duration-250 flex flex-col"
        style={{ background: "#1c1c1e", maxHeight: "90vh", paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
      >
        <div className="mx-auto w-10 h-1 rounded-full mt-3 mb-2" style={{ background: "rgba(255,255,255,0.15)" }} />
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="text-white font-bold text-lg">Новый турнир</div>
          <button onClick={onClose} className="h-8 w-8 rounded-full grid place-items-center" style={{ background: "rgba(255,255,255,0.1)" }}>
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-4 space-y-4">
          <Field label="Название">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VIII Кубок Гольф-клуба Минск"
              className="w-full h-11 rounded-xl px-3 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.08)" }} />
          </Field>

          <Field label="Поле">
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
              className="w-full h-11 rounded-xl px-3 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.08)" }}>
              {COURSES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Ти">
            <select value={tee} onChange={(e) => setTee(e.target.value)}
              className="w-full h-11 rounded-xl px-3 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.08)" }}>
              {course.tees.map((t) => <option key={t.color} value={t.color}>{t.label} (CR {t.rating} / SL {t.slope})</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 rounded-xl px-3 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.08)" }} />
            </Field>
            <Field label="Старт (регистрация/код)">
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-11 rounded-xl px-3 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.08)" }} />
            </Field>
          </div>

          <Field label="Лунки">
            <div className="grid grid-cols-3 gap-2">
              {(["18", "front9", "back9"] as const).map((m) => (
                <button key={m} onClick={() => setHolesMode(m)}
                  className="py-2.5 rounded-xl text-sm font-semibold"
                  style={holesMode === m ? { background: "#22c55e", color: "#000" } : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                  {m === "18" ? "18" : m === "front9" ? "Front 9" : "Back 9"}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="% HCP">
              <input type="number" value={allowance} onChange={(e) => setAllowance(Number(e.target.value))}
                className="w-full h-11 rounded-xl px-3 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.08)" }} />
            </Field>
            <Field label="Флайты">
              <input type="number" min={1} value={flightCount} onChange={(e) => setFlightCount(Number(e.target.value))}
                className="w-full h-11 rounded-xl px-3 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.08)" }} />
            </Field>
            <Field label="В группе">
              <input type="number" min={2} value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value))}
                className="w-full h-11 rounded-xl px-3 text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.08)" }} />
            </Field>
          </div>

          <button
            onClick={submit}
            disabled={saving}
            className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-wider active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{ background: "#22c55e", color: "#000" }}
          >
            Создать турнир
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</div>
    {children}
  </div>
);

export default AdminTournamentsPage;
