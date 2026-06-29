"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { cn, PillSelect, type PillSelectOption } from "@repo/ui";
import {
  computeWeaponStats,
  currentWeaponPerkPoolVersions,
  formatWeaponDpsParts,
  weaponPerkPoolVersionForHash,
  weaponsInVersionFamily,
  WEAPON_DPS_SHEET_NAME,
  type PerkRef,
  type WeaponDoc,
  type WeaponDpsEntry,
  type WeaponStat,
} from "@repo/destiny";

import { useWeaponBuild } from "../lib/use-weapon-build";
import { useWeaponDps } from "../lib/use-weapon-dps";
import { useHasHover } from "../hooks/use-has-hover";
import { useStatGroups, useWeaponDetail, useWeapons } from "../lib/weapons-context";
import { trackPerkCommit } from "../lib/track-perk-commit";
import { trackWeaponView } from "../lib/track-weapon-view";
import { bungieIcon, RARITY_RING } from "../lib/bungie";
import { AmmoIcon } from "./ammo-icon";
import { CraftableBadge } from "./craftable-badge";
import { ElementIcon } from "./element-icon";
import { weaponTypeLabel } from "./weapon-result-row";
import { PerkColumnView } from "./perk-column";
import { StatBars } from "./stat-bars";
import { WeaponMasterworkSelector } from "./weapon-masterwork-selector";
import { WeaponShareButton } from "./weapon-share-button";
import { WeaponDpsMetricTooltip } from "./weapon-dps-label";
import { WeaponDetailPageShell } from "./weapon-detail-page-shell";
import type { WeaponSearchSelectionSource } from "./weapon-search-palette";

const EMPTY_SELECTED_PERK_HASHES: number[] = [];

