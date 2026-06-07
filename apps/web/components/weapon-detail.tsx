"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Badge, cn } from "@repo/ui";
import type { WeaponDoc } from "@repo/destiny";

import { useWeaponDps } from "../lib/use-weapon-dps";
import { useWeaponDetail, useWeapons } from "../lib/weapons-context";
import { bungieIcon, RARITY_RING } from "../lib/bungie";
import { CraftableBadge } from "./craftable-badge";
import { ElementIcon } from "./element-icon";
import { PerkColumnView } from "./perk-column";
import { StatBars } from "./stat-bars";

/** Pure weapon detail — header + light.gg-style perk columns + stats. Shared by
 * the `/weapon/[hash]` route and the in-app modal. */
export function WeaponDetailView({
  weapon,
  linkPerks = true,
  highlightedBuildPerks,
}: {
  weapon: WeaponDoc;
  linkPerks?: boolean;
  /** Trait perks from the community sustained-DPS benchmark for this weapon. */
  highlightedBuildPerks?: readonly string[];
}) {
  const { damageTypes } = useWeapons();
  const elementIconPath = useMemo(
    () => damageTypes.find((damageType) => damageType.name === weapon.element)?.icon,
    [damageTypes, weapon.element],
  );
  const highlightedPerks = useMemo(
    () =>
      highlightedBuildPerks && highlightedBuildPerks.length > 0
        ? new Set(highlightedBuildPerks.map((perk) => perk.toLowerCase()))
        : undefined,
    [highlightedBuildPerks],
  );
  const icon = bungieIcon(weapon.icon);
  const watermark = bungieIcon(weapon.watermark);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row">
        <div
          className={cn(
            "relative size-16 shrink-0 overflow-hidden rounded ring-1",
            RARITY_RING[weapon.rarity] ?? "ring-border",
          )}
        >
          {icon && (
            <Image src={icon} alt="" width={64} height={64} className="size-16" unoptimized />
          )}
          {watermark && (
            <Image
              src={watermark}
              alt=""
              width={64}
              height={64}
              className="absolute inset-0 size-16"
              unoptimized
            />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">{weapon.name}</h2>
          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
            <span className="inline-flex items-center" title={weapon.element}>
              <ElementIcon
                element={weapon.element}
                iconPath={elementIconPath}
                colored
                className="size-4"
              />
              <span className="sr-only">{weapon.element}</span>
            </span>
            <span>{weapon.type}</span>
            <span>{weapon.rarity}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="outline">{weapon.ammo}</Badge>
            {weapon.frame && <Badge variant="secondary">{weapon.frame}</Badge>}
            {weapon.craftable && <CraftableBadge />}
            {weapon.adept && <Badge>Adept</Badge>}
          </div>
          {weapon.flavor && (
            <p className="text-muted-foreground mt-3 max-w-prose text-sm italic">{weapon.flavor}</p>
          )}
        </div>
      </header>

      <section>
        {weapon.columns.length > 0 ? (
          <div className="inline-grid grid-flow-col auto-cols-max items-start gap-x-2.5 overflow-x-auto pb-2">
            {weapon.columns
              .filter((c) => c.kind === "Intrinsic")
              .map((column, i) => (
                <PerkColumnView
                  key={`intrinsic-${i}`}
                  column={column}
                  linkPerks={linkPerks}
                  compactIntrinsic
                  highlightedPerks={highlightedPerks}
                />
              ))}
            {weapon.columns
              .filter((c) => c.kind !== "Intrinsic")
              .map((column, i) => (
                <PerkColumnView
                  key={`${column.kind}-${i}`}
                  column={column}
                  linkPerks={linkPerks}
                  highlightedPerks={highlightedPerks}
                />
              ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No perk data.</p>
        )}
      </section>

      <section>
        <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
          Stats
        </h3>
        <StatBars stats={weapon.stats} />
      </section>
    </div>
  );
}

/** Standalone `/weapon/[hash]` route view: uses SSR seed when available, else shared index. */
export function WeaponDetail({
  hash,
  initialWeapon,
}: {
  hash: number;
  initialWeapon?: WeaponDoc;
}) {
  const { weapon, loading } = useWeaponDetail(hash, initialWeapon);
  const { dpsByName } = useWeaponDps();

  if (!weapon && loading) {
    return <div className="text-muted-foreground p-6">Loading…</div>;
  }

  if (!weapon) {
    return (
      <div className="space-y-2 p-6">
        <p>Weapon not found.</p>
        <Link href="/" className="text-sm underline">
          ← Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
        ← Back to search
      </Link>
      <WeaponDetailView
        weapon={weapon}
        linkPerks
        highlightedBuildPerks={dpsByName.get(weapon.name)?.buildPerks}
      />
    </div>
  );
}
