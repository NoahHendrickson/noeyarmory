import "server-only";

import { readFileSync } from "node:fs";

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

import { generatedDataFilePath } from "./generated-data-server";

let cache: WeaponIndexLookups | null = null;
let cacheKey: string | undefined;
let detailCache: Map<number, WeaponDetailFields> | null = null;
let detailCacheVersion: string | undefined;

function loadWeaponDetails(): Map<number, WeaponDetailFields> {
  try {
    const file = generatedDataFilePath("weaponDetails");
    const index = JSON.parse(readFileSync(file, "utf8")) as WeaponDetailIndex;
    if (detailCache && detailCacheVersion === index.version) {
      return detailCache;
    }
    detailCache = new Map(
      Object.entries(index.details).map(([hash, detail]) => [Number(hash), detail]),
    );
    detailCacheVersion = index.version;
  } catch {
    detailCache = new Map();
    detailCacheVersion = undefined;
  }
  return detailCache;
}

/** Load and cache the generated weapon browse index (server-only). */
export function getWeaponIndex(): WeaponIndexLookups {
  const file = generatedDataFilePath("weapons");
  const index = JSON.parse(readFileSync(file, "utf8")) as WeaponIndex;
  const key = `${index.version}:${index.generatedAt}`;
  if (cache && cacheKey === key) {
    return cache;
  }
  cache = buildWeaponIndexLookups(index);
  cacheKey = key;
  detailCache = null;
  detailCacheVersion = undefined;
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
