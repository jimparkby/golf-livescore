import type { ActiveRound } from "@/types";

interface Props {
  rounds: ActiveRound[];
  onPress?: (round: ActiveRound) => void;
}

function scoreToBadge(r: ActiveRound): string {
  if (r.holesPlayed === 0) return "–";
  if (r.scorecard && r.scorecard.length > 0) {
    const diff = r.scorecard.reduce((a, h) => a + h.score - h.par, 0);
    if (diff === 0) return "E";
    return diff > 0 ? `+${diff}` : String(diff);
  }
  return String(r.score);
}

function badgeColor(r: ActiveRound): string {
  if (!r.scorecard || r.scorecard.length === 0 || r.holesPlayed === 0) return "#22c55e";
  const diff = r.scorecard.reduce((a, h) => a + h.score - h.par, 0);
  if (diff < 0) return "#22c55e";
  if (diff === 0) return "#888";
  return "#f87171";
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export function ActiveRoundsList({ rounds, onPress }: Props) {
  return (
    <div
      data-rounds
      style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 2 }}
    >
      {rounds.map((r) => (
        <button
          key={r.id}
          onClick={() => onPress?.(r)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            minWidth: 52,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          {/* Story ring + avatar */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                padding: 2,
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
              }}
            >
              {r.avatarUrl ? (
                <img
                  src={r.avatarUrl}
                  alt={r.playerName}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #000",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    background: "#1f2937",
                    border: "2px solid #000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {initials(r.playerName)}
                </div>
              )}
            </div>
            {/* Score badge */}
            <span
              style={{
                position: "absolute",
                bottom: -4,
                right: -6,
                background: badgeColor(r),
                color: "#000",
                borderRadius: 6,
                padding: "1px 5px",
                fontSize: 10,
                fontWeight: 800,
                lineHeight: 1.5,
                border: "1.5px solid #000",
              }}
            >
              {scoreToBadge(r)}
            </span>
          </div>

          {/* Name */}
          <span
            style={{
              fontSize: 11,
              color: "#ccc",
              maxWidth: 52,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            {r.playerName.split(" ")[0]}
          </span>
        </button>
      ))}
    </div>
  );
}
