"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, cn } from "@repo/ui";
import {
  computeWeaponStats,
  formatWeaponDpsParts,
  type PerkRef,
  type WeaponDoc,
  type WeaponDpsEntry,
  type WeaponStat,
} from "@repo/destiny";

import { useWeaponBuild } from "../lib/use-weapon-build";
import { useWeaponDps } from "../lib/use-weapon-dps";
import { useStatGroups, useWeaponDetail, useWeapons } from "../lib/weapons-context";
import { trackWeaponView } from "../lib/track-weapon-view";
import { bungieIcon, RARITY_RING } from "../lib/bungie";
import { AmmoIcon } from "./ammo-icon";
import { CraftableBadge } from "./craftable-badge";
import { ElementIcon } from "./element-icon";
import { weaponTypeLabel } from "./weapon-result-row";
import { PerkColumnView } from "./perk-column";
import { StatBars } from "./stat-bars";

function statsDiffer(a: WeaponStat[], b: WeaponStat[]): boolean {
  const bByHash = new Map(b.map((stat) => [stat.hash, stat.value]));
  return a.some((stat) => bByHash.get(stat.hash) !== stat.value);
}

function WeaponThumbnail({ weapon }: { weapon: WeaponDoc }) {
  const icon = bungieIcon(weapon.icon);
  const watermark = bungieIcon(weapon.watermark);

  return (
    <div
      className={cn(
        "relative size-12 shrink-0 overflow-hidden rounded ring-1 sm:size-14",
        RARITY_RING[weapon.rarity] ?? "ring-border",
      )}
    >
      {icon ? (
        <Image
          src={icon}
          alt=""
          width={56}
          height={56}
          className="size-full"
          unoptimized
        />
      ) : (
        <div className="bg-muted/30 size-full" />
      )}
      {watermark && (
        <Image
          src={watermark}
          alt=""
          width={56}
          height={56}
          className="absolute inset-0 size-full"
          unoptimized
        />
      )}
    </div>
  );
}

function WeaponDpsSummary({ entry }: { entry: WeaponDpsEntry }) {
  const { total, dps } = formatWeaponDpsParts(entry);
  const hasBenchmarkPerks = entry.buildPerks.length > 0;

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
      <div className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground">Total Damage</span>
        <span className="tabular-nums font-medium">{total}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground">DPS</span>
        <span className="tabular-nums font-medium">{dps}</span>
        {hasBenchmarkPerks && (
          <span
            className="text-3xl text-amber-400 font-medium leading-none"
            title="Perks marked with * on the right are used in the community DPS benchmark."
          >
            *
          </span>
        )}
      </div>
    </div>
  );
}

