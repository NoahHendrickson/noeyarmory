import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildWeaponIndexLookups,
  expandWeapon,
  type WeaponDetailFields,
  type WeaponDetailIndex,
  type WeaponDoc,
  type WeaponIndex,
  type WeaponIndexLookups,
  type WeaponSummary,
} from "@repo/destiny";

let cache: WeaponIndexLookups | null = null;
let detailCache: Map<number, WeaponDetailFields> | null = null;

function loadWeaponDetails(): Map<number, WeaponDetailFields> {
  if (detailCache) return detailCache;
  try {
    const file = join(process.cwd(), "public", "data", "weapons-detail.json");
    const index = JSON.parse(readFileSync(file, "utf8")) as WeaponDetailIndex;
    detailCache = new Map(
      Object.entries(index.details).map(([hash, detail]) => [Number(hash), detail]),
    );
  } catch {
    detailCache = new Map();
  }
  return detailCache;
}

/** Load and cache the generated weapon browse index (server-only). */
export function getWeaponIndex(): WeaponIndexLookups {
  if (cache) return cache;
  const file = join(process.cwd(), "public", "data", "weapons.json");
  const index = JSON.parse(readFileSync(file, "utf8")) as WeaponIndex;
  cache = buildWeaponIndexLookups(index);
  return cache;
}

export function getWeaponSummary(hash: number): WeaponSummary | undefined {
  return getWeaponIndex().byHash.get(hash);
}

/** Resolve a submitted perk name to its canonical lowercase index key, if known. */
export function getCanonicalPerkName(name: string): string | undefined {
  const key = name.trim().toLowerCase();
  if (!key) return undefined;
  return key in getWeaponIndex().weaponsByPerkNameRecord ? key : undefined;
}

/** Full weapon doc — merges browse summary with detail fields. */
export function getWeaponDoc(hash: number): WeaponDoc | undefined {
  const { byHash, perks } = getWeaponIndex();
  const summary = byHash.get(hash);
  if (!summary) return undefined;
  return expandWeapon(summary, loadWeaponDetails().get(hash), perks);
}

/** Resolve a perk hash to its display name and every weapon that can roll it. */
export function getWeaponsForPerkHash(hash: number): {
  perkName: string | undefined;
  matches: WeaponSummary[];
} {
  const { perkMap, weaponsByPerkName, weapons, weaponsByPerkNameRecord, byHash } =
    getWeaponIndex();
  const perk = perkMap.get(hash);
  if (perk) {
    const key = perk.name.toLowerCase();
    const fromRecord = weaponsByPerkNameRecord[key]
      ?.map((weaponHash) => byHash.get(weaponHash))
      .filter((weapon): weapon is WeaponSummary => weapon != null);
    return {
      perkName: perk.name,
      matches: fromRecord ?? weaponsByPerkName.get(key) ?? [],
    };
  }
  return {
    perkName: undefined,
    matches: weapons.filter((w) => w.perkHashes.includes(hash)),
  };
}
