import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ArmorCatalogBaseline, ArmorCatalogDiffSource, ArmorIndex } from "./types";

const here = dirname(fileURLToPath(import.meta.url));
export const COMMITTED_ARMOR_BASELINE_PATH = resolve(here, "../baselines/armor-catalog-baseline.json");

export function readCommittedArmorBaseline(): ArmorCatalogBaseline | undefined {
  if (!existsSync(COMMITTED_ARMOR_BASELINE_PATH)) return undefined;

  try {
    return JSON.parse(readFileSync(COMMITTED_ARMOR_BASELINE_PATH, "utf8")) as ArmorCatalogBaseline;
  } catch {
    return undefined;
  }
}

export function readArmorCatalogDiffSource(armorFile: string): ArmorCatalogDiffSource | undefined {
  try {
    return JSON.parse(readFileSync(armorFile, "utf8")) as ArmorIndex;
  } catch {
    return readCommittedArmorBaseline();
  }
}
