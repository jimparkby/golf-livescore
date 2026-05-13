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
    <div style={{ position: "relative", display: "flex", alignItems: "center", height: 56 }}>
      {/* Left: avatar + name + HCP — lower z-index so bubbles slide over */}
      <div style={{ position: "relative", zIndex: 0, flexShrink: 0 }}>
        <CurrentUserBlock user={currentUser} />
      </div>

      {hasActiveRounds ? (
        // Bubbles: absolute from right, higher z-index.
        // gradient mask fades the left edge so bubbles emerge smoothly over the name.
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            maxWidth: "100%",
            display: "flex",
            alignItems: "center",
            zIndex: 10,
            paddingLeft: 44,
            WebkitMaskImage: "linear-gradient(90deg, transparent 0px, #000 44px)",
            maskImage: "linear-gradient(90deg, transparent 0px, #000 44px)",
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
