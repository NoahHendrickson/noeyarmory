"use client";

import { useDeferredValue, useMemo } from "react";
import type { PaletteCategory, PaletteChip, PalettePanelState, ValueSuggestion } from "@repo/ui";
import {
  createWeaponFuse,
  filterWeaponNames,
  filterWeapons,
  MIN_WEAPON_TEXT_QUERY_LENGTH,
  rankWeaponResults,
  sortFilteredWeaponNames,
  weaponsMatchingTextQuery,
  type PerkRef,
  type WeaponDpsEntry,
  type WeaponFilters,
  type WeaponSort,
  type WeaponSummary,
} from "@repo/destiny";

import type { PaletteResultsMode } from "../lib/palette/results-mode";
import {
  MAX_RESULTS,
  MAX_SHOW_ALL,
} from "../lib/palette/constants";
import { chipsToWeaponFilters, withHypotheticalChip } from "../lib/palette/weapon-filters";
import { usePalettePreviewInput } from "./use-palette-preview-input";

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
  paletteOpen: boolean;
  /** When set, gates preview computation separately from `paletteOpen` (draft-query open deferral). */
  previewsEnabled?: boolean;
  inlineSuggestions: ValueSuggestion[];
}

function weaponsForPreviewQuery(
  weapons: WeaponSummary[],
  weaponFuse: ReturnType<typeof createWeaponFuse>,
  query: string,
  limit: number,
): WeaponSummary[] {
  const q = query.trim();
  if (q.length < MIN_WEAPON_TEXT_QUERY_LENGTH) return weapons;

  const exact = sortFilteredWeaponNames(filterWeaponNames(weapons, q)).find(
    (match) => match.searchRank === 0 && match.value.toLowerCase() === q.toLowerCase(),
  );
  if (exact) {
    return weapons.filter((weapon) => weapon.name === exact.value);
  }

  return weaponsMatchingTextQuery(weapons, weaponFuse, q, limit);
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
  paletteOpen,
  previewsEnabled = paletteOpen,
  inlineSuggestions,
}: UseWeaponSearchResultsParams) {
  const weaponFilters = useMemo(
    () => chipsToWeaponFilters(chips, customFilters),
    [chips, customFilters],
  );

  const weaponFuse = useMemo(() => createWeaponFuse(weapons), [weapons]);
  const deferredQuery = useDeferredValue(query);
  const { previewQuery, previewPanelState, previewInlineSuggestions, previewResultLimit } =
    usePalettePreviewInput(query, panelState, inlineSuggestions);
  const textSearchActive = resultsMode === "text";

  const weaponResults = useMemo(() => {
    const q = deferredQuery.trim();
    const base =
      textSearchActive && q.length >= MIN_WEAPON_TEXT_QUERY_LENGTH
        ? weaponsMatchingTextQuery(weapons, weaponFuse, q, MAX_SHOW_ALL)
        : weapons;
    const filtered = filterWeapons(base, weaponFilters, perks);
    return rankWeaponResults(filtered, q, sort, dpsByName);
  }, [weaponFuse, weapons, perks, deferredQuery, weaponFilters, sort, dpsByName, textSearchActive]);

  const resultLimit = showAllResults ? MAX_SHOW_ALL : MAX_RESULTS;
  const weaponShown = weaponResults.slice(0, resultLimit);

  const weaponPreviewWeapons = useMemo(() => {
    if (!previewsEnabled || mode !== "weapon" || composingCustomFilter) return [];

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

    const q = previewQuery.trim();
    let filterSets: WeaponFilters[] = [];

    if (
      previewPanelState.panel === "values" &&
      previewPanelState.categoryId &&
      previewPanelState.valueQuery.trim()
    ) {
      const category = weaponCategories.find((c) => c.id === previewPanelState.categoryId);
      if (category) {
        filterSets = category
          .getValues(previewPanelState.valueQuery)
          .slice(0, previewResultLimit)
          .map((option) =>
            withHypotheticalChip(base, category.id, option.label, option.id, customFilters),
          );
      }
    } else if (previewPanelState.panel === "categories" && q) {
      filterSets = previewInlineSuggestions.map((s) =>
        withHypotheticalChip(base, s.categoryId, s.value, s.valueId, customFilters),
      );
    }

    if (filterSets.length > 0) {
      for (const filters of filterSets) {
        appendWeapons(filterWeapons(weapons, filters, perks));
      }
    } else if (q.length >= MIN_WEAPON_TEXT_QUERY_LENGTH) {
      appendWeapons(
        filterWeapons(
          weaponsForPreviewQuery(weapons, weaponFuse, q, previewResultLimit),
          base,
          perks,
        ),
      );
    }

    if (candidates.length === 0) return [];

    return rankWeaponResults(candidates, q, sort, dpsByName).slice(0, previewResultLimit);
  }, [
    previewsEnabled,
    mode,
    composingCustomFilter,
    chips,
    customFilters,
    previewPanelState,
    weaponCategories,
    previewQuery,
    previewResultLimit,
    weapons,
    perks,
    sort,
    dpsByName,
    weaponFuse,
    previewInlineSuggestions,
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
