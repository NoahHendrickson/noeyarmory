"use client";

import type { PerkRef, WeaponDoc } from "@repo/destiny";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface WeaponBuildState {
  /** Selected perk hash per column index (optional columns only). */
  selectedByColumn: Map<number, number>;
  /** Perk hashes from optional columns currently selected. */
  selectedPerkHashes: number[];
  togglePerk: (columnIndex: number, perk: PerkRef) => void;
  isSelected: (columnIndex: number, perkHash: number) => boolean;
}

/** Track one selected perk per optional column for stat preview builds. */
export function useWeaponBuild(weapon: WeaponDoc): WeaponBuildState {
  const [selectedByColumn, setSelectedByColumn] = useState<Map<number, number>>(() => new Map());

  useEffect(() => {
    setSelectedByColumn(new Map());
  }, [weapon.hash]);

  const togglePerk = useCallback((columnIndex: number, perk: PerkRef) => {
    setSelectedByColumn((prev) => {
      const next = new Map(prev);
      if (next.get(columnIndex) === perk.hash) {
        next.delete(columnIndex);
      } else {
        next.set(columnIndex, perk.hash);
      }
      return next;
    });
  }, []);

  const isSelected = useCallback(
    (columnIndex: number, perkHash: number) => selectedByColumn.get(columnIndex) === perkHash,
    [selectedByColumn],
  );

  const selectedPerkHashes = useMemo(
    () => [...selectedByColumn.values()],
    [selectedByColumn],
  );

  return { selectedByColumn, selectedPerkHashes, togglePerk, isSelected };
}
