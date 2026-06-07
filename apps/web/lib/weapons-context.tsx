"use client";

import {
  buildDetailIndexFromDocs,
  buildWeaponIndexLookups,
  expandWeapon,
  internWeaponCatalog,
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

export interface WeaponsState {
  weapons: WeaponSummary[];
  perks: PerkRef[];
  damageTypes: DamageTypeRef[];
  weaponTypes: WeaponTypeRef[];
  ammoTypes: AmmoTypeRef[];
  byHash: Map<number, WeaponSummary>;
  perkMap: WeaponIndexLookups["perkMap"];
  weaponsByPerkName: WeaponIndexLookups["weaponsByPerkName"];
  loading: boolean;
  isSample: boolean;
  version?: string;
  getWeaponDoc: (hash: number) => Promise<WeaponDoc | undefined>;
  preloadWeaponDetails: () => Promise<void>;
}

const defaultState: WeaponsState = {
  weapons: [],
  perks: [],
  damageTypes: sampleDamageTypes,
  weaponTypes: sampleWeaponTypes,
  ammoTypes: sampleAmmoTypes,
  byHash: new Map(),
  perkMap: new Map(),
  weaponsByPerkName: new Map(),
  loading: true,
  isSample: false,
  getWeaponDoc: async () => undefined,
  preloadWeaponDetails: async () => undefined,
};

const WeaponsContext = createContext<WeaponsState>(defaultState);

let moduleCache: WeaponIndexLookups | null = null;
let detailCache: Map<number, WeaponDetailFields> | null = null;
let statGroupsCache: Record<string, StatGroupRef> | undefined;
let loadPromise: Promise<WeaponIndexLookups> | null = null;
let detailLoadPromise: Promise<Map<number, WeaponDetailFields>> | null = null;
let isSampleCache = false;

function seedDetails(index: WeaponDetailIndex): void {
  detailCache = new Map(
    Object.entries(index.details).map(([hash, detail]) => [Number(hash), detail]),
  );
  statGroupsCache = index.statGroups;
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
        const res = await fetch("/data/weapons-detail.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const index = (await res.json()) as WeaponDetailIndex;
        seedDetails(index);
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

function lookupsToState(
  lookups: WeaponIndexLookups,
  isSample: boolean,
  getWeaponDoc: WeaponsState["getWeaponDoc"],
  preloadWeaponDetails: WeaponsState["preloadWeaponDetails"],
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
    loading: false,
    isSample,
    version: lookups.version,
    getWeaponDoc,
    preloadWeaponDetails,
  };
}

async function fetchWeaponIndex(): Promise<{ lookups: WeaponIndexLookups; isSample: boolean }> {
  if (moduleCache) return { lookups: moduleCache, isSample: isSampleCache };

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const res = await fetch("/data/weapons.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const index = (await res.json()) as WeaponIndex;
        const lookups = buildWeaponIndexLookups(index);
        moduleCache = lookups;
        isSampleCache = false;
        return lookups;
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
        return lookups;
      } finally {
        loadPromise = null;
      }
    })();
  }

  const lookups = await loadPromise;
  return { lookups, isSample: isSampleCache };
}

export function WeaponsProvider({ children }: { children: ReactNode }) {
  const preloadWeaponDetails = useCallback(async (): Promise<void> => {
    if (!moduleCache) await fetchWeaponIndex();
    if (detailCache) return;

    if (isSampleCache) {
      await seedSampleDetails();
      return;
    }

    await loadWeaponDetails();
  }, []);

  const getWeaponDoc = useCallback(async (hash: number): Promise<WeaponDoc | undefined> => {
    const lookups = moduleCache ?? (await fetchWeaponIndex()).lookups;
    const summary = lookups.byHash.get(hash);
    if (!summary) return undefined;

    if (isSampleCache && !detailCache) {
      await seedSampleDetails();
    } else if (!detailCache) {
      await loadWeaponDetails();
    }

    return expandWeapon(summary, detailCache?.get(hash), lookups.perks);
  }, []);

  const [state, setState] = useState<WeaponsState>(() =>
    moduleCache
      ? lookupsToState(moduleCache, isSampleCache, getWeaponDoc, preloadWeaponDetails)
      : { ...defaultState, getWeaponDoc, preloadWeaponDetails },
  );

  useEffect(() => {
    if (moduleCache) {
      setState(lookupsToState(moduleCache, isSampleCache, getWeaponDoc, preloadWeaponDetails));
      return;
    }

    let active = true;
    void fetchWeaponIndex().then(({ lookups, isSample }) => {
      if (active) setState(lookupsToState(lookups, isSample, getWeaponDoc, preloadWeaponDetails));
    });
    return () => {
      active = false;
    };
  }, [getWeaponDoc, preloadWeaponDetails]);

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
      if (isSample) {
        await seedSampleDetails();
      } else {
        await loadWeaponDetails();
      }
      if (active) setStatGroups(statGroupsCache);
    })();

    return () => {
      active = false;
    };
  }, [isSample]);

  return statGroups;
}
