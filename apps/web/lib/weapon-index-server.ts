import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildWeaponIndexLookups,
  type WeaponDoc,
  type WeaponIndex,
  type WeaponIndexLookups,
} from "@repo/destiny";

let cache: WeaponIndexLookups | null = null;

/** Load and cache the generated weapon index (server-only). */
export function getWeaponIndex(): WeaponIndexLookups {
  if (cache) return cache;
  const file = join(process.cwd(), "public", "data", "weapons.json");
  const index = JSON.parse(readFileSync(file, "utf8")) as WeaponIndex;
  cache = buildWeaponIndexLookups(index);
  return cache;
}

export function getWeaponByHash(hash: number): WeaponDoc | undefined {
  return getWeaponIndex().byHash.get(hash);
}

/** Resolve a perk hash to its display name and every weapon that can roll it. */
export function getWeaponsForPerkHash(hash: number): {
  perkName: string | undefined;
  matches: WeaponDoc[];
} {
  const { perkMap, weaponsByPerkName, weapons } = getWeaponIndex();
  const perk = perkMap.get(hash);
  if (perk) {
    return {
      perkName: perk.name,
      matches: weaponsByPerkName.get(perk.name.toLowerCase()) ?? [],
    };
  }
  return {
    perkName: undefined,
    matches: weapons.filter((w) => w.perkHashes.includes(hash)),
  };
}
