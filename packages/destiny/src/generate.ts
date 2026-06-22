import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

import { buildArmorIndex } from "./build-armor-index";
import { buildAmmoTypeCatalog, buildWeaponIndex } from "./build-index";
import { writeGeneratedDataFile, writeGeneratedDataManifest } from "./generated-data-files";
import { stripPerksLowerReplacer } from "./intern-weapons";
import { downloadDestinyIconDefinitions, downloadManifest } from "./manifest";
import { readArmorCatalogDiffSource } from "./armor-catalog-baseline";
import { buildNewWeaponIndex } from "./new-weapons";
import { readWeaponCatalogDiffSource } from "./weapon-catalog-baseline";
import type { NewWeaponIndex } from "./types";
import { writeSampleIndexes } from "./write-sample-indexes";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
loadEnv({ path: resolve(repoRoot, ".env") });

const dataDir = resolve(repoRoot, "apps/web/public/data");
const weaponsFile = resolve(dataDir, "weapons.json");
const weaponsDetailFile = resolve(dataDir, "weapons-detail.json");
const newWeaponsFile = resolve(dataDir, "new-weapons.json");
const armorFile = resolve(dataDir, "armor.json");

function hasExistingGeneratedIndexes(): boolean {
  return (
    existsSync(weaponsFile) && existsSync(weaponsDetailFile) && existsSync(armorFile)
  );
}

async function generateFromManifest(apiKey: string): Promise<void> {
  console.log("Downloading Destiny manifest (this can take a moment)…");
  const { version, defs } = await downloadManifest(apiKey);
  console.log(`Manifest ${version}. Loading ammo-type icons…`);
  const iconDefs = await downloadDestinyIconDefinitions(apiKey);
  const ammoTypes = buildAmmoTypeCatalog(iconDefs);
  console.log("Flattening weapons…");
  const previousWeaponCatalog = readWeaponCatalogDiffSource(weaponsFile);
  const { index, detailIndex } = buildWeaponIndex(defs, version, ammoTypes);
  const computedNewWeaponIndex = buildNewWeaponIndex(index, previousWeaponCatalog);
  const weaponManifestVersionChanged = previousWeaponCatalog?.version !== index.version;
  if (previousWeaponCatalog && !existsSync(weaponsFile)) {
    console.log(
      `Using committed weapon baseline (${previousWeaponCatalog.version}, ${"weaponHashes" in previousWeaponCatalog ? previousWeaponCatalog.weaponHashes.length : previousWeaponCatalog.weapons.length} hashes)`,
    );
  }
  // Drop `perksLower` from the on-disk index — it's a lowercased duplicate of
  // `perks`, re-derived at load by normalizeWeaponIndex. Saves payload + parse time.
  const weaponsContents = JSON.stringify(index, stripPerksLowerReplacer);
  const detailContents = JSON.stringify(detailIndex);
  const preserveExistingNewWeaponSnapshot =
    computedNewWeaponIndex.weapons.length === 0 &&
    !weaponManifestVersionChanged &&
    existsSync(newWeaponsFile);
  const newWeaponsContents = preserveExistingNewWeaponSnapshot
    ? readFileSync(newWeaponsFile, "utf8")
    : JSON.stringify(computedNewWeaponIndex);
  const newWeaponIndex = (
    preserveExistingNewWeaponSnapshot
      ? JSON.parse(newWeaponsContents)
      : computedNewWeaponIndex
  ) as NewWeaponIndex;
  const weaponsManifestFile = writeGeneratedDataFile({
    dataDir,
    basename: "weapons",
    contents: weaponsContents,
  });
  const detailsManifestFile = writeGeneratedDataFile({
    dataDir,
    basename: "weapons-detail",
    contents: detailContents,
  });
  const newWeaponsManifestFile = writeGeneratedDataFile({
    dataDir,
    basename: "new-weapons",
    contents: newWeaponsContents,
  });
  console.log(`✓ Wrote ${index.weapons.length} weapons → ${weaponsFile}`);
  console.log(`✓ Wrote ${Object.keys(detailIndex.details).length} weapon details → ${weaponsDetailFile}`);
  console.log(`✓ Wrote ${newWeaponIndex.weapons.length} new weapons → ${newWeaponsFile}`);

  console.log("Flattening armor…");
  const previousArmorCatalog = readArmorCatalogDiffSource(armorFile);
  const armorIndex = buildArmorIndex(defs, version);
  if (previousArmorCatalog && !existsSync(armorFile)) {
    console.log(
      `Using committed armor baseline (${previousArmorCatalog.version}, ${"armorHashes" in previousArmorCatalog ? previousArmorCatalog.armorHashes.length : previousArmorCatalog.armor.length} hashes)`,
    );
  }
  const armorManifestFile = writeGeneratedDataFile({
    dataDir,
    basename: "armor",
    contents: JSON.stringify(armorIndex),
  });
  writeGeneratedDataManifest(dataDir, {
    version: index.version,
    generatedAt: index.generatedAt,
    files: {
      weapons: weaponsManifestFile,
      weaponDetails: detailsManifestFile,
      newWeapons: newWeaponsManifestFile,
      armor: armorManifestFile,
    },
  });
  console.log(`✓ Wrote ${armorIndex.armor.length} armor → ${armorFile}`);
}

function fallbackAfterManifestFailure(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  if (hasExistingGeneratedIndexes()) {
    console.warn(
      `Bungie manifest download failed (${message}) — keeping existing generated indexes.`,
    );
    return;
  }

  console.warn(
    `Bungie manifest download failed (${message}) — writing bundled sample indexes.`,
  );
  writeSampleIndexes(weaponsFile, weaponsDetailFile, armorFile, newWeaponsFile);
}

async function main(): Promise<void> {
  const apiKey = process.env.BUNGIE_API_KEY;
  if (!apiKey) {
    console.warn(
      "Missing BUNGIE_API_KEY — writing bundled sample indexes. " +
        "Set BUNGIE_API_KEY (Vercel: scope to Build) for the full weapon + armor catalog.",
    );
    writeSampleIndexes(weaponsFile, weaponsDetailFile, armorFile, newWeaponsFile);
    return;
  }

  try {
    await generateFromManifest(apiKey);
  } catch (err) {
    fallbackAfterManifestFailure(err);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
