"use client";

import {
  buildDetailIndexFromDocs,
  buildWeaponIndexLookups,
  createWeaponFuse,
  enrichAmmoGenerationFromDetails,
  expandWeapon,
  internWeaponCatalog,
  refreshWeaponSummaries,
  sampleAmmoTypes,
  sampleDamageTypes,
  sampleStatGroup,
  sampleWeaponTypes,
  type AmmoTypeRef,
  type DamageTypeRef,
  type WeaponTypeRef,
  type PerkRef,
  type StatGroupRef,
  type WeaponDetailFields,
  type WeaponDetailIndex,
  type WeaponDoc,
  type WeaponIndex,
  type WeaponIndexLookups,
  type WeaponSummary,
} from "@repo/destiny";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_GENERATED_DATA_PATHS,
  GENERATED_DATA_MANIFEST_PATH,
  generatedDataPath,
  type GeneratedDataKey,
  type GeneratedDataManifest,
} from "./generated-data";
import { scheduleIdle } from "./schedule-idle";

interface NoeyarmoryPreloadStore {
  generatedDataManifest?: Promise<GeneratedDataManifest | null>;
  weapons?: Promise<WeaponIndex>;
}

declare global {
  var __noeyarmoryPreloads: NoeyarmoryPreloadStore | undefined;
}

export interface WeaponsState {
  weapons: WeaponSummary[];
  perks: PerkRef[];
  damageTypes: DamageTypeRef[];
  weaponTypes: WeaponTypeRef[];
  ammoTypes: AmmoTypeRef[];
  byHash: Map<number, WeaponSummary>;
  perkMap: WeaponIndexLookups["perkMap"];
  weaponsByPerkName: WeaponIndexLookups["weaponsByPerkName"];
  nameIndex: WeaponIndexLookups["nameIndex"];
  weaponFuse: WeaponIndexLookups["weaponFuse"];
  loading: boolean;
  isSample: boolean;
  version?: string;
  getWeaponDoc: (hash: number) => Promise<WeaponDoc | undefined>;
}

const emptyLookups = buildWeaponIndexLookups({
  version: "empty",
  generatedAt: "",
  perks: [],
  weapons: [],
  weaponsByPerkName: {},
  damageTypes: [],
});

const defaultState: WeaponsState = {
  weapons: [],
  perks: [],
  damageTypes: sampleDamageTypes,
  weaponTypes: sampleWeaponTypes,
  ammoTypes: sampleAmmoTypes,
  byHash: new Map(),
  perkMap: new Map(),
  weaponsByPerkName: new Map(),
  nameIndex: emptyLookups.nameIndex,
  weaponFuse: createWeaponFuse([]),
  loading: true,
  isSample: false,
  getWeaponDoc: async () => undefined,
};

const WeaponsContext = createContext<WeaponsState>(defaultState);

let moduleCache: WeaponIndexLookups | null = null;
let detailCache: Map<number, WeaponDetailFields> | null = null;
let statGroupsCache: Record<string, StatGroupRef> | undefined;
let loadPromise: Promise<WeaponIndexLookups> | null = null;
let detailLoadPromise: Promise<Map<number, WeaponDetailFields>> | null = null;
let generatedDataManifestPromise: Promise<GeneratedDataManifest | null> | null = null;
let isSampleCache = false;

const DETAIL_PRELOAD_DELAY_MS = 1500;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function getPreloadStore(): NoeyarmoryPreloadStore | undefined {
  return globalThis.__noeyarmoryPreloads;
}

