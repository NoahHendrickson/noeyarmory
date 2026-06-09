import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

import { buildArmorIndex } from "./build-armor-index";
import { buildAmmoTypeCatalog, buildWeaponIndex } from "./build-index";
import { writeGeneratedDataFile, writeGeneratedDataManifest } from "./generated-data-files";
import { stripPerksLowerReplacer } from "./intern-weapons";
import { downloadDestinyIconDefinitions, downloadManifest } from "./manifest";
import { serializeWeaponFuseIndex } from "./search";
import { writeSampleIndexes } from "./write-sample-indexes";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
loadEnv({ path: resolve(repoRoot, ".env") });

const dataDir = resolve(repoRoot, "apps/web/public/data");
const weaponsFile = resolve(dataDir, "weapons.json");
const weaponsDetailFile = resolve(dataDir, "weapons-detail.json");
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
  const { index, detailIndex } = buildWeaponIndex(defs, version, ammoTypes);
  // Ship a prebuilt fuse.js index so the browser skips the cold-load tokenization pass.
  index.fuseIndex = serializeWeaponFuseIndex(index.weapons);
  // Drop `perksLower` from the on-disk index — it's a lowercased duplicate of
  // `perks`, re-derived at load by normalizeWeaponIndex. Saves payload + parse time.
  const weaponsContents = JSON.stringify(index, stripPerksLowerReplacer);
  const detailContents = JSON.stringify(detailIndex);
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
  console.log(`✓ Wrote ${index.weapons.length} weapons → ${weaponsFile}`);
  console.log(`✓ Wrote ${Object.keys(detailIndex.details).length} weapon details → ${weaponsDetailFile}`);

  console.log("Flattening armor…");
  const armorIndex = buildArmorIndex(defs, version);
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
  writeSampleIndexes(weaponsFile, weaponsDetailFile, armorFile);
}

async function main(): Promise<void> {
  const apiKey = process.env.BUNGIE_API_KEY;
  if (!apiKey) {
    console.warn(
      "Missing BUNGIE_API_KEY — writing bundled sample indexes. " +
        "Set BUNGIE_API_KEY (Vercel: scope to Build) for the full weapon + armor catalog.",
    );
    writeSampleIndexes(weaponsFile, weaponsDetailFile, armorFile);
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
