"use client";

import {
  buildDetailIndexFromDocs,
  buildWeaponIndexLookups,
  createWeaponSearcher,
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
  useRef,
  useState,
  type ReactNode,
} from "react";

import { fetchGeneratedDataFile } from "./generated-data-client";
import { scheduleIdle } from "./schedule-idle";

export interface WeaponsState {
  weapons: WeaponSummary[];
  perks: PerkRef[];
  damageTypes: DamageTypeRef[];
  weaponTypes: WeaponTypeRef[];
  ammoTypes: AmmoTypeRef[];
  byHash: Map<number, WeaponSummary>;
  perkMap: WeaponIndexLookups["perkMap"];
  weaponsByPerkName: WeaponIndexLookups["weaponsByPerkName"];
  weaponsByPerkHash: WeaponIndexLookups["weaponsByPerkHash"];
  nameIndex: WeaponIndexLookups["nameIndex"];
  weaponSearcher: WeaponIndexLookups["weaponSearcher"];
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
  weaponsByPerkHash: new Map(),
  nameIndex: emptyLookups.nameIndex,
  weaponSearcher: createWeaponSearcher([]),
  loading: true,
  isSample: false,
  getWeaponDoc: () => Promise.resolve(undefined),
};

const WeaponsContext = createContext<WeaponsState>(defaultState);

let moduleCache: WeaponIndexLookups | null = null;
let moduleCacheKey: string | undefined;
let detailCache: Map<number, WeaponDetailFields> | null = null;
let statGroupsCache: Record<string, StatGroupRef> | undefined;
let loadPromise: Promise<WeaponIndexLookups> | null = null;
let detailLoadPromise: Promise<Map<number, WeaponDetailFields>> | null = null;
let isSampleCache = false;

function weaponIndexCacheKey(index: WeaponIndex): string {
  return `${index.version}:${index.generatedAt}`;
}

function invalidateDetailCache(): void {
  detailCache = null;
  detailLoadPromise = null;
  statGroupsCache = undefined;
}

// Idle fallback for the detail preload. Intent signals (palette hover / open) usually warm
// the cache earlier; this just guarantees it loads soon after the index for users who never
// hover. Kept short since requestIdleCallback already defers it past the critical path.
const DETAIL_PRELOAD_DELAY_MS = 400;

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

/**
 * Eagerly load the detail cache (stats / masterwork / flavor) so the first weapon detail
 * opens from memory with zero network. Idempotent and coalesced via `detailLoadPromise`,
 * so it's safe to call from intent signals (palette hover / open) as often as needed.
 */
export async function warmWeaponDetailCache(): Promise<void> {
  if (detailCache) return;
  if (!moduleCache) await fetchWeaponIndex();
  await ensureDetailCache();
}

// Stable per-hash expansion cache so repeated renders get the same WeaponDoc object (keeps
// the detail view's useMemos / computeWeaponStats from busting every render). Rebuilt when the
// index version or detail-cache presence changes.
let syncDocCache: Map<number, WeaponDoc> | null = null;
let syncDocCacheKey: string | undefined;

/**
 * Synchronously expand a weapon from the in-memory caches, or undefined if the index isn't
 * loaded yet. Perk columns come from the always-present summary, so this returns a usable doc
 * even before the detail cache is warm (stats fill in once it is). Used to render in-place
 * navigation on the same frame, with no network and no skeleton flash.
 */
export function readWeaponDocSync(hash: number): WeaponDoc | undefined {
  if (!moduleCache) return undefined;
  const summary = moduleCache.byHash.get(hash);
  if (!summary) return undefined;

  const key = `${moduleCacheKey ?? ""}:${detailCache ? "1" : "0"}`;
  if (syncDocCacheKey !== key) {
    syncDocCache = new Map();
    syncDocCacheKey = key;
  }
  let doc = syncDocCache!.get(hash);
  if (!doc) {
    doc = expandWeapon(summary, detailCache?.get(hash), moduleCache.perks);
    syncDocCache!.set(hash, doc);
  }
  return doc;
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
    weaponsByPerkHash: lookups.weaponsByPerkHash,
    nameIndex: lookups.nameIndex,
    weaponSearcher: lookups.weaponSearcher,
    loading: false,
    isSample,
    version: lookups.version,
    getWeaponDoc,
  };
}

async function fetchWeaponIndex(): Promise<{ lookups: WeaponIndexLookups; isSample: boolean }> {
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const index = await fetchGeneratedDataFile<WeaponIndex>("weapons");
        const key = weaponIndexCacheKey(index);
        if (moduleCache && moduleCacheKey === key) {
          return moduleCache;
        }
        moduleCache = buildWeaponIndexLookups(index);
        moduleCacheKey = key;
        isSampleCache = false;
        invalidateDetailCache();
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
        moduleCacheKey = weaponIndexCacheKey(index);
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
    if (state.loading) return;

    // Detail may already be warm via an intent signal (palette hover / open). Reflect the
    // enriched summaries (ammo generation) without scheduling a redundant idle fetch.
    if (detailCache) {
      if (moduleCache) setState(lookupsToState(moduleCache, isSampleCache, getWeaponDoc));
      return;
    }

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
  const { getWeaponDoc, version } = useWeapons();
  const [weapon, setWeapon] = useState<WeaponDoc | undefined>(initial);
  const [loading, setLoading] = useState(initial == null && hash != null);
  const skippedInitialFetchHashRef = useRef<number | null>(null);

  useEffect(() => {
    if (hash == null) {
      skippedInitialFetchHashRef.current = null;
      setWeapon(undefined);
      setLoading(false);
      return;
    }

    const hasMatchingInitial = initial?.hash === hash;
    if (hasMatchingInitial && skippedInitialFetchHashRef.current !== hash) {
      skippedInitialFetchHashRef.current = hash;
      setWeapon(initial);
      setLoading(false);
      return;
    }

    let active = true;
    if (!hasMatchingInitial) {
      setLoading(true);
    }

    void getWeaponDoc(hash).then((doc) => {
      if (!active) return;
      setWeapon(doc ?? (hasMatchingInitial ? initial : undefined));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [hash, initial, getWeaponDoc, version]);

  // Fast-path: when the async state hasn't caught up to `hash` yet, expand synchronously from
  // the warm caches so in-place navigation paints the target weapon immediately. Falls through
  // to the (possibly loading) async state only when the caches can't satisfy it yet.
  if (hash != null && weapon?.hash !== hash) {
    if (initial?.hash === hash) return { weapon: initial, loading: false };
    const sync = readWeaponDocSync(hash);
    if (sync) return { weapon: sync, loading: false };
  }

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
