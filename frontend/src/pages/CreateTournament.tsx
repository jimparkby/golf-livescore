import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { FORMATS, type FormatId } from "@/lib/formats";
import { useGolf } from "@/store/golfStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const CreateTournamentPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { addCustomTournament } = useGolf();

  const preselectedFormat = (params.get("format") as FormatId | null) ?? "stroke_play";

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [format, setFormat] = useState<FormatId>(preselectedFormat);
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (!name.trim()) { toast.error("Enter tournament name"); return; }
    addCustomTournament({ name: name.trim(), date: date || "—", day, month, format, notes: notes || undefined });
    toast.success("Tournament created!");
    navigate("/tournaments");
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <button onClick={() => navigate("/tournaments")} className="flex items-center gap-1 text-action font-bold text-lg">
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} /> Create Tournament
      </button>

      {/* Basic info */}
      <Card className="p-4 shadow-soft space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
            Name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Tournament 2026"
            className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-action text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
              Date
            </label>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="26"
              className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-action text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
              Day
            </label>
            <input
              value={day}
              onChange={(e) => setDay(e.target.value)}
              placeholder="SAT"
              className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-action text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
            Month
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MONTHS.map((m) => (
              <button
                key={m}
                onClick={() => setMonth(m)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                  month === m ? "bg-action text-action-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional information…"
            rows={2}
            className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-action text-sm resize-none"
          />
        </div>
      </Card>

      {/* Format picker */}
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-3">
          Game Format
        </div>
        <div className="space-y-2">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={cn(
                "w-full p-4 rounded-2xl border-2 text-left transition-all",
                format === f.id
                  ? "border-action bg-action/5"
                  : "border-border hover:border-muted-foreground/30 bg-card",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{f.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.players}</div>
                </div>
                {format === f.id && (
                  <div className="h-5 w-5 rounded-full bg-action grid place-items-center shrink-0">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
              {format === f.id && (
                <div className="mt-2 pt-2 border-t border-action/20">
                  <div className="text-xs text-muted-foreground">{f.description}</div>
                  <div className="text-xs text-action mt-1 font-medium">💡 {f.tip}</div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSave}
        size="lg"
        className="w-full h-14 bg-action hover:bg-action/90 text-action-foreground rounded-xl text-base font-semibold shadow-glow"
      >
        Create Tournament
      </Button>
    </div>
  );
};

export default CreateTournamentPage;
