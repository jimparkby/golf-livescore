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
    <div className="flex items-center justify-between gap-3">
      <CurrentUserBlock user={currentUser} />

      {hasActiveRounds ? (
        <div className="flex-1 min-w-0">
          <ActiveRoundsList rounds={visibleRounds} onPress={onRoundPress} />
        </div>
      ) : (
        <div className="flex items-center gap-3 shrink-0">
          <StatCircle value={currentUser.totalRounds} label="Rounds" />
        </div>
      )}
    </div>
  );
}
