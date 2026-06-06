import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { sampleArmor } from "./fixtures/sample-armor";
import { sampleDamageTypes } from "./fixtures/sample-damage-types";
import { sampleWeapons } from "./fixtures/sample-weapons";
import type { ArmorIndex, WeaponIndex } from "./types";

export function buildSampleWeaponIndex(): WeaponIndex {
  return {
    version: "sample",
    generatedAt: new Date().toISOString(),
    weapons: sampleWeapons,
    damageTypes: sampleDamageTypes,
  };
}

export function buildSampleArmorIndex(): ArmorIndex {
  return {
    version: "sample",
    generatedAt: new Date().toISOString(),
    armor: sampleArmor,
    archetypes: [],
    armor30Sets: [],
  };
}

/** Write bundled sample indexes when the live manifest cannot be fetched (e.g. missing API key). */
export function writeSampleIndexes(weaponsFile: string, armorFile: string): void {
  const weaponIndex = buildSampleWeaponIndex();
  const armorIndex = buildSampleArmorIndex();

  mkdirSync(dirname(weaponsFile), { recursive: true });
  writeFileSync(weaponsFile, JSON.stringify(weaponIndex));
  writeFileSync(armorFile, JSON.stringify(armorIndex));

  console.log(`✓ Wrote ${weaponIndex.weapons.length} sample weapons → ${weaponsFile}`);
  console.log(`✓ Wrote ${armorIndex.armor.length} sample armor → ${armorFile}`);
}
