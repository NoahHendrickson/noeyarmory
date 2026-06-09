import { rankLabeledOptions } from "@repo/search-rank";

import {
  MAX_VALUE_SUGGESTIONS,
  parsePopularity,
  scanValueSuggestions,
  type ValueSuggestion,
} from "../../lib/palette-suggestions";
import type {
  DormantSnapshot,
  ListMode,
  PaletteAction,
  PaletteCategory,
  PaletteChip,
  PaletteItem,
  PaletteReducerAction,
  PaletteReducerState,
  PaletteResultItem,
  PaletteSectionHeaderAction,
  PanelKind,
} from "./types";

export const PANEL_TRANSITION_MS = 200;

/** Draft query with no committed chips — defer preview rows until the open animation settles. */
export function shouldDeferPreviews(query: string, chipsLength: number): boolean {
  return query.trim().length > 0 && chipsLength === 0;
}

/** True when a dormant snapshot still matches the current draft input. */
export function dormantSnapshotMatches(
  snapshot: Pick<DormantSnapshot, "query" | "chipsLength">,
  query: string,
  chipsLength: number,
): boolean {
  return snapshot.query === query.trim() && snapshot.chipsLength === chipsLength;
}

export function paletteReducer(
  state: PaletteReducerState,
  action: PaletteReducerAction,
): PaletteReducerState {
  switch (action.type) {
    case "open":
      return state.panel === "closed"
        ? { panel: "categories", categoryId: null, valueQuery: "", activeIndex: 0 }
        : state;
    case "close":
      return { panel: "closed", categoryId: null, valueQuery: "", activeIndex: 0 };
    case "drill":
      return { panel: "values", categoryId: action.categoryId, valueQuery: "", activeIndex: 0 };
    case "back":
      return { panel: "categories", categoryId: null, valueQuery: "", activeIndex: 0 };
    case "setValueQuery":
      return { ...state, valueQuery: action.value, activeIndex: 0 };
    case "setActive":
      return { ...state, activeIndex: action.index };
  }
}

export function isSelectableItem(item: PaletteItem): boolean {
  return item.kind !== "section";
}

export function firstSelectableIndex(items: PaletteItem[]): number {
  const index = items.findIndex(isSelectableItem);
  return index >= 0 ? index : 0;
}

export function nextSelectableIndex(items: PaletteItem[], from: number, delta: 1 | -1): number {
  if (items.length === 0) return 0;
  let i = from;
  for (let step = 0; step < items.length; step++) {
    i += delta;
    if (i < 0 || i >= items.length) return firstSelectableIndex(items);
    if (isSelectableItem(items[i]!)) return i;
  }
  return firstSelectableIndex(items);
}

/** Split list rows into body vs trailing preview section (divider, label, result rows). */
export function splitPreviewTail(items: PaletteItem[]): {
  baseItems: PaletteItem[];
  previewItems: PaletteItem[];
} {
  const baseItems = stripPreviewItems(items);
  if (baseItems.length === items.length) {
    return { baseItems, previewItems: [] };
  }
  return { baseItems, previewItems: items.slice(baseItems.length) };
}

/** Drop preview rows/sections — used for lightweight open/close animation snapshots. */
export function stripPreviewItems(items: PaletteItem[]): PaletteItem[] {
  const previewIndex = items.findIndex(
    (item) => item.kind === "section" && item.id === "preview",
  );
  if (previewIndex < 0) return items;
  let start = previewIndex;
  const prev = items[start - 1];
  if (prev?.kind === "section" && prev.divider) start -= 1;
  return items.slice(0, start);
}

export function appendPreviewResults(
  items: PaletteItem[],
  previewResults: PaletteResultItem[],
  previewSectionLabel: string,
): PaletteItem[] {
  if (previewResults.length === 0) return items;
  if (items.length > 0) {
    items.push({ kind: "section", id: "preview-divider", divider: true });
  }
  items.push({ kind: "section", id: "preview", label: previewSectionLabel });
  items.push(...previewResults.map((result) => ({ kind: "result" as const, result })));
  return items;
}

export function buildCategoryModeItems(
  valueSuggestions: PaletteItem[],
  recentListItems: PaletteItem[],
  categoryItems: PaletteItem[],
  actionItems: PaletteItem[],
  recentSectionLabel: string,
  recentSectionHeaderAction: PaletteSectionHeaderAction | undefined,
  filtersSectionLabel: string,
  previewResults: PaletteResultItem[],
  previewSectionLabel: string,
): PaletteItem[] {
  const items: PaletteItem[] = [...valueSuggestions];

  if (recentListItems.length > 0) {
    if (items.length > 0) {
      items.push({ kind: "section", id: "recent-divider", divider: true });
    }
    items.push({
      kind: "section",
      id: "recent-searches",
      label: recentSectionLabel,
      headerAction: recentSectionHeaderAction,
    });
    items.push(...recentListItems);
  }

  if (categoryItems.length > 0) {
    if (items.length > 0) {
      items.push({ kind: "section", id: "filters-divider", divider: true });
    }
    items.push({ kind: "section", id: "filters", label: filtersSectionLabel });
    items.push(...categoryItems);
  }

  items.push(...actionItems);
  return appendPreviewResults(items, previewResults, previewSectionLabel);
}

