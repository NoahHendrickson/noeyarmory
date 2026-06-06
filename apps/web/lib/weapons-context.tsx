"use client";

import {
  buildWeaponIndexLookups,
  sampleDamageTypes,
  type DamageTypeRef,
  type WeaponDoc,
  type WeaponIndex,
  type WeaponIndexLookups,
} from "@repo/destiny";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface WeaponsState {
  weapons: WeaponDoc[];
  damageTypes: DamageTypeRef[];
  byHash: Map<number, WeaponDoc>;
  perkMap: WeaponIndexLookups["perkMap"];
  weaponsByPerkName: WeaponIndexLookups["weaponsByPerkName"];
  loading: boolean;
  /** True when falling back to the bundled sample (no generated index found). */
  isSample: boolean;
  version?: string;
}

const defaultState: WeaponsState = {
  weapons: [],
  damageTypes: sampleDamageTypes,
  byHash: new Map(),
  perkMap: new Map(),
  weaponsByPerkName: new Map(),
  loading: true,
  isSample: false,
};

const WeaponsContext = createContext<WeaponsState>(defaultState);

let moduleCache: WeaponIndexLookups | null = null;
let loadPromise: Promise<WeaponIndexLookups> | null = null;
let isSampleCache = false;

function lookupsToState(lookups: WeaponIndexLookups, isSample: boolean): WeaponsState {
  return {
    weapons: lookups.weapons,
    damageTypes: lookups.damageTypes.length > 0 ? lookups.damageTypes : sampleDamageTypes,
    byHash: lookups.byHash,
    perkMap: lookups.perkMap,
    weaponsByPerkName: lookups.weaponsByPerkName,
    loading: false,
    isSample,
    version: lookups.version,
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
        const lookups = buildWeaponIndexLookups({
          version: "sample",
          generatedAt: "",
          weapons: sampleWeapons,
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
  const [state, setState] = useState<WeaponsState>(() =>
    moduleCache ? lookupsToState(moduleCache, isSampleCache) : defaultState,
  );

  useEffect(() => {
    if (moduleCache) {
      setState(lookupsToState(moduleCache, isSampleCache));
      return;
    }

    let active = true;
    void fetchWeaponIndex().then(({ lookups, isSample }) => {
      if (active) setState(lookupsToState(lookups, isSample));
    });
    return () => {
      active = false;
    };
  }, []);

  return <WeaponsContext.Provider value={state}>{children}</WeaponsContext.Provider>;
}

/** Shared weapon index — fetched once per session and cached in module scope. */
export function useWeapons(): WeaponsState {
  return useContext(WeaponsContext);
}
