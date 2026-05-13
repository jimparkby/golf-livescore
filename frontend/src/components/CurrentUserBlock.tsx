import { IdCard } from "lucide-react";
import type { CurrentUser } from "@/types";

interface Props {
  user: CurrentUser;
}

export function CurrentUserBlock({ user }: Props) {
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div className="shrink-0 relative">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10"
          />
        ) : (
          <div className="w-14 h-14 rounded-full ring-2 ring-white/10 bg-warning grid place-items-center font-bold text-base text-primary-foreground">
            {initials}
          </div>
        )}
      </div>

      {/* Name + badges */}
      <div className="flex flex-col gap-1.5">
        <span className="font-bold text-base text-foreground leading-none">{user.name}</span>
        <div className="flex items-center gap-2">
          {/* HCP badge */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-500/50 text-blue-400 text-xs font-semibold">
            <IdCard className="w-3.5 h-3.5" />
            {user.handicapIndex}
          </span>
        </div>
      </div>
    </div>
  );
}
