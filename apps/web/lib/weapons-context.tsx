"use client";

import {
  buildDetailIndexFromDocs,
  buildWeaponIndexLookups,
  expandWeapon,
  internWeaponCatalog,
  sampleDamageTypes,
  type DamageTypeRef,
  type PerkRef,
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
  byHash: Map<number, WeaponSummary>;
  perkMap: WeaponIndexLookups["perkMap"];
  weaponsByPerkName: WeaponIndexLookups["weaponsByPerkName"];
  loading: boolean;
  isSample: boolean;
  version?: string;
  getWeaponDoc: (hash: number) => Promise<WeaponDoc | undefined>;
}

const defaultState: WeaponsState = {
  weapons: [],
  perks: [],
  damageTypes: sampleDamageTypes,
  byHash: new Map(),
  perkMap: new Map(),
  weaponsByPerkName: new Map(),
  loading: true,
  isSample: false,
  getWeaponDoc: async () => undefined,
};

const WeaponsContext = createContext<WeaponsState>(defaultState);

let moduleCache: WeaponIndexLookups | null = null;
let detailCache: Map<number, WeaponDetailFields> | null = null;
let loadPromise: Promise<WeaponIndexLookups> | null = null;
let detailLoadPromise: Promise<Map<number, WeaponDetailFields>> | null = null;
let isSampleCache = false;

function seedDetails(index: WeaponDetailIndex): void {
  detailCache = new Map(
    Object.entries(index.details).map(([hash, detail]) => [Number(hash), detail]),
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
): WeaponsState {
  return {
    weapons: lookups.weapons,
    perks: lookups.perks,
    damageTypes: lookups.damageTypes.length > 0 ? lookups.damageTypes : sampleDamageTypes,
    byHash: lookups.byHash,
    perkMap: lookups.perkMap,
    weaponsByPerkName: lookups.weaponsByPerkName,
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
        seedDetails(detailIndex);
        const lookups = buildWeaponIndexLookups({
          ...index,
          damageTypes: sampleDamageTypes,
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
  const getWeaponDoc = useCallback(async (hash: number): Promise<WeaponDoc | undefined> => {
    const lookups = moduleCache ?? (await fetchWeaponIndex()).lookups;
    const summary = lookups.byHash.get(hash);
    if (!summary) return undefined;

    if (isSampleCache && !detailCache) {
      const { sampleWeapons } = await import("@repo/destiny");
      seedDetails(buildDetailIndexFromDocs(sampleWeapons, "sample"));
    } else if (!detailCache) {
      await loadWeaponDetails();
    }

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
