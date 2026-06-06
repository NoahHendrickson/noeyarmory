import { Hammer } from "lucide-react";
import { Badge, cn } from "@repo/ui";

/** Small affordance for weapons that can be crafted at the engram table. */
export function CraftableBadge({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1", className)}
      title="Can be crafted at the engram table"
    >
      <Hammer className="size-3 shrink-0" aria-hidden />
      {compact ? <span className="sr-only">Craftable</span> : "Craftable"}
    </Badge>
  );
}
