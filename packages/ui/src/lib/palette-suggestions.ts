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
}

/** Scan filter values across all categories (e.g. "surr" → Trait 2 · Surrounded). */
export function scanValueSuggestions(
  categories: PaletteCategory[],
  query: string,
  chips: PaletteChip[],
  limit = MAX_VALUE_SUGGESTIONS,
): ValueSuggestion[] {
  const q = query.trim();
  if (!q) return [];

  const applied = new Set(chips.map((c) => `${c.categoryId}:${c.valueId}`));
  const items: ValueSuggestion[] = [];

  for (const category of categories) {
    if (categoryIsFull(category, chips)) continue;
    for (const option of category.getValues(q)) {
      if (applied.has(`${category.id}:${option.id}`)) continue;
      items.push({ categoryId: category.id, value: option.label, valueId: option.id });
      if (items.length >= limit) return items;
    }
  }
  return items;
}

export function shouldIgnoreSearchShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return document.querySelector('[role="dialog"]') != null;
}
