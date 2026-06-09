"use client";

import { useDeferredValue, useMemo } from "react";
import type { PaletteCategory, PaletteChip } from "@repo/ui";
import { availableCategories, scanValueSuggestions, type ValueSuggestion } from "@repo/ui";

export interface UsePaletteInlineSuggestionsParams {
  enabled: boolean;
  categories: PaletteCategory[];
  chips: PaletteChip[];
  query: string;
  recentValues?: ReadonlySet<string>;
  limit?: number;
}

/** Single scanValueSuggestions pass shared by ghost completion, preview filters, and the palette list. */
export function usePaletteInlineSuggestions({
  enabled,
  categories,
  chips,
  query,
  recentValues,
  limit = 20,
}: UsePaletteInlineSuggestionsParams): ValueSuggestion[] {
  const deferredEnabled = useDeferredValue(enabled);
  const deferredQuery = useDeferredValue(query);

  return useMemo(() => {
    if (!query.trim() || !deferredEnabled || !deferredQuery.trim()) return [];
    return scanValueSuggestions(availableCategories(categories, chips), deferredQuery, chips, {
      limit,
      perCategoryLimit: limit,
      recentValues,
      maxRank: 2,
    });
  }, [query, deferredEnabled, deferredQuery, categories, chips, recentValues, limit]);
}
