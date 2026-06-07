import { useEffect, useId, useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";
import { ArrowRight, CornerDownLeft, Search, X } from "lucide-react";

import { cn } from "../lib/utils";
import { Button } from "./button";
import { FilterChip, type FilterChipProps } from "./filter-chip";
import { Kbd } from "./kbd";

export interface PaletteValueOption {
  id: string;
  label: string;
  /** Trailing hint, e.g. a count. */
  hint?: ReactNode;
  /** Dim the row (e.g. a retired perk). */
  dimmed?: boolean;
}

export interface PaletteCategory {
  id: string;
  label: string;
  /** Inline example values shown next to the category, e.g. `"Arc" "Solar"`. */
  examples?: string;
  /** When true, hide this category from suggestions once a chip is committed (e.g. Trait 1). */
  single?: boolean;
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
  content: ReactNode;
}

export interface CommandPaletteProps {
  placeholder?: string;
  categories: PaletteCategory[];
  /** Active filter chips (controlled by the consumer). */
  chips: PaletteChip[];
  onAddChip: (categoryId: string, option: PaletteValueOption) => void;
  onRemoveChip: (chipId: string) => void;
  /** Clears every filter chip — shows an × button in the bar when chips are present. */
  onClearChips?: () => void;
  /** Free-text query (controlled) — narrows visible filter categories; consumer may also use it for result search. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Fired on Enter when no list item is highlighted (and via the submit button). */
  onSubmit?: () => void;
  /** When true and query is empty, the list shows `results` instead of categories. */
  showResults?: boolean;
  /** Weapon (or other) hits rendered inside the palette list. */
  results?: PaletteResultItem[];
  onSelectResult?: (id: string) => void;
  /** Optional header above result rows (e.g. a sort control). */
  resultsHeader?: ReactNode;
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
  /** Optional per-chip styling (tone, icons) based on category/value. */
  getChipAppearance?: (
    chip: PaletteChip,
  ) => Pick<FilterChipProps, "tone" | "element" | "valueIcon" | "hideLabel">;
  className?: string;
}

type PanelKind = "closed" | "categories" | "values";
type ListMode = "categories" | "values" | "results";

interface State {
  panel: PanelKind;
  categoryId: string | null;
  /** In-category value search (kept separate from the free-text `query`). */
  valueQuery: string;
  activeIndex: number;
}

type Action =
  | { type: "open" }
  | { type: "close" }
  | { type: "drill"; categoryId: string }
  | { type: "back" }
  | { type: "setValueQuery"; value: string }
  | { type: "setActive"; index: number };

function reducer(state: State, action: Action): State {
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

type Item =
  | { kind: "category"; category: PaletteCategory }
  | { kind: "chipSuggestion"; category: PaletteCategory; option: PaletteValueOption }
  | { kind: "value"; option: PaletteValueOption }
  | { kind: "result"; result: PaletteResultItem };

/** Whisper text for the draft chip input — mirrors the highlighted list row. */
function whisperForActiveItem(item: Item | undefined): string | undefined {
  if (item?.kind === "value") return item.option.label;
  return undefined;
}

const MAX_VALUE_SUGGESTIONS = 20;

function listMode(panel: PanelKind, showResults: boolean, query: string): ListMode | null {
  if (panel === "closed") return null;
  if (panel === "values") return "values";
  if (showResults && !query.trim()) return "results";
  return "categories";
}

/** Single-select categories (Trait 1, …) are hidden once they already have a chip. */
function categoryIsFull(category: PaletteCategory, chips: PaletteChip[]): boolean {
  return category.single === true && chips.some((c) => c.categoryId === category.id);
}

function availableCategories(categories: PaletteCategory[], chips: PaletteChip[]): PaletteCategory[] {
  return categories.filter((c) => !categoryIsFull(c, chips));
}

function shouldIgnoreSearchShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return document.querySelector('[role="dialog"]') != null;
}

/** Narrow visible filter categories while the user types in the main query. */
function filterCategories(categories: PaletteCategory[], query: string): PaletteCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return categories;
  return categories.filter(
    (c) => c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
  );
}

/** Match filter values across all categories (e.g. "surr" → Trait 2 · Surrounded). */
function searchValueSuggestions(
  categories: PaletteCategory[],
  query: string,
  chips: PaletteChip[],
): Item[] {
  const q = query.trim();
  if (!q) return [];

  const applied = new Set(chips.map((c) => `${c.categoryId}:${c.valueId}`));
  const items: Item[] = [];

  for (const category of categories) {
    if (categoryIsFull(category, chips)) continue;
    for (const option of category.getValues(q)) {
      if (applied.has(`${category.id}:${option.id}`)) continue;
      items.push({ kind: "chipSuggestion", category, option });
      if (items.length >= MAX_VALUE_SUGGESTIONS) return items;
    }
  }
  return items;
}

