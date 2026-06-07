import { MAX_VALUE_SUGGESTIONS } from "../../lib/palette-suggestions";
import type {
  ListMode,
  PaletteAction,
  PaletteCategory,
  PaletteChip,
  PaletteItem,
  PaletteReducerAction,
  PaletteReducerState,
  PaletteResultItem,
  PanelKind,
} from "./types";

export const PANEL_TRANSITION_MS = 200;

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
  filtersSectionLabel: string,
  previewResults: PaletteResultItem[],
  previewSectionLabel: string,
): PaletteItem[] {
  const items: PaletteItem[] = [...valueSuggestions];

  if (recentListItems.length > 0) {
    if (items.length > 0) {
      items.push({ kind: "section", id: "recent-divider", divider: true });
    }
    items.push({ kind: "section", id: "recent-searches", label: recentSectionLabel });
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
): ListMode | null {
  if (panel === "closed") return null;
  if (panel === "values") return "values";
  if (showResults && !query.trim() && !browseFilters) return "results";
  return "categories";
}

/** Match filter values across all categories (e.g. "surr" → Trait 2 · Surrounded). */
export function searchValueSuggestions(
  categories: PaletteCategory[],
  query: string,
  chips: PaletteChip[],
): PaletteItem[] {
  const q = query.trim();
  if (!q) return [];

  const applied = new Set(chips.map((c) => `${c.categoryId}:${c.valueId}`));
  const items: PaletteItem[] = [];

  for (const category of categories) {
    if (category.single === true && chips.some((c) => c.categoryId === category.id)) continue;
    for (const option of category.getValues(q)) {
      if (applied.has(`${category.id}:${option.id}`)) continue;
      items.push({ kind: "chipSuggestion", category, option });
      if (items.length >= MAX_VALUE_SUGGESTIONS) return items;
    }
  }
  return items;
}

export function buildValuesModeItems(
  activeCategory: PaletteCategory,
  valueQuery: string,
  previewResults: PaletteResultItem[],
  previewSectionLabel: string,
): PaletteItem[] {
  const capped = activeCategory.getValues(valueQuery).slice(0, MAX_VALUE_SUGGESTIONS);
  return appendPreviewResults(
    capped.map((option) => ({ kind: "value" as const, option })),
    previewResults,
    previewSectionLabel,
  );
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
  filtersSectionLabel: string;
  previewResults: PaletteResultItem[];
  previewSectionLabel: string;
  activeCategory: PaletteCategory | null;
  valueQuery: string;
  results: PaletteResultItem[];
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
    filtersSectionLabel,
    previewResults,
    previewSectionLabel,
    activeCategory,
    valueQuery,
    results,
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
      filtersSectionLabel,
      previewResults,
      previewSectionLabel,
    );
  }

  if (mode === "values" && activeCategory) {
    return buildValuesModeItems(activeCategory, valueQuery, previewResults, previewSectionLabel);
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
