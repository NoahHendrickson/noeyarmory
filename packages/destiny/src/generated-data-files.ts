import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  GENERATED_DATA_MANIFEST_FILENAME,
  type GeneratedDataManifest,
  type GeneratedDataManifestFile,
} from "./generated-data-manifest";

interface WriteGeneratedDataFileOptions {
  dataDir: string;
  basename: string;
  contents: string;
}

function contentHash(contents: string): string {
  return createHash("sha256").update(contents).digest("hex").slice(0, 16);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pruneHashedSiblings(dataDir: string, basename: string, keepFilename: string): void {
  const hashedSiblingPattern = new RegExp(`^${escapeRegExp(basename)}\\.[0-9a-f]{16}\\.json$`);

  for (const filename of readdirSync(dataDir)) {
    if (filename !== keepFilename && hashedSiblingPattern.test(filename)) {
      unlinkSync(join(dataDir, filename));
    }
  }
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
  pruneHashedSiblings(dataDir, basename, hashedFilename);

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
