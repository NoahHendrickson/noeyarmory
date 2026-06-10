import type { NewWeaponIndex, WeaponCatalogDiffSource, WeaponIndex } from "./types";

function weaponHashesFromDiffSource(previous: WeaponCatalogDiffSource): Set<number> {
  if ("weaponHashes" in previous) return new Set(previous.weaponHashes);
  return new Set(previous.weapons.map((item) => item.hash));
}

export function buildNewWeaponIndex(
  current: WeaponIndex,
  previous?: WeaponCatalogDiffSource,
): NewWeaponIndex {
  const base = {
    version: current.version,
    generatedAt: current.generatedAt,
    hasBaseline: previous != null,
    baselineVersion: previous?.version,
    baselineGeneratedAt: previous?.generatedAt,
  };

  if (!previous) {
    return {
      ...base,
      newWeaponHashes: [],
      weapons: [],
    };
  }

  const previousWeaponHashes = weaponHashesFromDiffSource(previous);
  const weapons = current.weapons.filter((item) => !previousWeaponHashes.has(item.hash));

  return {
    ...base,
    newWeaponHashes: weapons.map((item) => item.hash),
    weapons,
  };
}
