import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

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

const outFile = resolve(repoRoot, "apps/web/public/data/weapons.json");

async function main(): Promise<void> {
  console.log("Downloading Destiny manifest (this can take a moment)…");
  const { version, defs } = await downloadManifest(apiKey!);
  console.log(`Manifest ${version}. Flattening weapons…`);
  const index = buildWeaponIndex(defs, version);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(index));
  console.log(`✓ Wrote ${index.weapons.length} weapons → ${outFile}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
