import Image from "next/image";

import { cn } from "@repo/ui";

import { bungieIcon, RARITY_RING } from "../lib/bungie";

export function ArmorItemIcon({
  icon,
  watermark,
  rarity,
  size = 36,
  className,
}: {
  icon?: string;
  watermark?: string;
  rarity?: string;
  size?: number;
  className?: string;
}) {
  const iconUrl = bungieIcon(icon);
  const watermarkUrl = bungieIcon(watermark);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded ring-1",
        rarity ? (RARITY_RING[rarity] ?? "ring-border") : undefined,
        className,
      )}
      style={{ width: size, height: size }}
    >
      {iconUrl && (
        <Image
          src={iconUrl}
          alt=""
          width={size}
          height={size}
          className="size-full"
          unoptimized
        />
      )}
      {watermarkUrl && (
        <Image
          src={watermarkUrl}
          alt=""
          width={size}
          height={size}
          className="absolute inset-0 size-full"
          unoptimized
        />
      )}
    </div>
  );
}
