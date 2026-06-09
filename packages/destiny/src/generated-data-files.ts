import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface GeneratedDataManifestFile {
  path: string;
  stablePath: string;
  hash: string;
  bytes: number;
}

export interface GeneratedDataManifest {
  version: string;
  generatedAt: string;
  files: {
    weapons: GeneratedDataManifestFile;
    weaponDetails: GeneratedDataManifestFile;
    armor: GeneratedDataManifestFile;
  };
}

export const GENERATED_DATA_MANIFEST_FILENAME = "generated-data.manifest.json";

interface WriteGeneratedDataFileOptions {
  dataDir: string;
  basename: string;
  contents: string;
}

function contentHash(contents: string): string {
  return createHash("sha256").update(contents).digest("hex").slice(0, 16);
}

export function writeGeneratedDataFile({
  dataDir,
  basename,
  contents,
}: WriteGeneratedDataFileOptions): GeneratedDataManifestFile {
  mkdirSync(dataDir, { recursive: true });

  const hash = contentHash(contents);
  const stableFilename = `${basename}.json`;
  const hashedFilename = `${basename}.${hash}.json`;

  writeFileSync(join(dataDir, stableFilename), contents);
  writeFileSync(join(dataDir, hashedFilename), contents);

  return {
    path: `/data/${hashedFilename}`,
    stablePath: `/data/${stableFilename}`,
    hash,
    bytes: Buffer.byteLength(contents),
  };
}

export function writeGeneratedDataManifest(
  dataDir: string,
  manifest: GeneratedDataManifest,
): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, GENERATED_DATA_MANIFEST_FILENAME), `${JSON.stringify(manifest)}\n`);
}