/** Whisper text for the draft chip input — mirrors the highlighted list row. */
export function whisperForActiveItem(item: PaletteItem | undefined): string | undefined {
  if (item?.kind === "value") return item.option.label;
  return undefined;
}

export function listMode(
  panel: PanelKind,
  showResults: boolean,
  query: string,
  browseFilters: boolean,
  resultsWhileFiltering = false,
): ListMode | null {
  if (panel === "closed") return null;
  if (panel === "values") return "values";
  if (showResults && !browseFilters && (!query.trim() || resultsWhileFiltering)) return "results";
  return "categories";
}

/** Map ranked value suggestions to palette chip-suggestion rows. */
export function valueSuggestionsToChipItems(
  suggestions: ValueSuggestion[],
  categories: PaletteCategory[],
): PaletteItem[] {
  const categoryById = new Map(categories.map((c) => [c.id, c] as const));

  return suggestions.flatMap((s) => {
    const category = categoryById.get(s.categoryId);
    if (!category) return [];
    return [
      {
        kind: "chipSuggestion" as const,
        category,
        option: { id: s.valueId, label: s.value, hint: s.hint },
      },
    ];
  });
}

/** Match filter values across all categories (e.g. "surr" → Trait 2 · Surrounded). */
export function searchValueSuggestions(
  categories: PaletteCategory[],
  query: string,
  chips: PaletteChip[],
  recentValues?: ReadonlySet<string>,
): PaletteItem[] {
  const suggestions = scanValueSuggestions(categories, query, chips, {
    limit: MAX_VALUE_SUGGESTIONS,
    recentValues,
  });
  return valueSuggestionsToChipItems(suggestions, categories);
}

export function buildValuesModeItems(
  activeCategory: PaletteCategory,
  valueQuery: string,
  previewResults: PaletteResultItem[],
  previewSectionLabel: string,
  recentValues?: ReadonlySet<string>,
): PaletteItem[] {
  const raw = activeCategory.getValues(valueQuery);
  const q = valueQuery.trim();
  const valueItems: PaletteItem[] = q
    ? (() => {
        const byLabel = new Map(raw.map((option) => [option.label, option] as const));
        const ranked = rankLabeledOptions(
          raw.map((option) => ({
            label: option.label,
            popularity: parsePopularity(option.hint),
            fallbackRank: option.searchRank,
          })),
          valueQuery,
          MAX_VALUE_SUGGESTIONS,
          recentValues,
        );
        return ranked.flatMap(({ label }) => {
          const option = byLabel.get(label);
          return option ? [{ kind: "value" as const, option }] : [];
        });
      })()
    : raw.slice(0, MAX_VALUE_SUGGESTIONS).map((option) => ({ kind: "value" as const, option }));

  return appendPreviewResults(valueItems, previewResults, previewSectionLabel);
}

export interface BuildItemsParams {
  mode: ListMode | null;
  query: string;
  hideCategoryList: boolean;
  openCategories: PaletteCategory[];
  visibleCategories: PaletteCategory[];
  visibleActions: PaletteAction[];
  categoryActions: PaletteAction[];
  valueSuggestions: PaletteItem[];
  recentListItems: PaletteItem[];
  recentSectionLabel: string;
  recentSectionHeaderAction: PaletteSectionHeaderAction | undefined;
  filtersSectionLabel: string;
  previewResults: PaletteResultItem[];
  previewSectionLabel: string;
  activeCategory: PaletteCategory | null;
  valueQuery: string;
  results: PaletteResultItem[];
  recentValues?: ReadonlySet<string>;
}

export function buildPaletteItems(params: BuildItemsParams): PaletteItem[] {
  const {
    mode,
    query,
    hideCategoryList,
    openCategories,
    visibleCategories,
    visibleActions,
    categoryActions,
    valueSuggestions,
    recentListItems,
    recentSectionLabel,
    recentSectionHeaderAction,
    filtersSectionLabel,
    previewResults,
    previewSectionLabel,
    activeCategory,
    valueQuery,
    results,
    recentValues,
  } = params;

  const categoryItems: PaletteItem[] = hideCategoryList
    ? []
    : visibleCategories.map((category) => ({ kind: "category" as const, category }));

  if (mode === "categories") {
    return buildCategoryModeItems(
      valueSuggestions,
      recentListItems,
      query.trim()
        ? categoryItems
        : hideCategoryList
          ? []
          : openCategories.map((category) => ({ kind: "category" as const, category })),
      (query.trim() ? visibleActions : categoryActions).map((action) => ({
        kind: "action" as const,
        action,
      })),
      recentSectionLabel,
      recentSectionHeaderAction,
      filtersSectionLabel,
      previewResults,
      previewSectionLabel,
    );
  }

  if (mode === "values" && activeCategory) {
    return buildValuesModeItems(
      activeCategory,
      valueQuery,
      previewResults,
      previewSectionLabel,
      recentValues,
    );
  }

  if (mode === "results") {
    return results.map((result) => ({ kind: "result", result }));
  }

  return [];
}

export function itemKey(item: PaletteItem): string {
  switch (item.kind) {
    case "category":
      return item.category.id;
    case "action":
      return `action:${item.action.id}`;
    case "section":
      return item.id;
    case "recent":
      return `recent:${item.recent.id}`;
    case "chipSuggestion":
      return `${item.category.id}:${item.option.id}`;
    case "value":
      return item.option.id;
    case "result":
      return item.result.id;
  }
}
