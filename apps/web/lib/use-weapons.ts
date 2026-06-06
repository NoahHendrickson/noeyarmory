"use client";

import { useEffect, useState } from "react";
import {
  sampleDamageTypes,
  sampleWeapons,
  type DamageTypeRef,
  type WeaponDoc,
  type WeaponIndex,
} from "@repo/destiny";

export interface WeaponsState {
  weapons: WeaponDoc[];
  damageTypes: DamageTypeRef[];
  loading: boolean;
  /** True when falling back to the bundled sample (no generated index found). */
  isSample: boolean;
  version?: string;
}

/**
 * Loads the generated weapon index from /data/weapons.json, falling back to the
 * small bundled sample when it hasn't been generated yet.
 */
export function useWeapons(): WeaponsState {
  const [state, setState] = useState<WeaponsState>({
    weapons: [],
    damageTypes: sampleDamageTypes,
    loading: true,
    isSample: false,
  });

  useEffect(() => {
    let active = true;
    fetch("/data/weapons.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<WeaponIndex>;
      })
      .then((index) => {
        if (active)
          setState({
            weapons: index.weapons,
            damageTypes: index.damageTypes ?? sampleDamageTypes,
            loading: false,
            isSample: false,
            version: index.version,
          });
      })
      .catch(() => {
        if (active)
          setState({
            weapons: sampleWeapons,
            damageTypes: sampleDamageTypes,
            loading: false,
            isSample: true,
          });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
