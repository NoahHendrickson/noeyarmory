"use client";

import { useCallback } from "react";
import { matchRank, suggestWeaponNamesFromIndex, type WeaponNameIndex } from "@repo/destiny";
import type { PaletteValueOption } from "@repo/ui";

import type { PaletteResultsMode } from "../lib/palette/results-mode";

export interface UsePaletteSubmitParams {
  query: string;
  mode: "weapon" | "armor";
  weaponNameIndex: WeaponNameIndex;
  composingCustomFilter: boolean;
  addChip: (categoryId: string, option: PaletteValueOption) => void;
  setQuery: (query: string) => void;
  setResultsMode: (mode: PaletteResultsMode | null) => void;
}

export function usePaletteSubmit({
  query,
  mode,
  weaponNameIndex,
  composingCustomFilter,
  addChip,
  setQuery,
  setResultsMode,
}: UsePaletteSubmitParams) {
  return useCallback(() => {
    if (composingCustomFilter) return;
    const q = query.trim();
    if (!q) return;

    if (mode === "weapon") {
      const names = suggestWeaponNamesFromIndex(weaponNameIndex, q, 1);
      const top = names[0];
      if (top) {
        const rank = matchRank(top.value, q);
        if (rank != null && rank <= 1) {
          addChip("name", {
            id: top.value.toLowerCase(),
            label: top.value,
            hint: String(top.count),
          });
          setQuery("");
          return;
        }
      }
    }

    setResultsMode("text");
  }, [composingCustomFilter, query, mode, weaponNameIndex, addChip, setQuery, setResultsMode]);
}
