import { buildPerkMapFromCatalog, normalizeWeaponIndex, summariesForPerkName } from "./intern-weapons";
import type { DamageTypeRef, PerkRef, WeaponIndex, WeaponSummary, WeaponTypeRef } from "./types";

/** Precomputed lookups over a weapon index for O(1) hash/perk resolution. */
export interface WeaponIndexLookups {
  weapons: WeaponSummary[];
  perks: PerkRef[];
  damageTypes: DamageTypeRef[];
  weaponTypes: WeaponTypeRef[];
  byHash: Map<number, WeaponSummary>;
  perkMap: Map<number, PerkRef>;
  /** Lowercase perk name → weapons that can roll it. */
  weaponsByPerkName: Map<string, WeaponSummary[]>;
  weaponsByPerkNameRecord: Record<string, number[]>;
  version?: string;
  generatedAt?: string;
}

/** Build hash/perk maps from a parsed weapon index. */
export function buildWeaponIndexLookups(raw: WeaponIndex): WeaponIndexLookups {
  const index = normalizeWeaponIndex(raw);
  const byHash = new Map(index.weapons.map((w) => [w.hash, w]));
  const weaponsByPerkName = new Map<string, WeaponSummary[]>();
  for (const [name, hashes] of Object.entries(index.weaponsByPerkName)) {
    weaponsByPerkName.set(
      name,
      hashes
        .map((hash) => byHash.get(hash))
        .filter((weapon): weapon is WeaponSummary => weapon != null),
    );
  }

  return {
    weapons: index.weapons,
    perks: index.perks,
    damageTypes: index.damageTypes ?? [],
    weaponTypes: index.weaponTypes ?? [],
    byHash,
    perkMap: buildPerkMapFromCatalog(index.perks),
    weaponsByPerkName,
    weaponsByPerkNameRecord: index.weaponsByPerkName,
    version: index.version,
    generatedAt: index.generatedAt,
  };
}

export { summariesForPerkName };
