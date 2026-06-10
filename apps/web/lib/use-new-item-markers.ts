"use client";

import { useEffect, useMemo, useState } from "react";
import type { NewArmorIndex, NewWeaponIndex } from "@repo/destiny";

import { fetchGeneratedDataFile } from "./generated-data-client";

interface NewItemMarkerState {
  newArmorHashes: ReadonlySet<number>;
  newWeaponHashes: ReadonlySet<number>;
}

const EMPTY_HASHES: ReadonlySet<number> = new Set();
const EMPTY_MARKERS: NewItemMarkerState = {
  newArmorHashes: EMPTY_HASHES,
  newWeaponHashes: EMPTY_HASHES,
};

async function fetchHashSet<T>(key: "newArmor" | "newWeapons", selectHashes: (index: T) => number[]) {
  try {
    return new Set(selectHashes(await fetchGeneratedDataFile<T>(key)));
  } catch {
    return EMPTY_HASHES;
  }
}

export function useNewItemMarkers(): NewItemMarkerState {
  const [hashes, setHashes] = useState<{
    armor: ReadonlySet<number>;
    weapons: ReadonlySet<number>;
  } | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([
      fetchHashSet<NewArmorIndex>("newArmor", (index) => index.newArmorHashes),
      fetchHashSet<NewWeaponIndex>("newWeapons", (index) => index.newWeaponHashes),
    ]).then(([newArmorHashes, newWeaponHashes]) => {
      if (active) setHashes({ armor: newArmorHashes, weapons: newWeaponHashes });
    });

    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => {
    if (!hashes) return EMPTY_MARKERS;
    return {
      newArmorHashes: hashes.armor,
      newWeaponHashes: hashes.weapons,
    };
  }, [hashes]);
}
