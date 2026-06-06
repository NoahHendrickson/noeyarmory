import Image from "next/image";
import { ResultRow } from "@repo/ui";

import { bungieIcon } from "../lib/bungie";
import type { OwnedArmorItem } from "../lib/armor-types";

function armorSubtitle(armor: OwnedArmorItem): string {
  if (armor.isArmor30) {
    const parts = [
      armor.setName,
      armor.archetype,
      armor.tertiaryStat,
      armor.tunableStat ? `${armor.tunableStat} +5` : undefined,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(" · ");
  }
  return `${armor.slot} · ${armor.classType}`;
}

/** A single armor row in the command-palette results list. */
export function ArmorResultRow({
  armor,
  onSelect,
}: {
  armor: OwnedArmorItem;
  onSelect?: () => void;
}) {
  const icon = bungieIcon(armor.icon);
  const watermark = bungieIcon(armor.watermark);

  return (
    <ResultRow
      render={onSelect ? undefined : <div />}
      onClick={onSelect}
      icon={
        <>
          {icon && (
            <Image src={icon} alt="" width={40} height={40} className="size-full" unoptimized />
          )}
          {watermark && (
            <Image
              src={watermark}
              alt=""
              width={40}
              height={40}
              className="absolute inset-0 size-full"
              unoptimized
            />
          )}
        </>
      }
      title={armor.name}
      subtitle={armorSubtitle(armor)}
      trailing={
        armor.isArmor30 ? (
          <span className="text-muted-foreground max-w-[12rem] truncate text-xs">
            {armor.slot}
          </span>
        ) : undefined
      }
    />
  );
}
