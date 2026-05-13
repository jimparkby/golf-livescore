import type { CurrentUser, ActiveRound } from "@/types";
import { useRoundExpiry } from "@/hooks/useRoundExpiry";
import { CurrentUserBlock } from "./CurrentUserBlock";
import { ActiveRoundsList } from "./ActiveRoundsList";

interface HeaderPanelProps {
  currentUser: CurrentUser;
  activeRounds: ActiveRound[];
  onRoundPress?: (round: ActiveRound) => void;
}

function StatCircle({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-12 h-12 rounded-full grid place-items-center font-bold text-base text-white"
        style={{
          background: "hsl(220 25% 20%)",
          boxShadow: "0 0 0 3px hsl(220 25% 30%)",
        }}
      >
        {value}
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

export function HeaderPanel({ currentUser, activeRounds, onRoundPress }: HeaderPanelProps) {
  const visibleRounds = useRoundExpiry(activeRounds);
  const hasActiveRounds = visibleRounds.length > 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
      {/* Name — always visible, never shrinks */}
      <div style={{ flexShrink: 0 }}>
        <CurrentUserBlock user={currentUser} />
      </div>

      {hasActiveRounds ? (
        // Bubbles take remaining space, fade in from the left edge
        <div
          style={{
            flex: 1,
            minWidth: 0,
            WebkitMaskImage: "linear-gradient(to right, transparent 0px, #000 14px)",
            maskImage: "linear-gradient(to right, transparent 0px, #000 14px)",
          }}
        >
          <ActiveRoundsList rounds={visibleRounds} onPress={onRoundPress} />
        </div>
      ) : (
        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
          <StatCircle value={currentUser.totalRounds} label="Rounds" />
        </div>
      )}
    </div>
  );
}
