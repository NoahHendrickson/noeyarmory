import Image from "next/image";
import { Badge, cn } from "@repo/ui";

import { CRAFTED_ICON_OVERLAY } from "../lib/bungie";

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
      <Image
        src={CRAFTED_ICON_OVERLAY}
        alt=""
        width={12}
        height={12}
        className="size-3 shrink-0"
        unoptimized
        aria-hidden
      />
      {compact ? <span className="sr-only">Craftable</span> : "Craftable"}
    </Badge>
  );
}
