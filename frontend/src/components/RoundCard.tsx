import { useRef } from "react";
import { type Round } from "@/store/golfStore";
import { COURSES } from "@/lib/courses";
import { Camera, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/imageUtils";

/* ── Score cell colors (TheGrint style) ── */
function cellStyle(score: number, par: number): React.CSSProperties {
  const d = score - par;
  if (d <= -2) return { background: "#eab308", color: "#000", borderRadius: "50%", fontWeight: 900 };
  if (d === -1) return { background: "#22c55e", color: "#000", borderRadius: "50%", fontWeight: 900 };
  if (d === 0) return { color: "rgba(255,255,255,0.9)", fontWeight: 600 };
  if (d === 1) return { border: "2px solid rgba(251,146,60,0.9)", color: "#fb923c", fontWeight: 700 };
  if (d === 2) return { border: "3px solid #ef4444", color: "#ef4444", fontWeight: 700 };
  return { background: "#7f1d1d", color: "#fca5a5", fontWeight: 700 };
}

type Props = {
  round: Round;
  profilePhoto?: string;
  playerName: string;
  playerHcp: number;
  onDelete?: () => void;
  onAddPhoto?: (url: string) => void;
};

const RoundCard = ({ round, profilePhoto, playerName, playerHcp, onDelete, onAddPhoto }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const course = COURSES.find((c) => c.id === round.courseId);
  const me = round.players.find((p) => p.isMe) ?? round.players[0];
  const myScores = me ? (round.scores[me.id] ?? []) : [];

  const total = myScores.reduce((a, s) => a + s.score, 0);
  const vsPar = myScores.reduce((a, s) => {
    const h = course?.holes.find((h) => h.number === s.hole);
    return a + (s.score - (h?.par ?? 4));
  }, 0);

  const front = myScores.filter((s) => s.hole <= 9).sort((a, b) => a.hole - b.hole);
  const back = myScores.filter((s) => s.hole >= 10).sort((a, b) => a.hole - b.hole);
  const frontTotal = front.reduce((a, s) => a + s.score, 0);
  const backTotal = back.reduce((a, s) => a + s.score, 0);

  const dateStr = new Date(round.date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const vpText = vsPar === 0 ? "E" : vsPar > 0 ? `+${vsPar}` : `${vsPar}`;
  const vpColor = vsPar < 0 ? "#22c55e" : vsPar === 0 ? "rgba(255,255,255,0.8)" : "#f87171";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAddPhoto) return;
    const compressed = await compressImage(file);
    onAddPhoto(compressed);
    e.target.value = "";
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-elevated" style={{ background: "#111111" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 border-2 border-action/40">
          {profilePhoto ? (
            <img src={profilePhoto} alt={playerName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-warning grid place-items-center font-bold text-sm text-black">
              {playerName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm">
            {playerName} <span className="text-white/50 font-normal">({playerHcp})</span>
          </div>
          <div className="text-xs text-white/50 truncate">
            {round.courseName.split(" · ")[0]} · {round.courseName.split(" · ")[1] ?? "Golf Club Minsk"}
          </div>
        </div>
        <div className="text-xs text-white/40">{dateStr}</div>
      </div>

      {/* Photo */}
      {round.photoUrl && (
        <div className="relative w-full" style={{ aspectRatio: "4/3", maxHeight: 340 }}>
          <img src={round.photoUrl} alt="Round photo" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)" }} />

          {/* Bottom overlay: course info */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <div className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">{dateStr}</div>
            <div className="text-white font-black text-sm uppercase tracking-wide">{round.courseName.split(" · ")[0]}</div>
            <div className="text-white/50 text-[10px]">⛳ {round.rating} / {round.slope}</div>
          </div>

          {/* Score badge top-right */}
          <div className="absolute top-3 right-3 rounded-xl px-3 py-1.5 text-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
            <div className="text-white font-black text-2xl tabular-nums leading-none">{total}</div>
            <div className="font-bold text-xs" style={{ color: vpColor }}>{vpText}</div>
          </div>
        </div>
      )}

      {/* Scorecard */}
      {myScores.length > 0 && course && (
        <div className="px-3 py-3">
          {/* Front 9 */}
          {front.length > 0 && (
            <ScoreRow holes={front} course={course} label="Out" rowTotal={frontTotal} />
          )}
          {/* Back 9 */}
          {back.length > 0 && (
            <ScoreRow holes={back} course={course} label="In" rowTotal={backTotal} isBack />
          )}

          {/* Total row */}
          <div className="flex items-center justify-end gap-3 pt-2 mt-1 border-t border-white/10">
            {!round.photoUrl && (
              <div className="flex items-center gap-2 mr-auto">
                <div className="text-white/50 text-xs font-semibold">ИТОГО</div>
              </div>
            )}
            <div className="text-white/50 text-xs">TOTAL</div>
            <div className="text-white font-black text-2xl tabular-nums">{total}</div>
            <div className="text-sm font-black tabular-nums" style={{ color: vpColor }}>{vpText}</div>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {onAddPhoto && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-colors"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
            >
              <Camera className="h-3.5 w-3.5" />
              {round.photoUrl ? "Заменить фото" : "Добавить фото"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </>
        )}
        <div className="flex-1" />
        {onDelete && (
          <button
            onClick={onDelete}
            className="h-8 w-8 rounded-full grid place-items-center transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Score row (9 holes) ── */
type ScoreRowProps = {
  holes: { hole: number; score: number }[];
  course: ReturnType<typeof COURSES.find> & object;
  label: string;
  rowTotal: number;
  isBack?: boolean;
};

const ScoreRow = ({ holes, course, label, rowTotal, isBack }: ScoreRowProps) => (
  <div className="mb-1">
    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${holes.length}, 1fr) auto` }}>
      {/* Hole numbers */}
      {holes.map((s) => (
        <div key={s.hole} className="text-center text-[9px] text-white/30 pb-0.5">{s.hole}</div>
      ))}
      <div className="text-center text-[9px] text-white/30 pb-0.5 pl-1">{label}</div>

      {/* Scores */}
      {holes.map((s) => {
        const hole = course.holes.find((h) => h.number === s.hole);
        const par = hole?.par ?? 4;
        const style = cellStyle(s.score, par);
        return (
          <div
            key={s.hole}
            className="text-center text-xs tabular-nums h-7 flex items-center justify-center"
            style={style}
          >
            {s.score}
          </div>
        );
      })}
      <div className="text-center text-sm font-black text-white tabular-nums h-7 flex items-center justify-center pl-1">
        {rowTotal}
      </div>
    </div>
  </div>
);

export default RoundCard;
