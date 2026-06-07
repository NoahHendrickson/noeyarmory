"use client";

import { useDeferredValue, useMemo } from "react";
import type { PaletteCategory, PaletteChip, PalettePanelState } from "@repo/ui";
import { availableCategories, scanValueSuggestions } from "@repo/ui";
import {
  createWeaponFuse,
  filterWeapons,
  sortWeapons,
  type PerkRef,
  type WeaponDpsEntry,
  type WeaponFilters,
  type WeaponSort,
  type WeaponSummary,
} from "@repo/destiny";

import {
  FUSE_PRE_LIMIT,
  MAX_PREVIEW_RESULTS,
  MAX_RESULTS,
  MAX_SHOW_ALL,
} from "../lib/palette/constants";
import { chipsToWeaponFilters, withHypotheticalChip } from "../lib/palette/weapon-filters";

export interface UseWeaponSearchResultsParams {
  weapons: WeaponSummary[];
  perks: PerkRef[];
  chips: PaletteChip[];
  customFilters: import("../lib/use-custom-weapon-filters").CustomWeaponFilter[];
  query: string;
  panelState: PalettePanelState;
  weaponCategories: PaletteCategory[];
  sort: WeaponSort;
  dpsByName: ReadonlyMap<string, WeaponDpsEntry>;
  showAllResults: boolean;
  composingCustomFilter: boolean;
  mode: "weapon" | "armor";
}

export function useWeaponSearchResults({
  weapons,
  perks,
  chips,
  customFilters,
  query,
  panelState,
  weaponCategories,
  sort,
  dpsByName,
  showAllResults,
  composingCustomFilter,
  mode,
}: UseWeaponSearchResultsParams) {
  const weaponFilters = useMemo(
    () => chipsToWeaponFilters(chips, customFilters),
    [chips, customFilters],
  );

  const weaponFuse = useMemo(() => createWeaponFuse(weapons), [weapons]);
  const deferredQuery = useDeferredValue(query);
  const deferredPanelState = useDeferredValue(panelState);

  const weaponResults = useMemo(() => {
    const q = deferredQuery.trim();
    const base = q
      ? weaponFuse.search(q, { limit: FUSE_PRE_LIMIT }).map((r) => r.item)
      : weapons;
    return sortWeapons(filterWeapons(base, weaponFilters, perks), sort, dpsByName);
  }, [weaponFuse, weapons, perks, deferredQuery, weaponFilters, sort, dpsByName]);

  const resultLimit = showAllResults ? MAX_SHOW_ALL : MAX_RESULTS;
  const weaponShown = weaponResults.slice(0, resultLimit);

  const weaponPreviewWeapons = useMemo(() => {
    if (mode !== "weapon" || composingCustomFilter) return [];

    const base = chipsToWeaponFilters(chips, customFilters);
    let filterSets: WeaponFilters[] = [];

    if (
      deferredPanelState.panel === "values" &&
      deferredPanelState.categoryId &&
      deferredPanelState.valueQuery.trim()
    ) {
      const category = weaponCategories.find((c) => c.id === deferredPanelState.categoryId);
      if (category) {
        filterSets = category
          .getValues(deferredPanelState.valueQuery)
          .slice(0, MAX_PREVIEW_RESULTS)
          .map((option) =>
            withHypotheticalChip(base, category.id, option.label, option.id, customFilters),
          );
      }
    } else if (deferredPanelState.panel === "categories" && deferredQuery.trim()) {
      const suggestions = scanValueSuggestions(
        availableCategories(weaponCategories, chips),
        deferredQuery,
        chips,
        MAX_PREVIEW_RESULTS,
      );
      filterSets = suggestions.map((s) =>
        withHypotheticalChip(base, s.categoryId, s.value, s.valueId, customFilters),
      );
    }

    if (filterSets.length === 0) return [];

    const seen = new Set<number>();
    const merged: WeaponSummary[] = [];
    for (const filters of filterSets) {
      for (const weapon of filterWeapons(weapons, filters, perks)) {
        if (!seen.has(weapon.hash)) {
          seen.add(weapon.hash);
          merged.push(weapon);
        }
      }
    }
    return sortWeapons(merged, sort, dpsByName).slice(0, MAX_PREVIEW_RESULTS);
  }, [
    mode,
    composingCustomFilter,
    chips,
    customFilters,
    deferredPanelState,
    weaponCategories,
    deferredQuery,
    weapons,
    perks,
    sort,
    dpsByName,
  ]);

  return {
    weaponFilters,
    weaponResults,
    weaponShown,
    weaponPreviewWeapons,
    resultCount: weaponResults.length,
    shownCount: weaponShown.length,
  };
}
