import { dirname } from "node:path";

import { sampleArmor } from "./fixtures/sample-armor";
import { sampleAmmoTypes } from "./fixtures/sample-ammo-types";
import { sampleDamageTypes } from "./fixtures/sample-damage-types";
import { sampleWeaponTypes } from "./fixtures/sample-weapon-types";
import { sampleWeapons } from "./fixtures/sample-weapons";
import { writeGeneratedDataFile, writeGeneratedDataManifest } from "./generated-data-files";
import { internWeaponCatalog, stripPerksLowerReplacer } from "./intern-weapons";
import { buildNewArmorIndex } from "./new-armor";
import { buildNewWeaponIndex } from "./new-weapons";
import type { ArmorIndex, WeaponIndex } from "./types";
import { sampleStatGroup } from "./weapon-stats";

export function buildSampleWeaponIndex(): WeaponIndex {
  const { index } = internWeaponCatalog(sampleWeapons, "sample");
  return {
    ...index,
    damageTypes: sampleDamageTypes,
    weaponTypes: sampleWeaponTypes,
    ammoTypes: sampleAmmoTypes,
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

/** Write bundled sample indexes when the live manifest cannot be fetched (e.g. missing API key or Bungie outage). */
export function writeSampleIndexes(
  weaponsFile: string,
  weaponsDetailFile: string,
  armorFile: string,
  newWeaponsFile: string,
  newArmorFile: string,
): void {
  const { index, detailIndex } = internWeaponCatalog(sampleWeapons, "sample");
  const weaponIndex: WeaponIndex = {
    ...index,
    damageTypes: sampleDamageTypes,
    weaponTypes: sampleWeaponTypes,
    ammoTypes: sampleAmmoTypes,
  };
  const detailWithStatGroups = {
    ...detailIndex,
    statGroups: { [String(sampleStatGroup.hash)]: sampleStatGroup },
  };
  const armorIndex = buildSampleArmorIndex();
  const dataDir = dirname(weaponsFile);

  // Match production shape (generate.ts) — strip the re-derivable `perksLower`.
  const weaponsManifestFile = writeGeneratedDataFile({
    dataDir,
    basename: "weapons",
    contents: JSON.stringify(weaponIndex, stripPerksLowerReplacer),
  });
  const detailsManifestFile = writeGeneratedDataFile({
    dataDir,
    basename: "weapons-detail",
    contents: JSON.stringify(detailWithStatGroups),
  });
  const newWeaponIndex = buildNewWeaponIndex(weaponIndex);
  const newWeaponsManifestFile = writeGeneratedDataFile({
    dataDir,
    basename: "new-weapons",
    contents: JSON.stringify(newWeaponIndex),
  });
  const armorManifestFile = writeGeneratedDataFile({
    dataDir,
    basename: "armor",
    contents: JSON.stringify(armorIndex),
  });
  const newArmorIndex = buildNewArmorIndex(armorIndex);
  const newArmorManifestFile = writeGeneratedDataFile({
    dataDir,
    basename: "new-armor",
    contents: JSON.stringify(newArmorIndex),
  });
  writeGeneratedDataManifest(dataDir, {
    version: weaponIndex.version,
    generatedAt: weaponIndex.generatedAt,
    files: {
      weapons: weaponsManifestFile,
      weaponDetails: detailsManifestFile,
      newWeapons: newWeaponsManifestFile,
      armor: armorManifestFile,
      newArmor: newArmorManifestFile,
    },
  });

  console.log(`✓ Wrote ${weaponIndex.weapons.length} sample weapons → ${weaponsFile}`);
  console.log(`✓ Wrote ${Object.keys(detailIndex.details).length} sample weapon details → ${weaponsDetailFile}`);
  console.log(`✓ Wrote ${newWeaponIndex.weapons.length} sample new weapons → ${newWeaponsFile}`);
  console.log(`✓ Wrote ${armorIndex.armor.length} sample armor → ${armorFile}`);
  console.log(`✓ Wrote ${newArmorIndex.armor.length} sample new armor → ${newArmorFile}`);
}
