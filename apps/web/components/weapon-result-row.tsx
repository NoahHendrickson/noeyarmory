import Image from "next/image";
import { ResultRow } from "@repo/ui";
import type { WeaponSummary } from "@repo/destiny";

import { CraftableBadge } from "./craftable-badge";
import { ElementIcon } from "./element-icon";
import { bungieIcon } from "../lib/bungie";

/** Subset a result row needs (works for browse summaries and owned weapons). */
export type WeaponResultData = Pick<
  WeaponSummary,
  | "hash"
  | "name"
  | "icon"
  | "watermark"
  | "type"
  | "element"
  | "ammo"
  | "rarity"
  | "frame"
  | "craftable"
>;

/** A single weapon row in the command-palette results list. */
export function WeaponResultRow({
  weapon,
  elementIconPath,
  onSelect,
}: {
  weapon: WeaponResultData;
  /** Bungie manifest icon path for the weapon's damage type. */
  elementIconPath?: string;
  onSelect?: () => void;
}) {
  const icon = bungieIcon(weapon.icon);
  const watermark = bungieIcon(weapon.watermark);

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
      title={weapon.name}
      subtitle={
        <span className="inline-flex items-center gap-1">
          <ElementIcon element={weapon.element} iconPath={elementIconPath} colored />
          {weapon.type}
        </span>
      }
      trailing={weapon.craftable ? <CraftableBadge compact /> : undefined}
    />
  );
}
