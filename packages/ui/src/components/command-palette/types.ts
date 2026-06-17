import type { ReactNode } from "react";

import type { FilterChipProps } from "../filter-chip";

export interface PaletteValueOption {
  id: string;
  label: string;
  /** Trailing hint, e.g. a count. */
  hint?: ReactNode;
  /** Precomputed rank for fuzzy-only matches (lower = better). */
  searchRank?: number;
  /** Dim the row (e.g. a retired perk). */
  dimmed?: boolean;
}

export interface PaletteCategory {
  id: string;
  label: string;
  /** Inline example values shown next to the category, e.g. `Arc, Solar`. */
  examples?: string;
  /** When true, hide this category from suggestions once a chip is committed (e.g. Trait 1). */
  single?: boolean;
  /** Hide this category once this many values from it are committed. */
  maxSelections?: number;
  /** When false, omit from cross-category inline chip suggestions (drill-down still works). */
  inlineSuggestions?: boolean;
  /**
   * When true, omit inline suggestions whose label does not start with the query
   * (e.g. frame "The Fate of All Fools" on query "fate"). Drill-down still lists them.
   */
  omitWeakInlineMatches?: boolean;
  /**
   * When true, keep this category visible in the filter list while typing if `getValues`
   * returns matches (e.g. Source · Root of Nightmares on query "root").
   */
  matchCategoryListByValues?: boolean;
  /** Per-category inline suggestion rank ceiling (default: scan options `maxRank`). */
  inlineMaxRank?: number;
  /** Values for this category, filtered by the in-category query. */
  getValues: (query: string) => PaletteValueOption[];
}

export interface PaletteChip {
  id: string;
  categoryId: string;
  categoryLabel: string;
  value: string;
  valueId: string;
}

export interface PaletteResultItem {
  id: string;
  /** Prefer `renderResult` on CommandPalette; kept for simple consumers. */
  content?: ReactNode;
}

export interface PaletteRecentItem {
  id: string;
  label: string;
  hint?: ReactNode;
}

export interface PaletteSectionHeaderAction {
  label: string;
  ariaLabel: string;
  onClick: () => void;
}

export interface PaletteAction {
  id: string;
  label: string;
  hint?: ReactNode;
  icon?: ReactNode;
  /** When true, omit Tab/Enter keyboard hints on this action row. */
  hideKeyboardHint?: boolean;
  /** When true, keep the panel open after this action is selected. */
  keepPanelOpen?: boolean;
  /** When true, stay visible while the main query filters other list rows. */
  alwaysShow?: boolean;
  /** When true, the row is visible but not selectable. */
  disabled?: boolean;
  /** Primary actions use the green submit styling. */
  variant?: "default" | "primary";
  onSelect: () => void;
}