/** Pure weapon detail — header + perk columns + stats. Shared by route and modal. */
export function WeaponDetailView({
  weapon,
  linkPerks = true,
  highlightedBuildPerks,
  dps,
  interactive = true,
}: {
  weapon: WeaponDoc;
  linkPerks?: boolean;
  /** Trait perks from the community sustained-DPS benchmark for this weapon. */
  highlightedBuildPerks?: readonly string[];
  /** Community sustained-DPS benchmark entry; falls back to loaded index by weapon name. */
  dps?: WeaponDpsEntry;
  /** Enable perk selection for stat preview. */
  interactive?: boolean;
}) {
  const { damageTypes, ammoTypes } = useWeapons();
  const { dpsByName } = useWeaponDps();
  const statGroups = useStatGroups();
  const build = useWeaponBuild(weapon);
  const [hoverPreview, setHoverPreview] = useState<{
    columnIndex: number;
    perk: PerkRef;
  } | null>(null);
  const dpsEntry = dps ?? dpsByName.get(weapon.name);

  const clearHoverPreview = useCallback(() => setHoverPreview(null), []);

  // Stable across renders (deps are stable) so PerkColumnView can forward them to
  // memo(PerkTile) without busting the memo on every hover/selection re-render.
  const handleHoverPerk = useCallback(
    (columnIndex: number, perk: PerkRef) => {
      if (perk.statMods?.length) {
        setHoverPreview({ columnIndex, perk });
      } else {
        clearHoverPreview();
      }
    },
    [clearHoverPreview],
  );

  useEffect(() => {
    setHoverPreview(null);
  }, [weapon.hash]);

  const elementIconPath = useMemo(
    () => damageTypes.find((damageType) => damageType.name === weapon.element)?.icon,
    [damageTypes, weapon.element],
  );
  const ammoIconPath = useMemo(
    () => ammoTypes.find((ammoType) => ammoType.name === weapon.ammo)?.icon,
    [ammoTypes, weapon.ammo],
  );
  const highlightedPerks = useMemo(
    () =>
      highlightedBuildPerks && highlightedBuildPerks.length > 0
        ? new Set(highlightedBuildPerks.map((perk) => perk.toLowerCase()))
        : undefined,
    [highlightedBuildPerks],
  );

  const selectedPerkHashes = interactive ? build.selectedPerkHashes : [];

  const { stats: currentStats } = useMemo(
    () => computeWeaponStats(weapon, selectedPerkHashes, statGroups),
    [weapon, selectedPerkHashes, statGroups],
  );

  const previewPerkHashes = useMemo(() => {
    if (!hoverPreview) return selectedPerkHashes;
    const next = new Map(build.selectedByColumn);
    next.set(hoverPreview.columnIndex, hoverPreview.perk.hash);
    return [...next.values()];
  }, [hoverPreview, build.selectedByColumn, selectedPerkHashes]);

  const { stats: previewStats } = useMemo(
    () => computeWeaponStats(weapon, previewPerkHashes, statGroups),
    [weapon, previewPerkHashes, statGroups],
  );

  const hoverChangesStats =
    hoverPreview != null && statsDiffer(previewStats, currentStats);
  const displayStats = hoverChangesStats ? previewStats : currentStats;
  const showDeltas = hoverChangesStats;
  const deltaBaseStats = currentStats;

  return (
    <div>
      <header className="border-border/50 bg-black/[0.03] -mx-4 -mt-4 flex gap-3 border-b px-4 pb-4 pt-4 backdrop-blur-sm sm:-mx-6 sm:-mt-6 sm:px-6 sm:pb-5 sm:pt-6">
        <WeaponThumbnail weapon={weapon} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">{weapon.name}</h2>
          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-none">
            <span className="inline-flex items-center" title={weapon.element} aria-label={weapon.element}>
              <ElementIcon
                element={weapon.element}
                iconPath={elementIconPath}
                colored
                className="size-4"
              />
              <span className="sr-only">{weapon.element}</span>
            </span>
            <span
              className="inline-flex items-center"
              title={`${weapon.ammo} ammo`}
              aria-label={`${weapon.ammo} ammo`}
            >
              <AmmoIcon ammo={weapon.ammo} iconPath={ammoIconPath} className="size-8" />
              <span className="sr-only">{weapon.ammo} ammo</span>
            </span>
            <span>
              {weaponTypeLabel(weapon.type, weapon.frame)} {weapon.rarity}
            </span>
            {weapon.craftable && <CraftableBadge />}
            {weapon.adept && <Badge>Adept</Badge>}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-[minmax(220px,280px)_max-content]">
        <div className="space-y-3 self-start">
          {dpsEntry && <WeaponDpsSummary entry={dpsEntry} />}
          <StatBars
            stats={displayStats}
            baseStats={showDeltas ? deltaBaseStats : undefined}
            compact
          />
        </div>

        <div className="min-w-0">
          <section>
            {weapon.columns.length > 0 ? (
              <div className="inline-grid grid-flow-col auto-cols-max items-start gap-x-2.5 overflow-x-auto px-1.5 py-1">
                {weapon.columns.map((column, columnIndex) => {
                  if (column.kind === "Intrinsic") return null;
                  const canSelect = interactive;
                  return (
                    <PerkColumnView
                      key={`${column.kind}-${columnIndex}`}
                      column={column}
                      columnIndex={columnIndex}
                      linkPerks={canSelect ? false : linkPerks}
                      highlightedPerks={highlightedPerks}
                      selectedPerkHash={
                        canSelect ? build.selectedByColumn.get(columnIndex) : undefined
                      }
                      onSelectPerk={canSelect ? build.togglePerk : undefined}
                      onHoverPerk={canSelect ? handleHoverPerk : undefined}
                      onHoverEnd={canSelect ? clearHoverPreview : undefined}
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
  const trackedHashRef = useRef<number | null>(null);

  useEffect(() => {
    if (!weapon || trackedHashRef.current === weapon.hash) return;
    trackedHashRef.current = weapon.hash;
    trackWeaponView(weapon.hash, "direct");
  }, [weapon]);

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
        dps={dpsByName.get(weapon.name)}
        highlightedBuildPerks={dpsByName.get(weapon.name)?.buildPerks}
      />
    </div>
  );
}
