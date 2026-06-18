import type { InternedPerkColumn, PerkColumn, PerkRef, WeaponDoc, WeaponSummary } from "./types";

type WeaponVersionCandidate = Pick<
  WeaponSummary,
  "hash" | "name" | "craftable" | "seasonNumber" | "releaseIndex" | "superseded"
>;

type WeaponWithColumns = {
  columns: readonly (InternedPerkColumn | PerkColumn)[];
};

/**
 * Bungie reprised craftable raid weapons (Monument of Triumph / 9.7+) as new item
 * hashes with updated plug sets. Legacy hashes remain for older vault copies but
 * should not be the catalog default when a modern craftable twin exists.
 */
export function reconcileCraftableTwins(weapons: WeaponDoc[]): WeaponDoc[] {
  const byName = new Map<string, WeaponDoc[]>();
  for (const weapon of weapons) {
    const list = byName.get(weapon.name);
    if (list) list.push(weapon);
    else byName.set(weapon.name, [weapon]);
  }

  const superseded = new Set<number>();

  for (const group of byName.values()) {
    if (group.length < 2) continue;

    const modern = [...group]
      .filter((weapon) => weapon.craftable)
      .sort((a, b) => b.releaseIndex - a.releaseIndex)[0];
    if (!modern) continue;

    const legacy = group.filter(
      (weapon) => !weapon.craftable && weapon.releaseIndex < modern.releaseIndex,
    );
    if (legacy.length === 0) continue;

    const donor = legacy.find((weapon) => weapon.source) ?? legacy[0]!;
    if (!modern.source && donor.source) modern.source = donor.source;

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

/** Composite recency key for picking the display version of a same-name weapon group. */
export function weaponVersionSortKey(weapon: WeaponVersionCandidate): number {
  return (weapon.seasonNumber ?? 0) * 1_000_000 + weapon.releaseIndex;
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
