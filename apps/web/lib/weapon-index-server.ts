import "server-only";

import { readFileSync, statSync } from "node:fs";

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

/**
 * Cheap freshness key for a generated data file — its mtime. Lets us detect a
 * regenerated index without parsing the (large) JSON on every call; we only read
 * and parse when the file has actually changed on disk.
 */
function fileVersionTag(file: string): string {
  try {
    return String(statSync(file).mtimeMs);
  } catch {
    return "missing";
  }
}

function loadWeaponDetails(): Map<number, WeaponDetailFields> {
  const file = generatedDataFilePath("weaponDetails");
  const tag = fileVersionTag(file);
  if (detailCache && detailCacheVersion === tag) {
    return detailCache;
  }
  try {
    const index = JSON.parse(readFileSync(file, "utf8")) as WeaponDetailIndex;
    detailCache = new Map(
      Object.entries(index.details).map(([hash, detail]) => [Number(hash), detail]),
    );
  } catch {
    detailCache = new Map();
  }
  detailCacheVersion = tag;
  return detailCache;
}

/** Load and cache the generated weapon browse index (server-only). */
export function getWeaponIndex(): WeaponIndexLookups {
  const file = generatedDataFilePath("weapons");
  const key = fileVersionTag(file);
  if (cache && cacheKey === key) {
    return cache;
  }
  const index = JSON.parse(readFileSync(file, "utf8")) as WeaponIndex;
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
  const { perkMap, weaponsByPerkName, weaponsByPerkHash, weaponsByPerkNameRecord, byHash } =
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
    matches: weaponsByPerkHash.get(hash) ?? [],
  };
}
