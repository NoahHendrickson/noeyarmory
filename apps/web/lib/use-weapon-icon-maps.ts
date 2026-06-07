"use client";

import { useMemo } from "react";

import { useWeapons } from "./weapons-context";

export function useWeaponIconMaps() {
  const { damageTypes, weaponTypes, ammoTypes } = useWeapons();

  const elementIconMap = useMemo(
    () => new Map(damageTypes.map((d) => [d.name, d.icon] as const)),
    [damageTypes],
  );

  const typeIconMap = useMemo(
    () => new Map(weaponTypes.map((t) => [t.name, t.icon] as const)),
    [weaponTypes],
  );

  const ammoIconMap = useMemo(
    () => new Map(ammoTypes.map((ammoType) => [ammoType.name, ammoType.icon] as const)),
    [ammoTypes],
  );

  return { elementIconMap, typeIconMap, ammoIconMap };
}
