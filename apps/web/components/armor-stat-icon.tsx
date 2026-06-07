import Image from "next/image";
import { ARMOR3_STAT_ICON_BY_HASH } from "@repo/destiny";
import { cn } from "@repo/ui";

import { bungieIcon } from "../lib/bungie";

/** Bungie manifest icon for an Armor 3.0 stat hash. */
export function ArmorStatIcon({
  statHash,
  className,
}: {
  statHash: number;
  className?: string;
}) {
  const src = bungieIcon(ARMOR3_STAT_ICON_BY_HASH[statHash]);
  if (!src) return null;

  return (
    <Image
      src={src}
      alt=""
      width={14}
      height={14}
      className={cn("size-3.5 shrink-0 opacity-90", className)}
      unoptimized
    />
  );
}
