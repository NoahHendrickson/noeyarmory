export const GENERATED_DATA_MANIFEST_FILENAME = "generated-data.manifest.json";
export const GENERATED_DATA_MANIFEST_PATH = `/data/${GENERATED_DATA_MANIFEST_FILENAME}`;

export const DEFAULT_GENERATED_DATA_PATHS = {
  weapons: "/data/weapons.json",
  weaponDetails: "/data/weapons-detail.json",
  newWeapons: "/data/new-weapons.json",
  armor: "/data/armor.json",
  newArmor: "/data/new-armor.json",
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

export function generatedDataCacheMode(
  manifest: GeneratedDataManifest | null | undefined,
  key: GeneratedDataKey,
): "default" | "force-cache" {
  return generatedDataPath(manifest, key) === DEFAULT_GENERATED_DATA_PATHS[key]
    ? "default"
    : "force-cache";
}
