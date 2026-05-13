import { useEffect } from "react";
import type { ActiveRound } from "@/types";

interface Props {
  round: ActiveRound;
  onClose: () => void;
}

function scoreColor(score: number, par: number): string {
  const diff = score - par;
  if (diff <= -2) return "#a78bfa"; // eagle+
  if (diff === -1) return "#22c55e"; // birdie
  if (diff === 0)  return "#e5e7eb"; // par
  if (diff === 1)  return "#fb923c"; // bogey
  return "#f87171";                  // double+
}

export function ScorecardModal({ round, onClose }: Props) {
  // закрыть по Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const totalPar = round.scorecard?.reduce((a, h) => a + h.par, 0) ?? 0;
  const totalScore = round.scorecard?.reduce((a, h) => a + h.score, 0) ?? round.score;
  const diff = totalScore - totalPar;
  const diffLabel = diff === 0 ? "E" : diff > 0 ? `+${diff}` : String(diff);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          zIndex: 51,
          background: "#111",
          borderRadius: "20px 20px 0 0",
          padding: "20px 16px 40px",
          maxHeight: "80dvh",
          overflowY: "auto",
        }}
      >
        {/* Handle — tap to close */}
        <div
          onClick={onClose}
          style={{ width: 36, height: 4, borderRadius: 2, background: "#444", margin: "0 auto 16px", cursor: "pointer", padding: "12px 0", boxSizing: "content-box" }}
        />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{round.playerName}</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{round.courseName ?? "Round"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: diff <= 0 ? "#22c55e" : "#f87171" }}>
              {diffLabel}
            </div>
            <div style={{ fontSize: 11, color: "#666" }}>{round.holesPlayed} holes</div>
          </div>
        </div>

        {/* Scorecard table */}
        {round.scorecard && round.scorecard.length > 0 ? (
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #222" }}>
            {/* Table header */}
            <div
              style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                background: "#1a1a1a",
                padding: "8px 16px",
                fontSize: 11,
                fontWeight: 700,
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              <span>Hole</span>
              <span style={{ textAlign: "center" }}>Par</span>
              <span style={{ textAlign: "right" }}>Score</span>
            </div>

            {round.scorecard.map((h, i) => (
              <div
                key={h.hole}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "10px 16px",
                  borderTop: "1px solid #1e1e1e",
                  background: i % 2 === 0 ? "#111" : "#131313",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600 }}>{h.hole}</span>
                <span style={{ fontSize: 14, color: "#888", textAlign: "center" }}>{h.par}</span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: scoreColor(h.score, h.par),
                    textAlign: "right",
                  }}
                >
                  {h.score}
                </span>
              </div>
            ))}

            {/* Total row */}
            <div
              style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                padding: "12px 16px",
                borderTop: "1px solid #333",
                background: "#1a1a1a",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: "#888" }}>Total</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#888", textAlign: "center" }}>{totalPar}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: diff <= 0 ? "#22c55e" : "#f87171", textAlign: "right" }}>
                {totalScore}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#555", padding: "32px 0", fontSize: 14 }}>
            No scores entered yet
          </div>
        )}
      </div>
    </>
  );
}
