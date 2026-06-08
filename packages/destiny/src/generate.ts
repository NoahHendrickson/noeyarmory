import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

import { buildArmorIndex } from "./build-armor-index";
import { buildAmmoTypeCatalog, buildWeaponIndex } from "./build-index";
import { stripPerksLowerReplacer } from "./intern-weapons";
import { downloadDestinyIconDefinitions, downloadManifest } from "./manifest";
import { writeSampleIndexes } from "./write-sample-indexes";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
loadEnv({ path: resolve(repoRoot, ".env") });

const weaponsFile = resolve(repoRoot, "apps/web/public/data/weapons.json");
const weaponsDetailFile = resolve(repoRoot, "apps/web/public/data/weapons-detail.json");
const armorFile = resolve(repoRoot, "apps/web/public/data/armor.json");

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
  console.log("Downloading Destiny manifest (this can take a moment)…");
  const { version, defs } = await downloadManifest(apiKey);
  console.log(`Manifest ${version}. Loading ammo-type icons…`);
  const iconDefs = await downloadDestinyIconDefinitions(apiKey);
  const ammoTypes = buildAmmoTypeCatalog(iconDefs);
  console.log("Flattening weapons…");
  const { index, detailIndex } = buildWeaponIndex(defs, version, ammoTypes);
  mkdirSync(dirname(weaponsFile), { recursive: true });
  // Drop `perksLower` from the on-disk index — it's a lowercased duplicate of
  // `perks`, re-derived at load by normalizeWeaponIndex. Saves payload + parse time.
  writeFileSync(weaponsFile, JSON.stringify(index, stripPerksLowerReplacer));
  writeFileSync(weaponsDetailFile, JSON.stringify(detailIndex));
  console.log(`✓ Wrote ${index.weapons.length} weapons → ${weaponsFile}`);
  console.log(`✓ Wrote ${Object.keys(detailIndex.details).length} weapon details → ${weaponsDetailFile}`);

  console.log("Flattening armor…");
  const armorIndex = buildArmorIndex(defs, version);
  writeFileSync(armorFile, JSON.stringify(armorIndex));
  console.log(`✓ Wrote ${armorIndex.armor.length} armor → ${armorFile}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
