import type Fuse from "fuse.js";

import { buildPerkMapFromCatalog, normalizeWeaponIndex, summariesForPerkName } from "./intern-weapons";
import { createWeaponFuse } from "./search";
import type {
  AmmoTypeRef,
  DamageTypeRef,
  PerkRef,
  WeaponIndex,
  WeaponSummary,
  WeaponTypeRef,
} from "./types";
import { buildWeaponNameIndex, type WeaponNameIndex } from "./weapon-name-index";

/** Precomputed lookups over a weapon index for O(1) hash/perk resolution. */
export interface WeaponIndexLookups {
  weapons: WeaponSummary[];
  perks: PerkRef[];
  damageTypes: DamageTypeRef[];
  weaponTypes: WeaponTypeRef[];
  ammoTypes: AmmoTypeRef[];
  byHash: Map<number, WeaponSummary>;
  perkMap: Map<number, PerkRef>;
  /** Lowercase perk name → weapons that can roll it. */
  weaponsByPerkName: Map<string, WeaponSummary[]>;
  weaponsByPerkNameRecord: Record<string, number[]>;
  /** Prebuilt name lookup for keystroke-rate autocomplete (built once). */
  nameIndex: WeaponNameIndex;
  /** Shared fuzzy index, built once (from the serialized index when present). */
  weaponFuse: Fuse<WeaponSummary>;
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
    ammoTypes: index.ammoTypes ?? [],
    byHash,
    perkMap: buildPerkMapFromCatalog(index.perks),
    weaponsByPerkName,
    weaponsByPerkNameRecord: index.weaponsByPerkName,
    nameIndex: buildWeaponNameIndex(index.weapons),
    weaponFuse: createWeaponFuse(index.weapons, raw.fuseIndex),
    version: index.version,
    generatedAt: index.generatedAt,
  };
}

/** Rebuild hash/perk maps after mutating weapon summaries (e.g. detail enrichment). */
export function refreshWeaponSummaries(
  lookups: WeaponIndexLookups,
  weapons: WeaponSummary[],
): WeaponIndexLookups {
  if (weapons === lookups.weapons) return lookups;

  const byHash = new Map(weapons.map((w) => [w.hash, w]));
  const weaponsByPerkName = new Map<string, WeaponSummary[]>();
  for (const [name, hashes] of Object.entries(lookups.weaponsByPerkNameRecord)) {
    weaponsByPerkName.set(
      name,
      hashes
        .map((hash) => byHash.get(hash))
        .filter((weapon): weapon is WeaponSummary => weapon != null),
    );
  }

  return {
    ...lookups,
    weapons,
    byHash,
    weaponsByPerkName,
    nameIndex: buildWeaponNameIndex(weapons),
    weaponFuse: createWeaponFuse(weapons),
  };
}

export { summariesForPerkName };
