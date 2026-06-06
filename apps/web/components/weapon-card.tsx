import Image from "next/image";
import Link from "next/link";
import { Badge, cn } from "@repo/ui";
import type { WeaponDoc } from "@repo/destiny";

import { bungieIcon, ELEMENT_COLOR, RARITY_RING } from "../lib/bungie";

export function WeaponCard({ weapon }: { weapon: WeaponDoc }) {
  const icon = bungieIcon(weapon.icon);
  const watermark = bungieIcon(weapon.watermark);

  return (
    <Link href={`/weapon/${weapon.hash}`} className="group block">
      <div className="bg-card hover:border-ring/60 flex gap-3 rounded-lg border p-3 transition-colors">
        <div
          className={cn(
            "relative size-14 shrink-0 overflow-hidden rounded ring-1",
            RARITY_RING[weapon.rarity] ?? "ring-border",
          )}
        >
          {icon && (
            <Image src={icon} alt="" width={56} height={56} className="size-14" unoptimized />
          )}
          {watermark && (
            <Image
              src={watermark}
              alt=""
              width={56}
              height={56}
              className="absolute inset-0 size-14"
              unoptimized
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="group-hover:text-primary truncate font-medium transition-colors">
            {weapon.name}
          </div>
          <div className="text-muted-foreground text-sm">
            <span className={ELEMENT_COLOR[weapon.element] ?? ""}>{weapon.element}</span>
            {" · "}
            {weapon.type}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge variant="outline">{weapon.ammo}</Badge>
            {weapon.frame && <Badge variant="secondary">{weapon.frame}</Badge>}
          </div>
        </div>
      </div>
    </Link>
  );
}
