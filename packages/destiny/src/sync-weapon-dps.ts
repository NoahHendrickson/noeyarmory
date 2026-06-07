import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { sampleWeapons } from "./fixtures/sample-weapons";
import { internWeaponCatalog } from "./intern-weapons";
import type { WeaponIndex } from "./types";
import {
  buildWeaponDpsIndex,
  type WeaponDpsCatalogEntry,
  WEAPON_DPS_SHEET_CSV_URL,
} from "./weapon-dps";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const weaponsFile = resolve(repoRoot, "apps/web/public/data/weapons.json");
const outputFile = resolve(repoRoot, "apps/web/public/weapon-dps.json");

function traitPerkNames(
  columns: { kind: string; perkIndices: number[] }[],
  perks: { name: string }[],
): string[] {
  return [
    ...new Set(
      columns
        .filter((column) => column.kind === "Trait")
        .flatMap((column) =>
          column.perkIndices
            .map((index) => perks[index]?.name)
            .filter((name): name is string => name != null),
        ),
    ),
  ];
}

function dpsCatalog(): WeaponDpsCatalogEntry[] {
  if (existsSync(weaponsFile)) {
    const index = JSON.parse(readFileSync(weaponsFile, "utf8")) as WeaponIndex;
    return index.weapons.map((weapon) => ({
      name: weapon.name,
      traitPerkNames: traitPerkNames(weapon.columns, index.perks),
    }));
  }

  const { index } = internWeaponCatalog(sampleWeapons, "sample");
  return index.weapons.map((weapon) => ({
    name: weapon.name,
    traitPerkNames: traitPerkNames(weapon.columns, index.perks),
  }));
}

async function main(): Promise<void> {
  const res = await fetch(WEAPON_DPS_SHEET_CSV_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch DPS sheet: HTTP ${res.status}`);
  }

  const csvText = await res.text();
  const index = buildWeaponDpsIndex(csvText, dpsCatalog());
  const count = Object.keys(index.byName).length;

  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  console.log(`Wrote ${count} weapon DPS entries to ${outputFile}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
