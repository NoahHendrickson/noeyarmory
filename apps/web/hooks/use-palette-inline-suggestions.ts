"use client";

import { useMemo } from "react";
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
  return useMemo(() => {
    if (!enabled || !query.trim()) return [];
    return scanValueSuggestions(availableCategories(categories, chips), query, chips, {
      limit,
      recentValues,
      maxRank: 2,
    });
  }, [enabled, categories, chips, query, recentValues, limit]);
}
