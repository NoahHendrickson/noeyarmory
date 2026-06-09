import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DEFAULT_GENERATED_DATA_PATHS,
  GENERATED_DATA_MANIFEST_PATH,
  generatedDataPath,
  type GeneratedDataKey,
  type GeneratedDataManifest,
} from "./generated-data";

let manifestCache: GeneratedDataManifest | null | undefined;

function publicPathToFilePath(publicPath: string): string {
  return join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

function loadGeneratedDataManifest(): GeneratedDataManifest | null {
  if (manifestCache !== undefined) return manifestCache;

  try {
    manifestCache = JSON.parse(
      readFileSync(publicPathToFilePath(GENERATED_DATA_MANIFEST_PATH), "utf8"),
    ) as GeneratedDataManifest;
  } catch {
    manifestCache = null;
  }

  return manifestCache;
}

export function generatedDataFilePath(key: GeneratedDataKey): string {
  const path = generatedDataPath(loadGeneratedDataManifest(), key);
  const file = publicPathToFilePath(path);
  if (existsSync(file)) return file;

  return publicPathToFilePath(DEFAULT_GENERATED_DATA_PATHS[key]);
}
