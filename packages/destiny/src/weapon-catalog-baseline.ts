import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { WeaponCatalogBaseline, WeaponCatalogDiffSource, WeaponIndex } from "./types";

const here = dirname(fileURLToPath(import.meta.url));
export const COMMITTED_WEAPON_BASELINE_PATH = resolve(here, "../baselines/weapon-catalog-baseline.json");

export function readCommittedWeaponBaseline(): WeaponCatalogBaseline | undefined {
  if (!existsSync(COMMITTED_WEAPON_BASELINE_PATH)) return undefined;

  try {
    return JSON.parse(readFileSync(COMMITTED_WEAPON_BASELINE_PATH, "utf8")) as WeaponCatalogBaseline;
  } catch {
    return undefined;
  }
}

export function readWeaponCatalogDiffSource(weaponsFile: string): WeaponCatalogDiffSource | undefined {
  try {
    return JSON.parse(readFileSync(weaponsFile, "utf8")) as WeaponIndex;
  } catch {
    return readCommittedWeaponBaseline();
  }
}