export interface CommandPaletteProps {
  placeholder?: string;
  /** Placeholder when the panel is closed with no chips or query. */
  idlePlaceholder?: string;
  categories: PaletteCategory[];
  /** Action rows shown at the bottom of the filter category list. */
  categoryActions?: PaletteAction[];
  /** Active filter chips (controlled by the consumer). */
  chips: PaletteChip[];
  onAddChip: (categoryId: string, option: PaletteValueOption) => void;
  onRemoveChip: (chipId: string) => void;
  /** Clears every filter chip — the × button also clears the free-text query when typed. */
  onClearChips?: () => void;
  /** Free-text query (controlled) — narrows visible filter categories; consumer may also use it for result search. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Fired on Enter when no list item is highlighted (and via the submit button). */
  onSubmit?: () => void;
  /** When true and query is empty, the list shows `results` instead of categories. */
  showResults?: boolean;
  /** When true with `showResults`, keep results mode while the user is still typing. */
  resultsWhileFiltering?: boolean;
  /** Full string applied when the user presses Tab to accept ghost completion. */
  ghostCompletion?: string;
  /** Muted suffix shown after the typed query (derived from `ghostCompletion`). */
  ghostSuffix?: string;
  /** Weapon (or other) hits rendered inside the palette list. */
  results?: PaletteResultItem[];
  onSelectResult?: (id: string) => void;
  /** Render a result row from its id — preferred over embedding JSX in `results`. */
  renderResult?: (id: string) => ReactNode;
  /** Optional header above result rows (e.g. a sort control). */
  resultsHeader?: ReactNode;
  /** Optional header above category/value rows (e.g. a composer title). */
  panelHeader?: ReactNode;
  /** When true, omit category drill-down rows (value suggestions still work). */
  hideCategoryList?: boolean;
  /** When true, render `panelHeader` without the sticky frosted background. */
  plainPanelHeader?: boolean;
  /** Optional footer pinned below the scrollable list (e.g. a save form). */
  panelFooter?: ReactNode;
  /** Optional footer below result rows (e.g. "Showing N of M"). */
  resultsFooter?: ReactNode;
  /** Shown when `showResults` is true but `results` is empty. */
  resultsEmpty?: ReactNode;
  /** Leading adornment; defaults to a search icon. */
  leftAdornment?: ReactNode;
  /** Trailing adornment in the search bar (e.g. a mode switcher). */
  rightAdornment?: ReactNode;
  /** Disable interaction (e.g. signed-out armor mode). */
  disabled?: boolean;
  /** Render this in place of the chips + input (e.g. a "reconnect" pill). */
  renderBarOverlay?: ReactNode;
  /** Controlled panel open state — persists across disable/overlay toggles in the parent. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Detail overlay covering results (e.g. a modal) — list scroll is restored when this clears. */
  suspendResults?: boolean;
  /** Optional per-chip styling (tone, icons) based on category/value. */
  getChipAppearance?: (
    chip: PaletteChip,
  ) => Pick<FilterChipProps, "tone" | "element" | "valueIcon" | "hideLabel" | "iconOnly">;
  /** Recent searches shown at the top of the filter category list. */
  recentItems?: PaletteRecentItem[];
  onSelectRecent?: (id: string) => void;
  /** Remove a single recent search by id. */
  onRemoveRecent?: (id: string) => void;
  /** Clear all recent searches for the current list. */
  onClearRecent?: () => void;
  /** Section label above recent search rows. */
  recentSectionLabel?: string;
  /** Section label above filter category rows. */
  filtersSectionLabel?: string;
  /** Result rows shown below filter suggestions while typing (categories/values mode). */
  previewResults?: PaletteResultItem[];
  /** Section label above `previewResults` rows. */
  previewSectionLabel?: string;
  /** Recent chip/value labels used to boost inline suggestions. */
  recentValues?: ReadonlySet<string>;
  /** Pre-computed chip suggestions; skips an internal scanValueSuggestions pass when set. */
  chipSuggestions?: PaletteItem[];
  /** Fired when drill state changes so consumers can compute preview filters. */
  onPanelStateChange?: (state: PalettePanelState) => void;
  /** Fired when preview rows may mount (after open-animation deferral, if any). */
  onPreviewsReadyChange?: (ready: boolean) => void;
  /** Optional trailing content for drilled value rows. */
  renderValueTrailing?: (categoryId: string, option: PaletteValueOption) => ReactNode;
  /** Skip preview expand animation — Firefox perf; Chrome leaves this unset. */
  instantPreviewExpand?: boolean;
  /** Use `size` instead of `field-sizing:content` on the main input — Firefox perf. */
  instantInputSizing?: boolean;
  className?: string;
}

export interface PalettePanelState {
  panel: PanelKind;
  categoryId: string | null;
  valueQuery: string;
}

export type PanelKind = "closed" | "categories" | "values";
export type ListMode = "categories" | "values" | "results";

export interface PaletteReducerState {
  panel: PanelKind;
  categoryId: string | null;
  /** In-category value search (kept separate from the free-text `query`). */
  valueQuery: string;
  activeIndex: number;
}

export type PaletteReducerAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "drill"; categoryId: string }
  | { type: "back" }
  | { type: "setValueQuery"; value: string }
  | { type: "setActive"; index: number };

export type PaletteItem =
  | { kind: "category"; category: PaletteCategory }
  | { kind: "action"; action: PaletteAction }
  | {
      kind: "section";
      id: string;
      label?: string;
      divider?: boolean;
      headerAction?: PaletteSectionHeaderAction;
    }
  | { kind: "recent"; recent: PaletteRecentItem; onRemove?: () => void }
  | { kind: "chipSuggestion"; category: PaletteCategory; option: PaletteValueOption }
  | { kind: "value"; option: PaletteValueOption }
  | { kind: "result"; result: PaletteResultItem };

export type ClosingSnapshot = {
  mode: ListMode;
  items: PaletteItem[];
};

/** Dormant list snapshot saved on close with a draft query; fingerprint validates on reopen. */
export type DormantSnapshot = ClosingSnapshot & {
  query: string;
  chipsLength: number;
};
