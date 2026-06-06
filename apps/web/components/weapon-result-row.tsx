import Image from "next/image";
import { ResultRow } from "@repo/ui";
import type { WeaponDoc } from "@repo/destiny";

import { CraftableBadge } from "./craftable-badge";
import { bungieIcon, ELEMENT_COLOR } from "../lib/bungie";

/** Subset a result row needs (works for both the full index and owned weapons). */
export type WeaponResultData = Pick<
  WeaponDoc,
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
  onSelect,
}: {
  weapon: WeaponResultData;
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
        <>
          <span className={ELEMENT_COLOR[weapon.element] ?? ""}>{weapon.element}</span>
          {" · "}
          {weapon.type}
        </>
      }
      trailing={weapon.craftable ? <CraftableBadge compact /> : undefined}
    />
  );
}
