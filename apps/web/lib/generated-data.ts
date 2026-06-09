export const GENERATED_DATA_MANIFEST_PATH = "/data/generated-data.manifest.json";

export const DEFAULT_GENERATED_DATA_PATHS = {
  weapons: "/data/weapons.json",
  weaponDetails: "/data/weapons-detail.json",
  armor: "/data/armor.json",
} as const;

export type GeneratedDataKey = keyof typeof DEFAULT_GENERATED_DATA_PATHS;

export interface GeneratedDataManifestFile {
  path: string;
  stablePath: string;
  hash: string;
  bytes: number;
}

export interface GeneratedDataManifest {
  version: string;
  generatedAt: string;
  files: Record<GeneratedDataKey, GeneratedDataManifestFile>;
}

export function generatedDataPath(
  manifest: GeneratedDataManifest | null | undefined,
  key: GeneratedDataKey,
): string {
  return manifest?.files[key]?.path ?? DEFAULT_GENERATED_DATA_PATHS[key];
}
