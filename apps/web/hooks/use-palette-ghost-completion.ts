"use client";

import { useMemo } from "react";
import type { PaletteCategory, PaletteChip } from "@repo/ui";
import { availableCategories, scanValueSuggestions } from "@repo/ui";
import { bestGhostCompletion, suggestWeaponNames, type WeaponSummary } from "@repo/destiny";

export interface UsePaletteGhostCompletionParams {
  query: string;
  mode: "weapon" | "armor";
  categories: PaletteCategory[];
  chips: PaletteChip[];
  weapons: WeaponSummary[];
  recentValues: ReadonlySet<string>;
  composingCustomFilter: boolean;
}

export function usePaletteGhostCompletion({
  query,
  mode,
  categories,
  chips,
  weapons,
  recentValues,
  composingCustomFilter,
}: UsePaletteGhostCompletionParams) {
  const candidates = useMemo(() => {
    if (composingCustomFilter || !query.trim()) return [];
    const open = availableCategories(categories, chips);
    const suggestions = scanValueSuggestions(open, query, chips, {
      limit: 8,
      recentValues,
    });
    const items: { label: string; popularity?: number }[] = suggestions.map((s) => ({
      label: s.value,
    }));
    if (mode === "weapon") {
      for (const weapon of suggestWeaponNames(weapons, query, 5)) {
        items.push({ label: weapon.value, popularity: weapon.count });
      }
    }
    return items;
  }, [composingCustomFilter, query, categories, chips, recentValues, mode, weapons]);

  const ghost = useMemo(
    () => bestGhostCompletion(query, candidates, recentValues),
    [query, candidates, recentValues],
  );

  return {
    ghostCompletion: ghost?.label,
    ghostSuffix: ghost?.suffix,
  };
}
