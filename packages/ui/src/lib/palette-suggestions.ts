import type { ReactNode } from "react";

import { effectiveRank, resolveMatchRank } from "@repo/search-rank";

import type { PaletteCategory, PaletteChip } from "../components/command-palette/types";

export const MAX_VALUE_SUGGESTIONS = 20;

/** Single-select categories (Trait 1, …) are hidden once they already have a chip. */
export function categoryIsFull(category: PaletteCategory, chips: PaletteChip[]): boolean {
  return category.single === true && chips.some((c) => c.categoryId === category.id);
}

export function availableCategories(
  categories: PaletteCategory[],
  chips: PaletteChip[],
): PaletteCategory[] {
  return categories.filter((c) => !categoryIsFull(c, chips));
}

/** Narrow visible filter categories while the user types in the main query. */
export function filterCategories(categories: PaletteCategory[], query: string): PaletteCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return categories;
  return categories.filter(
    (c) => c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
  );
}

export function filterActions<T extends { label: string; hint?: unknown; alwaysShow?: boolean }>(
  actions: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return actions;
  return actions.filter(
    (action) =>
      action.alwaysShow === true ||
      action.label.toLowerCase().includes(q) ||
      (typeof action.hint === "string" && action.hint.toLowerCase().includes(q)),
  );
}

export interface ValueSuggestion {
  categoryId: string;
  value: string;
  valueId: string;
  hint?: ReactNode;
}

export interface ScanValueSuggestionsOptions {
  limit?: number;
  /** Per-category cap passed to `getValues` before global ranking. Defaults to `limit`. */
  perCategoryLimit?: number;
  recentValues?: ReadonlySet<string>;
  /** Drop matches above this rank (inline chip suggestions use 2 = word-boundary prefix). */
  maxRank?: number;
}

export function parsePopularity(hint: unknown): number {
  if (typeof hint === "number") return hint;
  if (typeof hint === "string") {
    const n = Number.parseInt(hint, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Scan filter values across all categories — single ranking pass.
 * Category `getValues` should return flat matches only; ordering happens here.
 */
export function scanValueSuggestions(
  categories: PaletteCategory[],
  query: string,
  chips: PaletteChip[],
  limitOrOptions: number | ScanValueSuggestionsOptions = MAX_VALUE_SUGGESTIONS,
  legacyRecent?: ReadonlySet<string>,
): ValueSuggestion[] {
  const options =
    typeof limitOrOptions === "number"
      ? { limit: limitOrOptions, recentValues: legacyRecent }
      : limitOrOptions;
  const limit = options.limit ?? MAX_VALUE_SUGGESTIONS;
  const perCategoryLimit = options.perCategoryLimit ?? limit;
  const recentValues = options.recentValues ?? legacyRecent;
  const maxRank = options.maxRank;

  const q = query.trim();
  if (!q) return [];

  const applied = new Set(chips.map((c) => `${c.categoryId}:${c.valueId}`));
  const scored: { suggestion: ValueSuggestion; rank: number; popularity: number }[] = [];

  for (const category of categories) {
    if (categoryIsFull(category, chips)) continue;
    if (category.inlineSuggestions === false) continue;
    for (const option of category.getValues(q, { limit: perCategoryLimit, usage: "inline" })) {
      if (applied.has(`${category.id}:${option.id}`)) continue;
      const baseRank = resolveMatchRank(option.label, q, option.searchRank);
      if (baseRank == null) continue;
      if (maxRank != null && baseRank > maxRank) continue;
      const ql = q.toLowerCase();
      if (category.omitWeakInlineMatches && !option.label.toLowerCase().startsWith(ql)) {
        continue;
      }
      scored.push({
        suggestion: {
          categoryId: category.id,
          value: option.label,
          valueId: option.id,
          hint: option.hint,
        },
        rank: effectiveRank(baseRank, option.label, recentValues),
        popularity: parsePopularity(option.hint),
      });
    }
  }

  scored.sort(
    (a, b) =>
      a.rank - b.rank ||
      b.popularity - a.popularity ||
      a.suggestion.value.localeCompare(b.suggestion.value),
  );

  return scored.slice(0, limit).map((entry) => entry.suggestion);
}

export function shouldIgnoreSearchShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return document.querySelector('[role="dialog"]') != null;
}