async function fetchGeneratedDataManifest(): Promise<GeneratedDataManifest | null> {
  try {
    return await fetchJson<GeneratedDataManifest>(GENERATED_DATA_MANIFEST_PATH);
  } catch (error) {
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

async function fetchGeneratedDataFile<T>(key: GeneratedDataKey): Promise<T> {
  const preloadedWeapons = key === "weapons" ? getPreloadStore()?.weapons : undefined;
  if (preloadedWeapons) return (await preloadedWeapons) as T;

  const manifest = await loadGeneratedDataManifest();
  const path = generatedDataPath(manifest, key);
  try {
    return await fetchJson<T>(path);
  } catch {
    const fallbackPath = DEFAULT_GENERATED_DATA_PATHS[key];
    if (path !== fallbackPath) {
      return fetchJson<T>(fallbackPath);
    }
    throw error;
  }
}

function seedDetails(index: WeaponDetailIndex): void {
  detailCache = new Map(
    Object.entries(index.details).map(([hash, detail]) => [Number(hash), detail]),
  );
  statGroupsCache = index.statGroups;
}

function enrichSummariesIfReady(): void {
  if (!moduleCache || !detailCache) return;

  const weapons = enrichAmmoGenerationFromDetails(moduleCache.weapons, detailCache);
  moduleCache = refreshWeaponSummaries(moduleCache, weapons);
}

async function seedSampleDetails(): Promise<void> {
  const { sampleWeapons } = await import("@repo/destiny");
  seedDetails(
    buildDetailIndexFromDocs(sampleWeapons, "sample", {
      [String(sampleStatGroup.hash)]: sampleStatGroup,
    }),
  );
}

async function loadWeaponDetails(): Promise<Map<number, WeaponDetailFields>> {
  if (detailCache) return detailCache;

  if (!detailLoadPromise) {
    detailLoadPromise = (async () => {
      try {
        const index = await fetchGeneratedDataFile<WeaponDetailIndex>("weaponDetails");
        seedDetails(index);
        enrichSummariesIfReady();
        return detailCache!;
      } catch {
        detailCache = new Map();
        statGroupsCache = undefined;
        return detailCache;
      } finally {
        detailLoadPromise = null;
      }
    })();
  }

  return detailLoadPromise;
}

async function ensureDetailCache(): Promise<void> {
  if (detailCache) return;

  if (isSampleCache) {
    await seedSampleDetails();
    enrichSummariesIfReady();
    return;
  }

  await loadWeaponDetails();
}

function lookupsToState(
  lookups: WeaponIndexLookups,
  isSample: boolean,
  getWeaponDoc: WeaponsState["getWeaponDoc"],
): WeaponsState {
  return {
    weapons: lookups.weapons,
    perks: lookups.perks,
    damageTypes: lookups.damageTypes.length > 0 ? lookups.damageTypes : sampleDamageTypes,
    weaponTypes: lookups.weaponTypes.length > 0 ? lookups.weaponTypes : sampleWeaponTypes,
    ammoTypes: lookups.ammoTypes.length > 0 ? lookups.ammoTypes : sampleAmmoTypes,
    byHash: lookups.byHash,
    perkMap: lookups.perkMap,
    weaponsByPerkName: lookups.weaponsByPerkName,
    nameIndex: lookups.nameIndex,
    weaponFuse: lookups.weaponFuse,
    loading: false,
    isSample,
    version: lookups.version,
    getWeaponDoc,
  };
}

async function fetchWeaponIndex(): Promise<{ lookups: WeaponIndexLookups; isSample: boolean }> {
  if (moduleCache) return { lookups: moduleCache, isSample: isSampleCache };

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const index = await fetchGeneratedDataFile<WeaponIndex>("weapons");
        const lookups = buildWeaponIndexLookups(index);
        moduleCache = lookups;
        isSampleCache = false;
        return moduleCache;
      } catch {
        const { sampleWeapons } = await import("@repo/destiny");
        const { index, detailIndex } = internWeaponCatalog(sampleWeapons, "sample");
        seedDetails({
          ...detailIndex,
          statGroups: { [String(sampleStatGroup.hash)]: sampleStatGroup },
        });
        const lookups = buildWeaponIndexLookups({
          ...index,
          damageTypes: sampleDamageTypes,
          weaponTypes: sampleWeaponTypes,
          ammoTypes: sampleAmmoTypes,
        });
        moduleCache = lookups;
        isSampleCache = true;
        enrichSummariesIfReady();
        return moduleCache;
      } finally {
        loadPromise = null;
      }
    })();
  }

  const lookups = await loadPromise;
  return { lookups, isSample: isSampleCache };
}

export function WeaponsProvider({ children }: { children: ReactNode }) {
  const getWeaponDoc = useCallback(async (hash: number): Promise<WeaponDoc | undefined> => {
    const lookups = moduleCache ?? (await fetchWeaponIndex()).lookups;
    const summary = lookups.byHash.get(hash);
    if (!summary) return undefined;

    await ensureDetailCache();

    return expandWeapon(summary, detailCache?.get(hash), lookups.perks);
  }, []);

  const [state, setState] = useState<WeaponsState>(() =>
    moduleCache
      ? lookupsToState(moduleCache, isSampleCache, getWeaponDoc)
      : { ...defaultState, getWeaponDoc },
  );

  useEffect(() => {
    if (moduleCache) {
      setState(lookupsToState(moduleCache, isSampleCache, getWeaponDoc));
      return;
    }

    let active = true;
    void fetchWeaponIndex().then(({ lookups, isSample }) => {
      if (active) setState(lookupsToState(lookups, isSample, getWeaponDoc));
    });
    return () => {
      active = false;
    };
  }, [getWeaponDoc]);

  useEffect(() => {
    if (state.loading || detailCache) return;

    let detailPreloadTimer: number | undefined;
    const cancelIdle = scheduleIdle(() => {
      detailPreloadTimer = window.setTimeout(() => {
        void ensureDetailCache().then(() => {
          if (moduleCache) {
            setState(lookupsToState(moduleCache, isSampleCache, getWeaponDoc));
          }
        });
      }, DETAIL_PRELOAD_DELAY_MS);
    }, 250);

    return () => {
      cancelIdle();
      if (detailPreloadTimer !== undefined) window.clearTimeout(detailPreloadTimer);
    };
  }, [state.loading, state.version, getWeaponDoc]);

  return <WeaponsContext.Provider value={state}>{children}</WeaponsContext.Provider>;
}

export function useWeapons(): WeaponsState {
  return useContext(WeaponsContext);
}

/** Expand a browse summary into a full WeaponDoc, loading details on demand. */
export function useWeaponDetail(
  hash: number | null,
  initial?: WeaponDoc,
): { weapon: WeaponDoc | undefined; loading: boolean } {
  const { getWeaponDoc } = useWeapons();
  const [weapon, setWeapon] = useState<WeaponDoc | undefined>(initial);
  const [loading, setLoading] = useState(initial == null && hash != null);

  useEffect(() => {
    if (hash == null) {
      setWeapon(undefined);
      setLoading(false);
      return;
    }
    if (initial && initial.hash === hash) {
      setWeapon(initial);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void getWeaponDoc(hash).then((doc) => {
      if (active) {
        setWeapon(doc);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [hash, initial, getWeaponDoc]);

  return { weapon, loading };
}

/** Stat groups from weapons-detail.json — needed for perk stat preview. */
export function useStatGroups(): Record<string, StatGroupRef> | undefined {
  const { isSample } = useWeapons();
  const [statGroups, setStatGroups] = useState<Record<string, StatGroupRef> | undefined>(
    statGroupsCache,
  );

  useEffect(() => {
    if (statGroupsCache) {
      setStatGroups(statGroupsCache);
      return;
    }

    let active = true;
    void (async () => {
      await ensureDetailCache();
      if (active) setStatGroups(statGroupsCache);
    })();

    return () => {
      active = false;
    };
  }, [isSample]);

  return statGroups;
}
