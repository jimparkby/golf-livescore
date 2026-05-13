import type { ActiveRound } from "@/types";

interface Props {
  rounds: ActiveRound[];
}

export function ActiveRoundsList({ rounds }: Props) {
  return (
    <div
      data-rounds
      style={{
        display: "flex",
        gap: 16,
        overflowX: "auto",
        paddingBottom: 4,
      }}
    >
      {rounds.map((r) => (
        <div
          key={r.id}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 48 }}
        >
          <span
            style={{
              background: "#1a1a1a",
              border: "1px solid #444",
              borderRadius: 6,
              padding: "2px 7px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            +{r.holesPlayed}
          </span>
          <span style={{ fontSize: 12, textAlign: "center", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.playerName}
          </span>
        </div>
      ))}
    </div>
  );
}
