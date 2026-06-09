"use client";

import { useDeferredValue, useMemo } from "react";
import type { PaletteCategory, PaletteChip, PalettePanelState, ValueSuggestion } from "@repo/ui";
import {
  createLruCache,
  createWeaponFuse,
  filterWeaponNames,
  filterWeapons,
  hasStrongWeaponNameMatch,
  mergeWeaponFilters,
  MIN_WEAPON_TEXT_QUERY_LENGTH,
  planWeaponTextSearch,
  rankWeaponResults,
  sortFilteredWeaponNames,
  weaponsMatchingTextQuery,
  type PerkRef,
  type PopularityLookup,
  type WeaponDpsEntry,
  type WeaponFilters,
  type WeaponNameIndex,
  type WeaponSort,
  type WeaponSummary,
} from "@repo/destiny";

import type { PaletteResultsMode } from "../lib/palette/results-mode";
import {
  MAX_RESULTS,
  MAX_SHOW_ALL,
} from "../lib/palette/constants";
import { chipsToWeaponFilters, withHypotheticalChip } from "../lib/palette/weapon-filters";
import { useSearchPopularity } from "../lib/use-search-popularity";
import { useWeapons } from "../lib/weapons-context";
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
  nameIndex: WeaponNameIndex,
): WeaponSummary[] {
  const q = query.trim();
  if (q.length < MIN_WEAPON_TEXT_QUERY_LENGTH) return weapons;

  const exact = sortFilteredWeaponNames(filterWeaponNames(weapons, q, nameIndex)).find(
    (match) => match.searchRank === 0 && match.value.toLowerCase() === q.toLowerCase(),
  );
  if (exact) {
    return nameIndex.byName.get(exact.value) ?? weapons.filter((weapon) => weapon.name === exact.value);
  }

  return weaponsMatchingTextQuery(weapons, weaponFuse, q, limit, nameIndex);
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

  // Shared, build-once fuse + name index (B1/A1) — never rebuilt per hook/keystroke.
  const { weaponFuse, nameIndex } = useWeapons();
  const popularity: PopularityLookup = useSearchPopularity();
  const deferredQuery = useDeferredValue(query);
  const { previewQuery, previewPanelState, previewInlineSuggestions, previewResultLimit } =
    usePalettePreviewInput(query, panelState, inlineSuggestions);
  const textSearchActive = resultsMode === "text";

  // Cross-render result cache (B4): rebuilt whenever the underlying catalog,
  // popularity signal, or perk pool changes so cached lists can never go stale.
  const resultCache = useMemo(
    () => createLruCache<string, WeaponSummary[]>(32),
    [weapons, nameIndex, popularity, perks],
  );

  const weaponResults = useMemo(() => {
    const raw = deferredQuery.trim();
    // Parse keyword syntax once; non-text mode has neither keywords nor free text.
    const plan = textSearchActive ? planWeaponTextSearch(deferredQuery) : null;
    const mergedFilters = plan ? mergeWeaponFilters(weaponFilters, plan.filters) : weaponFilters;
    const searchText = plan?.searchText ?? "";

    const cacheKey = `${textSearchActive ? "t" : "f"}|${sort}|${raw}|${JSON.stringify(mergedFilters)}`;
    const cached = resultCache.get(cacheKey);
    if (cached) return cached;

    const base = searchText
      ? weaponsMatchingTextQuery(weapons, weaponFuse, searchText, MAX_SHOW_ALL, nameIndex)
      : weapons;
    const filtered = filterWeapons(base, mergedFilters, perks);
    const ranked = rankWeaponResults(filtered, searchText, sort, dpsByName, nameIndex, popularity);
    resultCache.set(cacheKey, ranked);
    return ranked;
  }, [
    weaponFuse,
    weapons,
    perks,
    deferredQuery,
    weaponFilters,
    sort,
    dpsByName,
    textSearchActive,
    nameIndex,
    popularity,
    resultCache,
  ]);

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
    // Parse the draft query once; reused for the text base and result ranking.
    const plan = planWeaponTextSearch(previewQuery);
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
      const nameQuery = plan.searchText || q;
      const preferNamePreview =
        previewInlineSuggestions.length > 0 &&
        hasStrongWeaponNameMatch(weapons, nameQuery, nameIndex);
      if (!preferNamePreview) {
        filterSets = previewInlineSuggestions.map((s) =>
          withHypotheticalChip(base, s.categoryId, s.value, s.valueId, customFilters),
        );
      }
    }

    if (filterSets.length > 0) {
      for (const filters of filterSets) {
        appendWeapons(filterWeapons(weapons, filters, perks));
      }
    } else if (q.length >= MIN_WEAPON_TEXT_QUERY_LENGTH) {
      // Keyword filters (element:solar, is:adept, …) narrow; free text searches.
      // Empty searchText means "filters only" → start from the whole catalog.
      const previewFilters = mergeWeaponFilters(base, plan.filters);
      const textBase = plan.searchText
        ? weaponsForPreviewQuery(weapons, weaponFuse, plan.searchText, previewResultLimit, nameIndex)
        : weapons;
      appendWeapons(filterWeapons(textBase, previewFilters, perks));
    }

    if (candidates.length === 0) return [];

    const rankQuery = plan.searchText || q;
    return rankWeaponResults(candidates, rankQuery, sort, dpsByName, nameIndex, popularity).slice(
      0,
      previewResultLimit,
    );
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
    nameIndex,
    popularity,
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
