import { buildPerkMap, buildWeaponsByPerkName } from "./search";
import type { DamageTypeRef, PerkRef, WeaponDoc, WeaponIndex } from "./types";

/** Precomputed lookups over a weapon index for O(1) hash/perk resolution. */
export interface WeaponIndexLookups {
  weapons: WeaponDoc[];
  damageTypes: DamageTypeRef[];
  byHash: Map<number, WeaponDoc>;
  perkMap: Map<number, PerkRef>;
  /** Lowercase perk name → weapons that can roll it. */
  weaponsByPerkName: Map<string, WeaponDoc[]>;
  version?: string;
  generatedAt?: string;
}

/** Build hash/perk maps from a parsed weapon index. */
export function buildWeaponIndexLookups(index: WeaponIndex): WeaponIndexLookups {
  return {
    weapons: index.weapons,
    damageTypes: index.damageTypes ?? [],
    byHash: new Map(index.weapons.map((w) => [w.hash, w])),
    perkMap: buildPerkMap(index.weapons),
    weaponsByPerkName: buildWeaponsByPerkName(index.weapons),
    version: index.version,
    generatedAt: index.generatedAt,
  };
}
