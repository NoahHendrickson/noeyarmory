import type { InternedPerkColumn, PerkColumn, PerkRef, WeaponDoc, WeaponSummary } from "./types";
import { sourceFields, sourceLabels } from "./weapon-provenance";

type WeaponVersionCandidate = Pick<
  WeaponSummary,
  "hash" | "name" | "craftable" | "seasonNumber" | "releaseIndex" | "superseded"
>;

type WeaponWithColumns = {
  columns: readonly (InternedPerkColumn | PerkColumn)[];
};

function groupWeaponsByName(weapons: WeaponDoc[]): Map<string, WeaponDoc[]> {
  const byName = new Map<string, WeaponDoc[]>();
  for (const weapon of weapons) {
    const list = byName.get(weapon.name);
    if (list) list.push(weapon);
    else byName.set(weapon.name, [weapon]);
  }
  return byName;
}

function copySourceFromLegacy(primary: WeaponDoc, legacy: readonly WeaponDoc[]): void {
  const donor = legacy.find((weapon) => weapon.source) ?? legacy[0];
  const source = primary.source ?? donor?.source;
  if (!source) return;
  const sources = [
    ...sourceLabels(primary),
    ...legacy.flatMap((weapon) => sourceLabels(weapon)),
  ];
  Object.assign(primary, sourceFields(source, sources));
}

/**
 * Mark older same-name manifest defs superseded so browse/search surfaces show the
 * current perk pool. Handles craftable raid reprisals and non-craftable reissues
 * (e.g. Pantheon Threat Level). Legacy hashes remain for direct URL / vault lookup.
 */
export function reconcileCraftableTwins(weapons: WeaponDoc[]): WeaponDoc[] {
  const byName = groupWeaponsByName(weapons);
  const superseded = new Set<number>();

  for (const group of byName.values()) {
    if (group.length < 2) continue;

    const modern = [...group]
      .filter((weapon) => weapon.craftable)
      .sort((a, b) => b.releaseIndex - a.releaseIndex)[0];
    if (modern) {
      const legacy = group.filter(
        (weapon) => !weapon.craftable && weapon.releaseIndex < modern.releaseIndex,
      );
      if (legacy.length > 0) {
        copySourceFromLegacy(modern, legacy);
        for (const old of legacy) superseded.add(old.hash);
      }
      continue;
    }

    const sorted = [...group].sort((a, b) => b.releaseIndex - a.releaseIndex);
    const primary = sorted[0]!;
    const legacy = sorted.slice(1);
    copySourceFromLegacy(primary, legacy);
    for (const old of legacy) superseded.add(old.hash);
  }

  return weapons.map((weapon) =>
    superseded.has(weapon.hash) ? { ...weapon, superseded: true } : weapon,
  );
}

/** Browse/search surfaces should ignore manifest legacy duplicates. */
export function isCatalogWeapon(weapon: { superseded?: boolean }): boolean {
  return weapon.superseded !== true;
}

/**
 * Recency key for picking the display version of a same-name weapon group.
 * Manifest `item.index` (`releaseIndex`) is authoritative for reprised duplicates;
 * `seasonNumber` only breaks ties because reprisals often lack season metadata.
 */
export function weaponVersionSortKey(weapon: WeaponVersionCandidate): number {
  return weapon.releaseIndex * 1_000 + (weapon.seasonNumber ?? 0);
}

/** Same-name weapon versions, newest catalog entry first. */
export function sortWeaponVersions<T extends WeaponVersionCandidate>(weapons: readonly T[]): T[] {
  return weapons
    .filter(isCatalogWeapon)
    .sort(
      (a, b) =>
        weaponVersionSortKey(b) - weaponVersionSortKey(a) ||
        Number(b.craftable) - Number(a.craftable) ||
        b.hash - a.hash,
    );
}

/** Latest catalog version for a same-name weapon group. */
export function primaryWeaponVersion<T extends WeaponVersionCandidate>(
  weapons: readonly T[],
): T | undefined {
  return sortWeaponVersions(weapons)[0];
}

/** Primary catalog version for a stored/raw weapon hash. */
export function primaryCatalogWeaponForHash<T extends WeaponVersionCandidate>(
  hash: number,
  byHash: ReadonlyMap<number, T>,
  byName?: ReadonlyMap<string, readonly T[]>,
): T | undefined {
  const weapon = byHash.get(hash);
  if (!weapon) return undefined;

  const versions = byName?.get(weapon.name) ?? [weapon];
  return primaryWeaponVersion(versions);
}

/**
 * Collapse a ranked list to one visible row per exact weapon name.
 *
 * `byName` lets filtered searches display the newest catalog version even when
 * the variant that matched the filter is an older hash.
 */
export function collapseWeaponVersions<T extends WeaponVersionCandidate>(
  weapons: readonly T[],
  byName?: ReadonlyMap<string, readonly T[]>,
): T[] {
  const seenNames = new Set<string>();
  const collapsed: T[] = [];

  for (const weapon of weapons) {
    if (!isCatalogWeapon(weapon) || seenNames.has(weapon.name)) continue;
    seenNames.add(weapon.name);

    const versions =
      byName?.get(weapon.name) ?? weapons.filter((candidate) => candidate.name === weapon.name);
    const primary = primaryWeaponVersion(versions);
    if (primary) collapsed.push(primary);
  }

  return collapsed;
}

function resolvedColumn(column: InternedPerkColumn | PerkColumn): column is PerkColumn {
  return "perks" in column;
}

function addUniqueName(target: string[], seen: Set<string>, name: string): void {
  const key = name.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  target.push(name);
}

/** Origin Trait options for one weapon, supporting both full and interned columns. */
export function originTraitNamesForWeapon(
  weapon: WeaponWithColumns,
  perks: readonly PerkRef[] = [],
): string[] {
  const origin = weapon.columns.find((column) => column.kind === "Origin Trait");
  if (!origin) return [];

  const names: string[] = [];
  const seen = new Set<string>();

  if (resolvedColumn(origin)) {
    for (const perk of origin.perks) addUniqueName(names, seen, perk.name);
    return names;
  }

  for (const index of origin.perkIndices) {
    const perk = perks[index];
    if (perk) addUniqueName(names, seen, perk.name);
  }
  return names;
}

/** Distinct Origin Trait options across catalog-visible versions, preserving input order. */
export function originTraitNamesForWeapons<T extends WeaponWithColumns & { superseded?: boolean }>(
  weapons: readonly T[],
  perks: readonly PerkRef[] = [],
): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const weapon of weapons) {
    if (!isCatalogWeapon(weapon)) continue;
    for (const name of originTraitNamesForWeapon(weapon, perks)) {
      addUniqueName(names, seen, name);
    }
  }

  return names;
}
