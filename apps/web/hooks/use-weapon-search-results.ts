"use client";

import { useDeferredValue, useMemo } from "react";
import type { PaletteCategory, PaletteChip, PalettePanelState } from "@repo/ui";
import { availableCategories, scanValueSuggestions } from "@repo/ui";
import {
  createWeaponFuse,
  filterWeaponNames,
  filterWeapons,
  rankWeaponResults,
  weaponsMatchingTextQuery,
  type PerkRef,
  type WeaponDpsEntry,
  type WeaponFilters,
  type WeaponSort,
  type WeaponSummary,
} from "@repo/destiny";

import type { PaletteResultsMode } from "../lib/palette/results-mode";
import {
  MAX_PREVIEW_RESULTS,
  MAX_RESULTS,
  MAX_SHOW_ALL,
} from "../lib/palette/constants";
import { chipsToWeaponFilters, withHypotheticalChip } from "../lib/palette/weapon-filters";

const MIN_TEXT_SEARCH_LENGTH = 2;

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
  resultsMode: PaletteResultsMode | null;
  recentValues?: ReadonlySet<string>;
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
  resultsMode,
  recentValues,
}: UseWeaponSearchResultsParams) {
  const weaponFilters = useMemo(
    () => chipsToWeaponFilters(chips, customFilters),
    [chips, customFilters],
  );

  const weaponFuse = useMemo(() => createWeaponFuse(weapons), [weapons]);
  const deferredQuery = useDeferredValue(query);
  const deferredPanelState = useDeferredValue(panelState);
  const textSearchActive = resultsMode === "text";

  const weaponResults = useMemo(() => {
    const q = deferredQuery.trim();
    const base =
      textSearchActive && q.length >= MIN_TEXT_SEARCH_LENGTH
        ? weaponsMatchingTextQuery(weapons, weaponFuse, q, MAX_SHOW_ALL)
        : weapons;
    const filtered = filterWeapons(base, weaponFilters, perks);
    return rankWeaponResults(filtered, q, sort, dpsByName);
  }, [weaponFuse, weapons, perks, deferredQuery, weaponFilters, sort, dpsByName, textSearchActive]);

  const resultLimit = showAllResults ? MAX_SHOW_ALL : MAX_RESULTS;
  const weaponShown = weaponResults.slice(0, resultLimit);

  const weaponPreviewWeapons = useMemo(() => {
    if (mode !== "weapon" || composingCustomFilter) return [];

    const base = chipsToWeaponFilters(chips, customFilters);
    const seen = new Set<number>();
    const candidates: WeaponSummary[] = [];

    const appendWeapons = (list: WeaponSummary[]) => {
      for (const weapon of list) {
        if (!seen.has(weapon.hash)) {
          seen.add(weapon.hash);
          candidates.push(weapon);
        }
      }
    };

    const q = deferredQuery.trim();
    if (q.length >= MIN_TEXT_SEARCH_LENGTH) {
      const rankedNames = filterWeaponNames(weapons, q).sort(
        (a, b) =>
          a.searchRank - b.searchRank ||
          b.count - a.count ||
          a.value.localeCompare(b.value),
      );
      for (const { value } of rankedNames) {
        appendWeapons(weapons.filter((weapon) => weapon.name === value));
      }

      appendWeapons(
        filterWeapons(
          weaponFuse.search(q, { limit: MAX_PREVIEW_RESULTS }).map((r) => r.item),
          base,
          perks,
        ),
      );
    }

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
    } else if (deferredPanelState.panel === "categories" && q) {
      const suggestions = scanValueSuggestions(
        availableCategories(weaponCategories, chips),
        q,
        chips,
        { limit: MAX_PREVIEW_RESULTS, recentValues },
      );
      filterSets = suggestions.map((s) =>
        withHypotheticalChip(base, s.categoryId, s.value, s.valueId, customFilters),
      );
    }

    for (const filters of filterSets) {
      appendWeapons(filterWeapons(weapons, filters, perks));
    }

    if (candidates.length === 0) return [];

    return rankWeaponResults(candidates, q, sort, dpsByName).slice(0, MAX_PREVIEW_RESULTS);
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
    weaponFuse,
    recentValues,
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
