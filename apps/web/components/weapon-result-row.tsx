import { ResultRow } from "@repo/ui";
import { formatWeaponDpsLabel, type WeaponDpsEntry, type WeaponSummary } from "@repo/destiny";

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
  dps,
  onSelect,
}: {
  weapon: WeaponResultData;
  /** Bungie manifest icon path for the weapon's damage type. */
  elementIconPath?: string;
  dps?: WeaponDpsEntry;
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
            <img
              src={icon}
              alt=""
              width={40}
              height={40}
              className="size-full"
              loading="lazy"
              decoding="async"
            />
          )}
          {watermark && (
            <img
              src={watermark}
              alt=""
              width={40}
              height={40}
              className="absolute inset-0 size-full"
              loading="lazy"
              decoding="async"
            />
          )}
        </>
      }
      title={weapon.name}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <ElementIcon element={weapon.element} iconPath={elementIconPath} colored />
          {weapon.craftable ? <CraftableBadge className="mx-0.5" /> : null}
          {weapon.type}
        </span>
      }
      trailing={
        dps != null ? (
          <span className="text-muted-foreground text-sm tabular-nums tracking-body">
            {formatWeaponDpsLabel(dps)}
          </span>
        ) : undefined
      }
    />
  );
}
