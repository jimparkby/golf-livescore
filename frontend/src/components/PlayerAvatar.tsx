import { cn } from "@/lib/utils";

type Props = { name: string; size?: "sm" | "md" | "lg"; tone?: "orange" | "muted"; className?: string };

export const Avatar = ({ name, size = "md", tone = "orange", className }: Props) => {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sizes = {
    sm: "h-9 w-9 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg",
  } as const;
  const tones = {
    orange: "bg-warning text-primary-foreground",
    muted: "bg-muted text-muted-foreground",
  } as const;
  return (
    <div
      className={cn(
        "rounded-full grid place-items-center font-bold shrink-0 shadow-soft",
        sizes[size],
        tones[tone],
        className,
      )}
    >
      {initials}
    </div>
  );
};
