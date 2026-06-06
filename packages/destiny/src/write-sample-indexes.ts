import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { sampleArmor } from "./fixtures/sample-armor";
import { sampleDamageTypes } from "./fixtures/sample-damage-types";
import { sampleWeapons } from "./fixtures/sample-weapons";
import { internWeaponCatalog } from "./intern-weapons";
import type { ArmorIndex, WeaponIndex } from "./types";

export function buildSampleWeaponIndex(): WeaponIndex {
  const { index } = internWeaponCatalog(sampleWeapons, "sample");
  return { ...index, damageTypes: sampleDamageTypes };
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
export function writeSampleIndexes(
  weaponsFile: string,
  weaponsDetailFile: string,
  armorFile: string,
): void {
  const { index, detailIndex } = internWeaponCatalog(sampleWeapons, "sample");
  const weaponIndex: WeaponIndex = { ...index, damageTypes: sampleDamageTypes };
  const armorIndex = buildSampleArmorIndex();

  mkdirSync(dirname(weaponsFile), { recursive: true });
  writeFileSync(weaponsFile, JSON.stringify(weaponIndex));
  writeFileSync(weaponsDetailFile, JSON.stringify(detailIndex));
  writeFileSync(armorFile, JSON.stringify(armorIndex));

  console.log(`✓ Wrote ${weaponIndex.weapons.length} sample weapons → ${weaponsFile}`);
  console.log(`✓ Wrote ${Object.keys(detailIndex.details).length} sample weapon details → ${weaponsDetailFile}`);
  console.log(`✓ Wrote ${armorIndex.armor.length} sample armor → ${armorFile}`);
}
