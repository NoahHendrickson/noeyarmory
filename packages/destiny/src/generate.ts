import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

import { buildArmorIndex } from "./build-armor-index";
import { buildWeaponIndex } from "./build-index";
import { downloadManifest } from "./manifest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
loadEnv({ path: resolve(repoRoot, ".env") });

const apiKey = process.env.BUNGIE_API_KEY;
if (!apiKey) {
  console.error(
    "Missing BUNGIE_API_KEY. Copy .env.example to .env and add your Bungie API key.",
  );
  process.exit(1);
}

const weaponsFile = resolve(repoRoot, "apps/web/public/data/weapons.json");
const armorFile = resolve(repoRoot, "apps/web/public/data/armor.json");

async function main(): Promise<void> {
  console.log("Downloading Destiny manifest (this can take a moment)…");
  const { version, defs } = await downloadManifest(apiKey!);
  console.log(`Manifest ${version}. Flattening weapons…`);
  const weaponIndex = buildWeaponIndex(defs, version);
  mkdirSync(dirname(weaponsFile), { recursive: true });
  writeFileSync(weaponsFile, JSON.stringify(weaponIndex));
  console.log(`✓ Wrote ${weaponIndex.weapons.length} weapons → ${weaponsFile}`);

  console.log("Flattening armor…");
  const armorIndex = buildArmorIndex(defs, version);
  writeFileSync(armorFile, JSON.stringify(armorIndex));
  console.log(`✓ Wrote ${armorIndex.armor.length} armor → ${armorFile}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
