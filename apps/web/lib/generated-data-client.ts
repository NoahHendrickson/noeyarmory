import {
  DEFAULT_GENERATED_DATA_PATHS,
  GENERATED_DATA_MANIFEST_PATH,
  generatedDataCacheMode,
  generatedDataPath,
  type GeneratedDataKey,
  type GeneratedDataManifest,
  type WeaponIndex,
} from "@repo/destiny";

interface NoeyarmoryPreloadStore {
  generatedDataManifest?: Promise<GeneratedDataManifest | null>;
  weapons?: Promise<WeaponIndex>;
}

declare global {
  var __noeyarmoryPreloads: NoeyarmoryPreloadStore | undefined;
}

let generatedDataManifestPromise: Promise<GeneratedDataManifest | null> | null = null;

async function fetchJson<T>(url: string, cache: RequestCache = "default"): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", cache });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function getPreloadStore(): NoeyarmoryPreloadStore | undefined {
  return globalThis.__noeyarmoryPreloads;
}

async function fetchGeneratedDataManifest(): Promise<GeneratedDataManifest | null> {
  try {
    return await fetchJson<GeneratedDataManifest>(GENERATED_DATA_MANIFEST_PATH, "no-cache");
  } catch {
    return null;
  }
}

function loadGeneratedDataManifest(): Promise<GeneratedDataManifest | null> {
  if (!generatedDataManifestPromise) {
    generatedDataManifestPromise =
      getPreloadStore()?.generatedDataManifest ?? fetchGeneratedDataManifest();
  }
  return generatedDataManifestPromise;
}

export async function fetchGeneratedDataFile<T>(key: GeneratedDataKey): Promise<T> {
  const preloadedWeapons = key === "weapons" ? getPreloadStore()?.weapons : undefined;
  if (preloadedWeapons) return (await preloadedWeapons) as T;

  const manifest = await loadGeneratedDataManifest();
  const path = generatedDataPath(manifest, key);
  const fallbackPath = DEFAULT_GENERATED_DATA_PATHS[key];
  try {
    return await fetchJson<T>(path, generatedDataCacheMode(manifest, key));
  } catch (error) {
    if (path !== fallbackPath) {
      return fetchJson<T>(fallbackPath);
    }
    throw error;
  }
}

function preloadWeaponIndex(config: { manifestUrl: string }): void {
  const store = globalThis.__noeyarmoryPreloads || (globalThis.__noeyarmoryPreloads = {});
  const fetchJson = (url: string, cache = "default") =>
    fetch(url, { credentials: "same-origin", cache: cache as RequestCache }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });

  if (!store.generatedDataManifest) {
    store.generatedDataManifest = fetchJson(config.manifestUrl, "no-cache").catch(() => null);
  }
  if (!store.weapons) {
    store.weapons = store.generatedDataManifest.then((manifest) => {
      const path = generatedDataPath(manifest, "weapons");
      const fallbackPath = DEFAULT_GENERATED_DATA_PATHS.weapons;
      return fetchJson(path, generatedDataCacheMode(manifest, "weapons")).catch((error) => {
        if (path !== fallbackPath) return fetchJson(fallbackPath);
        throw error;
      });
    });
  }
}

export function weaponIndexPreloadScript(): string {
  const config = {
    manifestUrl: GENERATED_DATA_MANIFEST_PATH,
  };

  return `(() => {
const DEFAULT_GENERATED_DATA_PATHS = ${JSON.stringify(DEFAULT_GENERATED_DATA_PATHS)};
${generatedDataPath.toString()}
${generatedDataCacheMode.toString()}
(${preloadWeaponIndex.toString()})(${JSON.stringify(config)});
})();`;
}
