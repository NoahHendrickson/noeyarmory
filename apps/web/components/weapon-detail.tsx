"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Badge, cn } from "@repo/ui";
import { computeWeaponStats, type WeaponDoc } from "@repo/destiny";

import { useWeaponBuild } from "../lib/use-weapon-build";
import { useWeaponDps } from "../lib/use-weapon-dps";
import { useStatGroups, useWeaponDetail, useWeapons } from "../lib/weapons-context";
import { bungieIcon } from "../lib/bungie";
import { CraftableBadge } from "./craftable-badge";
import { ElementIcon } from "./element-icon";
import { PerkColumnView } from "./perk-column";
import { StatBars } from "./stat-bars";

function WeaponScreenshot({ weapon }: { weapon: WeaponDoc }) {
  const screenshot = bungieIcon(weapon.screenshot);
  const icon = bungieIcon(weapon.icon);
  const watermark = bungieIcon(weapon.watermark);

  return (
    <div
      className={cn(
        "relative aspect-[5/2] w-full self-start overflow-hidden rounded-lg",
        !screenshot && "flex items-center justify-center",
        screenshot ? "bg-black/40" : "bg-muted/30",
      )}
    >
      {screenshot ? (
        <Image
          src={screenshot}
          alt={weapon.name}
          fill
          className="scale-110 object-cover object-center"
          unoptimized
          sizes="(max-width: 768px) 100vw, 420px"
        />
      ) : icon ? (
        <div className="relative size-32">
          <Image src={icon} alt="" width={128} height={128} className="size-32" unoptimized />
          {watermark && (
            <Image
              src={watermark}
              alt=""
              width={128}
              height={128}
              className="absolute inset-0 size-32"
              unoptimized
            />
          )}
        </div>
      ) : (
        <div className="text-muted-foreground text-sm">No image</div>
      )}
    </div>
  );
}

/** Pure weapon detail — screenshot + perk columns + stats. Shared by route and modal. */
export function WeaponDetailView({
  weapon,
  linkPerks = true,
  highlightedBuildPerks,
  interactive = true,
}: {
  weapon: WeaponDoc;
  linkPerks?: boolean;
  /** Trait perks from the community sustained-DPS benchmark for this weapon. */
  highlightedBuildPerks?: readonly string[];
  /** Enable perk selection for stat preview. */
  interactive?: boolean;
}) {
  const { damageTypes } = useWeapons();
  const statGroups = useStatGroups();
  const build = useWeaponBuild(weapon);

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

  const { stats, baseStats } = useMemo(
    () =>
      computeWeaponStats(
        weapon,
        interactive ? build.selectedPerkHashes : [],
        statGroups,
      ),
    [weapon, interactive, build.selectedPerkHashes, statGroups],
  );

  const showDeltas = interactive && build.selectedPerkHashes.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(280px,420px)_1fr]">
        <WeaponScreenshot weapon={weapon} />

        <div className="min-w-0 space-y-4">
          <header>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">{weapon.name}</h2>
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
              <p className="text-muted-foreground mt-3 max-w-prose text-sm italic">
                {weapon.flavor}
              </p>
            )}
          </header>

          <section>
            {weapon.columns.length > 0 ? (
              <div className="inline-grid grid-flow-col auto-cols-max items-start gap-x-2.5 overflow-x-auto pb-2">
                {weapon.columns.map((column, columnIndex) => {
                  const isIntrinsic = column.kind === "Intrinsic";
                  const canSelect = interactive && !isIntrinsic;
                  return (
                    <PerkColumnView
                      key={`${column.kind}-${columnIndex}`}
                      column={column}
                      linkPerks={canSelect ? false : linkPerks}
                      compactIntrinsic={isIntrinsic}
                      highlightedPerks={highlightedPerks}
                      selectedPerkHash={
                        canSelect ? build.selectedByColumn.get(columnIndex) : undefined
                      }
                      onSelectPerk={
                        canSelect
                          ? (perk) => {
                              build.togglePerk(columnIndex, perk);
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No perk data.</p>
            )}
          </section>
        </div>
      </div>

      <section>
        <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
          Stats
        </h3>
        <StatBars stats={stats} baseStats={showDeltas ? baseStats : undefined} />
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
        linkPerks={false}
        highlightedBuildPerks={dpsByName.get(weapon.name)?.buildPerks}
      />
    </div>
  );
}
