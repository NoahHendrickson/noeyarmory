import { Pin } from "lucide-react";
import { cn } from "@repo/ui";

interface PinToggleButtonProps {
  pinned: boolean;
  label: string;
  onToggle: () => void;
  size?: "sm" | "md";
  className?: string;
}

export function PinToggleButton({
  pinned,
  label,
  onToggle,
  size = "md",
  className,
}: PinToggleButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pinned}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-white/10",
        size === "sm" ? "size-5" : "size-7",
        pinned ? "text-primary" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Pin className={cn(size === "sm" ? "size-3" : "size-3.5", pinned && "fill-current")} />
    </button>
  );
}
