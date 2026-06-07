import Image from "next/image";

import { cn } from "@repo/ui";

import { AMMO_COLOR, bungieIcon } from "../lib/bungie";

const MASK_STYLE = (src: string) =>
  ({
    maskImage: `url("${src}")`,
    WebkitMaskImage: `url("${src}")`,
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    backgroundColor: "currentColor",
  }) as const;

/** Destiny ammo-type HUD icon from DestinyIconDefinition (Primary / Special / Heavy). */
export function AmmoIcon({
  ammo,
  iconPath,
  className,
  /** Tint the icon: white (Primary), green (Special), purple (Heavy). Default on. */
  colored = true,
}: {
  ammo: string;
  /** Bungie manifest icon path from DestinyIconDefinition. */
  iconPath?: string;
  className?: string;
  colored?: boolean;
}) {
  const colorClass = AMMO_COLOR[ammo] ?? "text-white";
  const src = bungieIcon(iconPath);

  if (src && colored) {
    return (
      <span
        aria-hidden
        className={cn("size-3.5 shrink-0 inline-block", colorClass, className)}
        style={MASK_STYLE(src)}
      />
    );
  }

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={14}
        height={14}
        className={cn("size-3.5 shrink-0", className)}
        unoptimized
      />
    );
  }

  return (
    <span className={cn("text-xs font-medium", colorClass, className)} aria-hidden>
      {ammo.slice(0, 1)}
    </span>
  );
}
