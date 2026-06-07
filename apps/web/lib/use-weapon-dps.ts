"use client";

import {
  weaponDpsLookupFromIndex,
  type WeaponDpsIndex,
  type WeaponDpsLookup,
} from "@repo/destiny";
import { useEffect, useState } from "react";

let moduleCache: WeaponDpsLookup | null = null;
let loadPromise: Promise<WeaponDpsLookup> | null = null;

async function fetchWeaponDps(): Promise<WeaponDpsLookup> {
  if (moduleCache) return moduleCache;

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const res = await fetch("/weapon-dps.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const index = (await res.json()) as WeaponDpsIndex;
        moduleCache = weaponDpsLookupFromIndex(index);
        return moduleCache;
      } catch {
        moduleCache = new Map();
        return moduleCache;
      } finally {
        loadPromise = null;
      }
    })();
  }

  return loadPromise;
}

export function useWeaponDps(): { dpsByName: WeaponDpsLookup; loading: boolean } {
  const [dpsByName, setDpsByName] = useState<WeaponDpsLookup>(
    () => moduleCache ?? new Map(),
  );
  const [loading, setLoading] = useState(moduleCache == null);

  useEffect(() => {
    if (moduleCache) {
      setDpsByName(moduleCache);
      setLoading(false);
      return;
    }

    let active = true;
    void fetchWeaponDps().then((lookup) => {
      if (active) {
        setDpsByName(lookup);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { dpsByName, loading };
}
