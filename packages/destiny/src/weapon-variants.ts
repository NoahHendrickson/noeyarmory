import type { WeaponDoc } from "./types";

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