function WeaponVersionSelector({
  options,
  value,
  onValueChange,
}: {
  options: PillSelectOption<string>[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <PillSelect
        variant="ghost"
        aria-label="Weapon version"
        options={options}
        value={value}
        onValueChange={onValueChange}
      />
    </div>
  );
}

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
        <Image src={icon} alt="" width={56} height={56} className="size-full" unoptimized />
      ) : (
        <div className="size-full bg-muted/30" />
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
  const valueClassName =
    "tabular-nums font-medium underline decoration-dotted decoration-muted-foreground/50 underline-offset-2";

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
      <div className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground">Total Damage</span>
        <WeaponDpsMetricTooltip
          label="Total damage"
          description={`Estimated total damage from the ${WEAPON_DPS_SHEET_NAME} boss-DPS benchmark for this weapon's optimal community build.`}
          buildDescription={entry.buildDescription}
          tooltipSide="top"
          valueClassName={valueClassName}
        >
          {total}
        </WeaponDpsMetricTooltip>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground">DPS</span>
        <WeaponDpsMetricTooltip
          label="DPS"
          description={`Estimated sustained damage per second from the ${WEAPON_DPS_SHEET_NAME} benchmark build.`}
          buildDescription={entry.buildDescription}
          tooltipSide="top"
          valueClassName={valueClassName}
        >
          {dps}
        </WeaponDpsMetricTooltip>
        {hasBenchmarkPerks && (
          <span
            className="text-3xl leading-none font-medium text-amber-400"
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
  versionSelector,
}: {
  weapon: WeaponDoc;
  linkPerks?: boolean;
  /** Trait perks from the community sustained-DPS benchmark for this weapon. */
  highlightedBuildPerks?: readonly string[];
  /** Community sustained-DPS benchmark entry; falls back to loaded index by weapon name. */
  dps?: WeaponDpsEntry;
  /** Enable perk selection for stat preview. */
  interactive?: boolean;
  /** Optional selector for switching between current same-name perk pools. */
  versionSelector?: ReactNode;
}) {
  const { damageTypes, ammoTypes } = useWeapons();
  const { dpsByName } = useWeaponDps();
  const statGroups = useStatGroups();
  const build = useWeaponBuild(weapon);
  const hasHover = useHasHover();
  const [hoverPreview, setHoverPreview] = useState<{
    columnIndex: number;
    perk: PerkRef;
  } | null>(null);
  const [selectedMasterworkStatHash, setSelectedMasterworkStatHash] = useState<number | null>(null);
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

  useEffect(() => {
    setSelectedMasterworkStatHash(null);
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

  const selectedPerkHashes = interactive ? build.selectedPerkHashes : EMPTY_SELECTED_PERK_HASHES;

  const masterworkStatMods = useMemo(() => {
    if (!interactive || selectedMasterworkStatHash == null) return [];
    const option = weapon.masterworkOptions?.find(
      (entry) => entry.statHash === selectedMasterworkStatHash,
    );
    return option?.statMods ?? [];
  }, [interactive, selectedMasterworkStatHash, weapon.masterworkOptions]);

  const { stats: currentStats } = useMemo(
    () => computeWeaponStats(weapon, selectedPerkHashes, statGroups, masterworkStatMods),
    [weapon, selectedPerkHashes, statGroups, masterworkStatMods],
  );

  const { stats: statsWithoutMasterwork } = useMemo(
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
    () => computeWeaponStats(weapon, previewPerkHashes, statGroups, masterworkStatMods),
    [weapon, previewPerkHashes, statGroups, masterworkStatMods],
  );

  const hoverChangesStats = hoverPreview != null && statsDiffer(previewStats, currentStats);
  const masterworkChangesStats =
    !hoverChangesStats &&
    masterworkStatMods.length > 0 &&
    statsDiffer(currentStats, statsWithoutMasterwork);
  const displayStats = hoverChangesStats ? previewStats : currentStats;
  const showDeltas = hoverChangesStats || masterworkChangesStats;
  const deltaBaseStats = hoverChangesStats ? currentStats : statsWithoutMasterwork;

  return (
    <div className="mx-auto w-fit max-w-full">
      <header className="-mx-4 -mt-4 flex items-start gap-3 border-b border-border/50 px-4 pt-4 pb-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 sm:pb-5">
        <WeaponThumbnail weapon={weapon} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">{weapon.name}</h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-none text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-flex items-center"
                title={weapon.element}
                aria-label={weapon.element}
              >
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
                <AmmoIcon ammo={weapon.ammo} iconPath={ammoIconPath} className="size-6" />
                <span className="sr-only">{weapon.ammo} ammo</span>
              </span>
              {weapon.craftable && (
                <span className="inline-flex items-center" title="Craftable">
                  <CraftableBadge />
                </span>
              )}
            </span>
            <span>{weaponTypeLabel(weapon.type, weapon.frame)}</span>
          </div>
        </div>
        <WeaponShareButton weaponHash={weapon.hash} />
      </header>

      <div className="grid w-fit max-w-full grid-cols-1 gap-8 pt-6 md:grid-cols-[minmax(220px,280px)_max-content] md:gap-x-12 md:gap-y-6">
        <div className="space-y-3 self-start">
          {dpsEntry && <WeaponDpsSummary entry={dpsEntry} />}
          {weapon.masterworkOptions?.length ? (
            <WeaponMasterworkSelector
              options={weapon.masterworkOptions}
              selectedStatHash={interactive ? selectedMasterworkStatHash : null}
              onSelect={setSelectedMasterworkStatHash}
              disabled={!interactive}
            />
          ) : null}
          <StatBars
            stats={displayStats}
            baseStats={showDeltas ? deltaBaseStats : undefined}
            compact
          />
        </div>

        <div className="min-w-0">
          <section>
            {versionSelector}
            {weapon.columns.length > 0 ? (
              <div className="inline-grid auto-cols-max grid-flow-col items-start gap-x-2.5 overflow-x-auto px-1.5 py-1">
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
                      hasHover={hasHover}
                      selectedPerkHash={
                        canSelect ? build.selectedByColumn.get(columnIndex) : undefined
                      }
                      onSelectPerk={
                        canSelect
                          ? (colIndex, perk) => {
                              if (!build.isSelected(colIndex, perk.hash)) {
                                trackPerkCommit(perk.name, "build");
                              }
                              build.togglePerk(colIndex, perk);
                            }
                          : undefined
                      }
                      onHoverPerk={canSelect ? handleHoverPerk : undefined}
                      onHoverEnd={canSelect ? clearHoverPreview : undefined}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No perk data.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function WeaponDetailWithVersions({
  weapon,
  linkPerks = false,
  dps,
  highlightedBuildPerks,
  viewSource,
  skipInitialViewTrack = false,
  onSelectVersion,
}: {
  weapon: WeaponDoc;
  linkPerks?: boolean;
  dps?: WeaponDpsEntry;
  highlightedBuildPerks?: readonly string[];
  viewSource?: "direct" | "search";
  skipInitialViewTrack?: boolean;
  onSelectVersion?: (hash: number) => void;
}) {
  const { weapons } = useWeapons();
  const trackedHashRef = useRef<number | null>(null);
  const skippedInitialTrackRef = useRef(false);
  const versionOptions = useMemo(() => {
    const siblings = weaponsInVersionFamily(weapons, weapon.name);
    if (siblings.length === 0) return [];
    return currentWeaponPerkPoolVersions(siblings);
  }, [weapons, weapon.name]);
  const activeVersion = useMemo(
    () => weaponPerkPoolVersionForHash(versionOptions, weapon.hash) ?? versionOptions[0],
    [versionOptions, weapon.hash],
  );
  const pillOptions = useMemo<PillSelectOption<string>[]>(
    () =>
      versionOptions.map((version) => ({
        value: String(version.weapon.hash),
        label: version.label,
      })),
    [versionOptions],
  );
  const versionSelector =
    onSelectVersion && versionOptions.length > 1 && activeVersion ? (
      <WeaponVersionSelector
        options={pillOptions}
        value={String(activeVersion.weapon.hash)}
        onValueChange={(value) => onSelectVersion(Number(value))}
      />
    ) : undefined;

  useEffect(() => {
    trackedHashRef.current = null;
  }, [weapon.hash]);

  useEffect(() => {
    if (!viewSource) return;
    if (skipInitialViewTrack && !skippedInitialTrackRef.current) {
      skippedInitialTrackRef.current = true;
      trackedHashRef.current = weapon.hash;
      return;
    }
    if (trackedHashRef.current === weapon.hash) return;
    trackedHashRef.current = weapon.hash;
    trackWeaponView(weapon.hash, viewSource);
  }, [skipInitialViewTrack, viewSource, weapon.hash]);

  return (
    <WeaponDetailView
      weapon={weapon}
      linkPerks={linkPerks}
      dps={dps}
      highlightedBuildPerks={highlightedBuildPerks}
      versionSelector={versionSelector}
    />
  );
}

/** Standalone `/weapon/[hash]` route view: uses SSR seed when available, else shared index. */
export function WeaponDetail({ hash, initialWeapon }: { hash: number; initialWeapon?: WeaponDoc }) {
  const router = useRouter();
  const [activeHash, setActiveHash] = useState(hash);
  const [isNavigatingToWeapon, startWeaponNavigation] = useTransition();
  const { weapon, loading } = useWeaponDetail(
    activeHash,
    activeHash === hash ? initialWeapon : undefined,
  );
  const { dpsByName } = useWeaponDps();

  useEffect(() => {
    setActiveHash(hash);
  }, [hash]);

  const handleSelectVersion = useCallback(
    (nextHash: number) => {
      setActiveHash(nextHash);
      // Version swap: replace URL so back button skips intermediate versions.
      router.replace(`/weapon/${nextHash}`, { scroll: false });
    },
    [router],
  );

  const handleSearchSelectWeapon = useCallback(
    (nextHash: number, source: WeaponSearchSelectionSource) => {
      trackWeaponView(nextHash, source);
      setActiveHash(nextHash);
      // Search navigation: push so back returns to previous weapon.
      startWeaponNavigation(() => {
        router.push(`/weapon/${nextHash}`, { scroll: false });
      });
    },
    [router, startWeaponNavigation],
  );

  if (!weapon && loading) {
    return (
      <WeaponDetailPageShell onSelectWeapon={handleSearchSelectWeapon}>
        <div className="p-6 text-muted-foreground">Loading…</div>
      </WeaponDetailPageShell>
    );
  }

  if (!weapon) {
    return (
      <WeaponDetailPageShell onSelectWeapon={handleSearchSelectWeapon}>
        <div className="space-y-2 p-6">
          <p>Weapon not found.</p>
        </div>
      </WeaponDetailPageShell>
    );
  }

  return (
    <WeaponDetailPageShell onSelectWeapon={handleSearchSelectWeapon}>
      <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        {isNavigatingToWeapon || loading ? (
          <p role="status" className="text-xs text-muted-foreground">
            Opening weapon...
          </p>
        ) : null}
        <WeaponDetailWithVersions
          weapon={weapon}
          linkPerks={false}
          dps={dpsByName.get(weapon.name)}
          highlightedBuildPerks={dpsByName.get(weapon.name)?.buildPerks}
          viewSource="direct"
          onSelectVersion={handleSelectVersion}
        />
      </main>
    </WeaponDetailPageShell>
  );
}
