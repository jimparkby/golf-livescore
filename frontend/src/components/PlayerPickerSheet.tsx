import { useState, useEffect } from "react";
import { Avatar } from "@/components/PlayerAvatar";
import { type Player } from "@/store/golfStore";
import { api } from "@/lib/api";
import { X, Search } from "lucide-react";

type UserResult = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  hcp: number | null;
  photo_url: string | null;
};

const mkName = (u: UserResult) =>
  [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "Player";
const mkInitials = (name: string) =>
  name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

export const PlayerPickerSheet = ({
  players,
  onAdd,
  onClose,
}: {
  players: Player[];
  onAdd: (p: Player) => void;
  onClose: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [allUsers, setAllUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<UserResult[]>("/api/users/all")
      .then(setAllUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? allUsers.filter((u) => {
        const n = mkName(u).toLowerCase();
        const un = (u.username ?? "").toLowerCase();
        return n.includes(q) || un.includes(q);
      })
    : allUsers;

  const alreadyAdded = (id: string) => !!players.find((p) => p.id === id);

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-in fade-in duration-150">
      <button className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full rounded-t-3xl animate-in slide-in-from-bottom duration-250 flex flex-col"
        style={{ background: "#1c1c1e", maxHeight: "85vh", paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
      >
        <div className="mx-auto w-10 h-1 rounded-full mt-3 mb-4" style={{ background: "rgba(255,255,255,0.15)" }} />
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="text-white font-bold text-lg">Добавить игрока</div>
          <button onClick={onClose} className="h-8 w-8 rounded-full grid place-items-center" style={{ background: "rgba(255,255,255,0.1)" }}>
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
            <input
              type="text"
              autoFocus
              placeholder="Имя или @username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-11 rounded-xl pl-10 pr-4 text-white text-sm outline-none placeholder:text-white/30"
              style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.1)" }}
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-3 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 rounded-full border-2 border-action border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              {q ? "Никого не найдено" : "Нет других игроков"}
            </div>
          ) : (
            filtered.map((u) => {
              const n = mkName(u);
              const added = alreadyAdded(u.id);
              return (
                <button
                  key={u.id}
                  disabled={added}
                  onClick={() =>
                    onAdd({
                      id: u.id,
                      name: n,
                      initials: mkInitials(n),
                      hcp: u.hcp ?? 0,
                      photoUrl: u.photo_url ?? undefined,
                    })
                  }
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 active:scale-[0.98] transition-transform disabled:opacity-40"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  {u.photo_url ? (
                    <img src={u.photo_url} alt={n} className="h-12 w-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <Avatar name={n} tone="muted" />
                  )}
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">{n}</div>
                    <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {u.username ? `@${u.username}` : `HCP ${u.hcp ?? "—"}`}
                    </div>
                  </div>
                  {added ? (
                    <div className="text-xs font-semibold shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>Добавлен</div>
                  ) : (
                    <div className="text-sm font-semibold shrink-0" style={{ color: "#22c55e" }}>+ Add</div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
