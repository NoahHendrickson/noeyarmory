"use client";

import { useDeferredValue, useMemo } from "react";
import type { PaletteChip, ValueSuggestion } from "@repo/ui";
import { createOwnedArmorFuse, filterOwnedArmor, searchOwnedArmor, sortOwnedArmor } from "@repo/destiny";

import type { OwnedArmorItem } from "../lib/armor-types";
import { MAX_PREVIEW_RESULTS, MAX_RESULTS, MAX_SHOW_ALL } from "../lib/palette/constants";
import { chipsToArmorFilters } from "../lib/palette/weapon-filters";
import { buildArmorCategories } from "../lib/palette/armor-categories";

export interface UseArmorSearchResultsParams {
  owned: OwnedArmorItem[];
  chips: PaletteChip[];
  query: string;
  showAllResults: boolean;
  paletteOpen?: boolean;
  /** When set, gates preview computation separately from `paletteOpen` (draft-query open deferral). */
  previewsEnabled?: boolean;
  inlineSuggestions?: ValueSuggestion[];
}

export function useArmorSearchResults({
  owned,
  chips,
  query,
  showAllResults,
  paletteOpen = true,
  previewsEnabled = paletteOpen,
  inlineSuggestions = [],
}: UseArmorSearchResultsParams) {
  const armorFilters = useMemo(() => chipsToArmorFilters(chips), [chips]);
  const armorFuse = useMemo(() => createOwnedArmorFuse(owned), [owned]);
  const deferredQuery = useDeferredValue(query);
  const previewQuery = previewsEnabled ? query : deferredQuery;
  const armorCategories = useMemo(() => buildArmorCategories(owned), [owned]);

  const armorResults = useMemo(() => {
    const q = deferredQuery.trim();
    const armorBase = q ? searchOwnedArmor(owned, q, armorFuse) : owned;
    return sortOwnedArmor(filterOwnedArmor(armorBase, armorFilters));
  }, [owned, deferredQuery, armorFilters, armorFuse]);

  const resultLimit = showAllResults ? MAX_SHOW_ALL : MAX_RESULTS;
  const armorShown = armorResults.slice(0, resultLimit);

  const armorPreviewItems = useMemo(() => {
    if (!previewsEnabled) return [];
    const q = previewQuery.trim();
    if (!q) return [];

    const seen = new Set<string>();
    const merged: OwnedArmorItem[] = [];

    const append = (items: OwnedArmorItem[]) => {
      for (const item of items) {
        if (!seen.has(item.instanceId)) {
          seen.add(item.instanceId);
          merged.push(item);
        }
      }
    };

    append(
      filterOwnedArmor(searchOwnedArmor(owned, q, armorFuse).slice(0, MAX_PREVIEW_RESULTS), armorFilters),
    );

    for (const suggestion of inlineSuggestions) {
      const category = armorCategories.find((c) => c.id === suggestion.categoryId);
      if (!category) continue;
      const filters = chipsToArmorFilters([
        ...chips,
        {
          id: `${suggestion.categoryId}:${suggestion.valueId}`,
          categoryId: suggestion.categoryId,
          categoryLabel: category.label,
          value: suggestion.value,
          valueId: suggestion.valueId,
        },
      ]);
      append(filterOwnedArmor(owned, filters).slice(0, MAX_PREVIEW_RESULTS));
    }

    return merged.slice(0, MAX_PREVIEW_RESULTS);
  }, [previewsEnabled, previewQuery, owned, armorFuse, armorFilters, armorCategories, chips, inlineSuggestions]);

  return {
    armorFilters,
    armorResults,
    armorShown,
    armorPreviewItems,
    resultCount: armorResults.length,
    shownCount: armorShown.length,
  };
}