/**
 * A data-agnostic command palette: a pill input hosting filter chips, with a
 * drill-down panel (filter categories → values → results). Knows nothing about
 * the domain — the consumer supplies `categories`/`chips`/`results`.
 *
 * Keyboard: ↑/↓/Tab move, Enter selects, Backspace removes chips or steps back,
 * Esc closes.
 */
export function CommandPalette({
  placeholder = "Search…",
  categories,
  chips,
  onAddChip,
  onRemoveChip,
  onClearChips,
  query,
  onQueryChange,
  onSubmit,
  showResults = false,
  results = [],
  onSelectResult,
  resultsHeader,
  resultsFooter,
  resultsEmpty,
  leftAdornment,
  rightAdornment,
  disabled = false,
  renderBarOverlay,
  open: openProp,
  onOpenChange,
  getChipAppearance,
  className,
}: CommandPaletteProps) {
  const isControlled = openProp !== undefined;
  const [state, dispatch] = useReducer(reducer, {
    panel: "closed",
    categoryId: null,
    valueQuery: "",
    activeIndex: 0,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const activeCategory =
    state.panel === "values" && state.categoryId
      ? (categories.find((c) => c.id === state.categoryId) ?? null)
      : null;

  const mode = listMode(state.panel, showResults, query);
  const panelOpen = isControlled ? openProp : state.panel !== "closed";
  const open = !disabled && !renderBarOverlay && panelOpen;

  function openPanel() {
    dispatch({ type: "open" });
    onOpenChange?.(true);
  }

  function closePanel() {
    dispatch({ type: "close" });
    onOpenChange?.(false);
  }

  const openCategories = useMemo(
    () => availableCategories(categories, chips),
    [categories, chips],
  );

  const visibleCategories = useMemo(
    () => (mode === "categories" ? filterCategories(openCategories, query) : openCategories),
    [openCategories, query, mode],
  );

  const valueSuggestions = useMemo(
    () => (mode === "categories" ? searchValueSuggestions(openCategories, query, chips) : []),
    [openCategories, query, chips, mode],
  );

  const items: Item[] =
    mode === "categories"
      ? query.trim()
        ? [
            ...valueSuggestions,
            ...visibleCategories.map((category) => ({ kind: "category" as const, category })),
          ]
        : openCategories.map((category) => ({ kind: "category" as const, category }))
      : mode === "values" && activeCategory
        ? activeCategory.getValues(state.valueQuery).map((option) => ({ kind: "value", option }))
        : mode === "results"
          ? results.map((result) => ({ kind: "result", result }))
          : [];

  const activeIndex = Math.min(state.activeIndex, Math.max(0, items.length - 1));
  const resultsOrderKey =
    mode === "results" ? results.map((result) => result.id).join("\u0000") : "";

  // Reset highlight when list content changes.
  useEffect(() => {
    dispatch({ type: "setActive", index: 0 });
  }, [mode, state.categoryId, state.valueQuery, query, results.length, chips.length, resultsOrderKey]);

  // Sync controlled open prop into internal drill/back state machine.
  useEffect(() => {
    if (!isControlled) return;
    if (openProp && state.panel === "closed") dispatch({ type: "open" });
    else if (!openProp && state.panel !== "closed") dispatch({ type: "close" });
  }, [isControlled, openProp, state.panel]);

  // Global F shortcut — focus the palette unless the user is typing elsewhere.
  useEffect(() => {
    if (disabled || renderBarOverlay) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (shouldIgnoreSearchShortcut(e.target)) return;
      e.preventDefault();
      openPanel();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [disabled, renderBarOverlay]);

  // Close the panel on outside clicks.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      // Let parents mark UI (e.g. mode toggles, portaled menus) that should not dismiss the panel.
      if (
        target instanceof Element &&
        target.closest(
          '[data-palette-ignore-close], [data-pill-select-menu], [role="menuitem"], [role="menuitemradio"]',
        )
      ) {
        return;
      }
      closePanel();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep keyboard focus on the active input when the panel mode changes.
  useEffect(() => {
    if (disabled || renderBarOverlay || state.panel === "closed") return;
    inputRef.current?.focus();
  }, [state.panel, state.categoryId, disabled, renderBarOverlay]);

  function moveActive(delta: number) {
    if (!open) {
      openPanel();
      return;
    }
    if (items.length === 0) return;
    const next = Math.max(0, Math.min(activeIndex + delta, items.length - 1));
    dispatch({ type: "setActive", index: next });
  }

  function selectItem(item: Item) {
    if (item.kind === "category") {
      onQueryChange("");
      dispatch({ type: "drill", categoryId: item.category.id });
    } else if (item.kind === "chipSuggestion") {
      onAddChip(item.category.id, item.option);
      onQueryChange("");
    } else if (item.kind === "value" && activeCategory) {
      onAddChip(activeCategory.id, item.option);
      onQueryChange("");
      dispatch({ type: "back" });
    } else if (item.kind === "result") {
      onSelectResult?.(item.result.id);
    }
  }

  const inputValue = state.panel === "values" ? state.valueQuery : query;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveActive(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) moveActive(-1);
        break;
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) moveActive(-1);
        else moveActive(1);
        break;
      case "Enter": {
        const item = open ? items[activeIndex] : undefined;
        if (item) {
          e.preventDefault();
          selectItem(item);
        } else {
          onSubmit?.();
          closePanel();
        }
        break;
      }
      case "Escape":
        if (open) {
          e.preventDefault();
          closePanel();
        }
        break;
      case "Backspace":
        if (inputValue === "") {
          if (state.panel === "values") {
            e.preventDefault();
            dispatch({ type: "back" });
          } else if (chips.length > 0) {
            e.preventDefault();
            onRemoveChip(chips[chips.length - 1]!.id);
          }
        }
        break;
    }
  }

  const showAddMore = chips.length > 0 && state.panel !== "values";
  const drilling = state.panel === "values" && activeCategory != null;
  const effectivePlaceholder = showAddMore ? "Add more filters" : placeholder;
  const valueInputPlaceholder = activeCategory
    ? (whisperForActiveItem(items[activeIndex]) ?? `Filter ${activeCategory.label}…`)
    : undefined;

  const comboboxProps = {
    role: "combobox" as const,
    "aria-expanded": open,
    "aria-controls": open ? listId : undefined,
    "aria-autocomplete": "list" as const,
    "aria-activedescendant": open && items[activeIndex] ? optionId(activeIndex) : undefined,
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "mx-auto w-max max-w-[calc(100vw-2rem)]",
        open ? "min-w-[600px]" : "min-w-[420px]",
        className,
      )}
    >
      <div
        data-open={open}
        className={cn(
          "palette-card-grow overflow-hidden border border-border bg-card/35 shadow-lg shadow-black/25 backdrop-blur-xl",
          open ? "rounded-2xl" : "rounded-full",
        )}
      >
        {/* Input row */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
        <div
          className={cn(
            "flex h-14 items-center justify-between gap-3 px-[18px]",
            open && "border-b border-border",
          )}
          onClick={() => !disabled && !renderBarOverlay && inputRef.current?.focus()}
        >
          <div className="flex flex-nowrap items-center gap-2.5">
            <span className="text-muted-foreground flex size-4 shrink-0 items-center justify-center">
              {leftAdornment ?? <Search className="size-4" />}
            </span>

            {renderBarOverlay ?? (
              <>
                {chips.map((chip) => (
                  <FilterChip
                    key={chip.id}
                    label={chip.categoryLabel}
                    value={chip.value}
                    onRemove={() => onRemoveChip(chip.id)}
                    {...getChipAppearance?.(chip)}
                  />
                ))}
                {drilling && (
                  <FilterChip
                    label={activeCategory.label}
                    aria-label={`Filtering by ${activeCategory.label}`}
                    inputRef={inputRef}
                    inputValue={state.valueQuery}
                    onInputChange={(value) => dispatch({ type: "setValueQuery", value })}
                    onInputKeyDown={handleKeyDown}
                    inputPlaceholder={valueInputPlaceholder}
                    onRemove={() => dispatch({ type: "back" })}
                    inputProps={{
                      ...comboboxProps,
                      onFocus: () => !disabled && openPanel(),
                    }}
                  />
                )}
                {!drilling && (
                  <input
                    ref={inputRef}
                    type="text"
                    size={Math.max(12, inputValue.length + 1, effectivePlaceholder.length)}
                    className="placeholder:text-muted-foreground min-w-[8ch] shrink-0 bg-transparent text-base tracking-body outline-none disabled:cursor-not-allowed"
                    placeholder={effectivePlaceholder}
                    value={inputValue}
                    disabled={disabled}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onFocus={() => !disabled && openPanel()}
                    onKeyDown={handleKeyDown}
                    {...comboboxProps}
                  />
                )}
              </>
            )}
          </div>

          {rightAdornment != null && (
            <div
              data-palette-ignore-close
              className="flex shrink-0 cursor-pointer items-center"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {rightAdornment}
            </div>
          )}

          {chips.length > 0 && onClearChips != null && !renderBarOverlay && (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="iconRound"
                className="text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Clear all filters"
                disabled={disabled}
                onClick={onClearChips}
              >
                <X className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* List — part of the same card */}
        {open && (
          <div className="max-h-[376px] overflow-y-auto px-1.5 py-1.5 tracking-body">
            {mode === "results" && resultsHeader != null && (
              <div className="px-1.5 pb-2">{resultsHeader}</div>
            )}
            {mode === "results" && results.length === 0 ? (
              <div className="text-muted-foreground px-3 py-6 text-center text-base tracking-body">
                {resultsEmpty ?? "No matches"}
              </div>
            ) : items.length === 0 ? (
              <div className="text-muted-foreground px-3 py-6 text-center text-xs tracking-body">
                No matches
              </div>
            ) : (
              <ul
                role="listbox"
                id={listId}
                key={
                  mode === "results"
                    ? results.map((result) => result.id).join("\u0000")
                    : mode
                }
                className="flex flex-col gap-0.5"
              >
                {items.map((item, i) => {
                  const selected = i === activeIndex;
                  return (
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                    <li
                      key={
                        item.kind === "category"
                          ? item.category.id
                          : item.kind === "chipSuggestion"
                            ? `${item.category.id}:${item.option.id}`
                            : item.kind === "value"
                              ? item.option.id
                              : item.result.id
                      }
                      id={optionId(i)}
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseMove={() => {
                        if (!selected) dispatch({ type: "setActive", index: i });
                      }}
                      onClick={() => selectItem(item)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-1.5",
                        selected && "bg-white/[0.08]",
                        item.kind === "result" && "p-0",
                      )}
                    >
                      {item.kind === "category" ? (
                        <>
                          <span className="flex min-w-0 items-baseline gap-2 text-xs font-medium">
                            <span className="text-white">{item.category.label}:</span>
                            {item.category.examples && (
                              <span className="text-muted-foreground truncate">
                                {item.category.examples}
                              </span>
                            )}
                          </span>
                          {selected ? (
                            <Kbd>
                              Enter
                              <CornerDownLeft className="size-3" />
                            </Kbd>
                          ) : (
                            <Kbd>
                              Tab
                              <ArrowRight className="size-3" />
                            </Kbd>
                          )}
                        </>
                      ) : item.kind === "chipSuggestion" ? (
                        <>
                          <span className="flex min-w-0 items-baseline gap-2 text-xs font-medium">
                            <span className="text-white">{item.category.label}:</span>
                            <span
                              className={cn(
                                "truncate",
                                item.option.dimmed ? "text-muted-foreground/45" : "text-muted-foreground",
                              )}
                            >
                              &ldquo;{item.option.label}&rdquo;
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {item.option.hint != null && (
                              <span className="text-muted-foreground text-xs">{item.option.hint}</span>
                            )}
                            {selected ? (
                              <Kbd>
                                Enter
                                <CornerDownLeft className="size-3" />
                              </Kbd>
                            ) : (
                              <Kbd>
                                Tab
                                <ArrowRight className="size-3" />
                              </Kbd>
                            )}
                          </span>
                        </>
                      ) : item.kind === "value" ? (
                        <>
                          <span
                            className={cn(
                              "truncate text-xs font-medium",
                              item.option.dimmed && "opacity-45",
                            )}
                          >
                            {item.option.label}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {item.option.hint != null && (
                              <span className="text-muted-foreground text-xs">
                                {item.option.hint}
                              </span>
                            )}
                            {selected ? (
                              <Kbd>
                                Enter
                                <CornerDownLeft className="size-3" />
                              </Kbd>
                            ) : (
                              <Kbd>
                                Tab
                                <ArrowRight className="size-3" />
                              </Kbd>
                            )}
                          </span>
                        </>
                      ) : (
                        <div className="w-full tracking-body">{item.result.content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {mode === "results" && resultsFooter != null && (
              <div className="text-muted-foreground px-3 py-2 text-center text-base tracking-body">
                {resultsFooter}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
