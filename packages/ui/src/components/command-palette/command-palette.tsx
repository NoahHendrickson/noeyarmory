import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  availableCategories,
  filterActions,
  filterCategories,
  shouldIgnoreSearchShortcut,
} from "../../lib/palette-suggestions";
import { frostedSurface } from "../../lib/frosted-surface";
import { cn } from "../../lib/utils";
import { PaletteInputBar } from "./palette-input-bar";
import { PaletteList } from "./palette-list";
import { resolveEscapeStep } from "./progressive-escape";
import {
  buildPaletteItems,
  isSelectableItem,
  listMode,
  nextSelectableIndex,
  paletteReducer,
  searchValueSuggestions,
} from "./palette-reducer";
import type { CommandPaletteProps, ListMode, PaletteCategory, PaletteItem } from "./types";
import { usePaletteAnimation } from "./use-palette-animation";
import { usePaletteListSelection } from "./use-palette-list-selection";

export type {
  CommandPaletteProps,
  PaletteAction,
  PaletteCategory,
  PaletteChip,
  PaletteItem,
  PalettePanelState,
  PaletteRecentItem,
  PaletteResultItem,
  PaletteValueOption,
} from "./types";

export {
  PANEL_TRANSITION_MS,
  searchValueSuggestions,
  valueSuggestionsToChipItems,
} from "./palette-reducer";

/**
 * A data-agnostic command palette: a pill input hosting filter chips, with a
 * drill-down panel (filter categories → values → results). Knows nothing about
 * the domain — the consumer supplies `categories`/`chips`/`results`.
 *
 * Keyboard: ↑/↓ move, Tab completes ghost suffix, Enter selects, Backspace removes chips or steps back,
 * Esc progressively clears input, steps back, or closes.
 */
export function CommandPalette({
  placeholder = "Search…",
  idlePlaceholder = "Press F to search",
  categories,
  categoryActions = [],
  chips,
  onAddChip,
  onRemoveChip,
  onClearChips,
  query,
  onQueryChange,
  onSubmit,
  showResults = false,
  resultsWhileFiltering = false,
  ghostCompletion,
  ghostSuffix,
  results = [],
  onSelectResult,
  resultsHeader,
  panelHeader,
  hideCategoryList = false,
  plainPanelHeader = false,
  panelFooter,
  resultsFooter,
  resultsEmpty,
  leftAdornment,
  rightAdornment,
  disabled = false,
  renderBarOverlay,
  open: openProp,
  onOpenChange,
  suspendResults = false,
  getChipAppearance,
  recentItems = [],
  onSelectRecent,
  onRemoveRecent,
  onClearRecent,
  recentSectionLabel = "Recent searches",
  filtersSectionLabel = "Filters",
  previewResults = [],
  previewSectionLabel = "Results",
  recentValues,
  chipSuggestions,
  onPanelStateChange,
  onPreviewsReadyChange,
  className,
  renderResult,
}: CommandPaletteProps) {
  const isControlled = openProp !== undefined;
  const [state, dispatch] = useReducer(paletteReducer, {
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

  const [browseFilters, setBrowseFilters] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const savedResultsScrollRef = useRef(0);
  const wasResultsSuspendedRef = useRef(false);
  const listScrollingRef = useRef(false);
  const listScrollEndRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const saveResultsScroll = useCallback(() => {
    if (scrollRef.current) savedResultsScrollRef.current = scrollRef.current.scrollTop;
  }, []);

  const restoreResultsScroll = useCallback(() => {
    const top = savedResultsScrollRef.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = top;
      });
    });
  }, []);

  const handleListScroll = useCallback(() => {
    listScrollingRef.current = true;
    clearTimeout(listScrollEndRef.current);
    listScrollEndRef.current = setTimeout(() => {
      listScrollingRef.current = false;
    }, 80);
  }, []);

  useEffect(() => () => clearTimeout(listScrollEndRef.current), []);

  useEffect(() => {
    if (suspendResults) {
      saveResultsScroll();
      wasResultsSuspendedRef.current = true;
      return;
    }
    if (wasResultsSuspendedRef.current) {
      wasResultsSuspendedRef.current = false;
      restoreResultsScroll();
    }
  }, [suspendResults, saveResultsScroll, restoreResultsScroll]);

  const panelOpen = isControlled
    ? openProp || state.panel !== "closed"
    : state.panel !== "closed";
  const open = !disabled && !renderBarOverlay && panelOpen;
  const mode = listMode(state.panel, showResults, query, browseFilters, resultsWhileFiltering);

  const {
    previewsMounted,
    previewResultsForItems: previewsReadyForList,
    panelClosing,
    closingSnapshot,
    openingSnapshot,
    seedOpeningSnapshot,
    beginCloseAnimation,
  } = usePaletteAnimation({
    open,
    query,
    chipsLength: chips.length,
    onPreviewsReadyChange,
  });

  useEffect(() => {
    if (!open) setBrowseFilters(false);
  }, [open]);

  useEffect(() => {
    if (chips.length === 0) setBrowseFilters(false);
  }, [chips.length]);

  const openCategories = useMemo(
    () => availableCategories(categories, chips),
    [categories, chips],
  );

  const visibleCategories = useMemo(
    () => (mode === "categories" ? filterCategories(openCategories, query) : openCategories),
    [openCategories, query, mode],
  );

  const visibleActions = useMemo(
    () => (mode === "categories" ? filterActions(categoryActions, query) : []),
    [categoryActions, query, mode],
  );

  const valueSuggestions = useMemo(
    () =>
      mode === "categories"
        ? (chipSuggestions ??
          searchValueSuggestions(openCategories, query, chips, recentValues))
        : [],
    [openCategories, query, chips, mode, recentValues, chipSuggestions],
  );

  const recentListItems = useMemo<PaletteItem[]>(() => {
    if (hideCategoryList || mode !== "categories") return [];
    return recentItems.map((recent) => ({
      kind: "recent" as const,
      recent,
      onRemove: onRemoveRecent ? () => onRemoveRecent(recent.id) : undefined,
    }));
  }, [hideCategoryList, mode, recentItems, onRemoveRecent]);

  const recentSectionHeaderAction = useMemo(
    () =>
      onClearRecent != null
        ? {
            label: "Clear all",
            ariaLabel: "Clear all recent searches",
            onClick: onClearRecent,
          }
        : undefined,
    [onClearRecent],
  );

  const previewResultsForItems = previewsReadyForList ? previewResults : [];

  const items = useMemo(
    () =>
      buildPaletteItems({
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
        previewResults: previewResultsForItems,
        previewSectionLabel,
        activeCategory,
        valueQuery: state.valueQuery,
        results,
        recentValues,
      }),
    [
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
      previewResultsForItems,
      previewSectionLabel,
      activeCategory,
      state.valueQuery,
      results,
      recentValues,
    ],
  );

  function openPanel() {
    seedOpeningSnapshot();
    dispatch({ type: "open" });
    onOpenChange?.(true);
  }

  function closePanel() {
    beginCloseAnimation(mode, items);
    dispatch({ type: "close" });
    onOpenChange?.(false);
  }

  const activeIndex =
    state.activeIndex < 0 ? -1 : Math.min(state.activeIndex, Math.max(0, items.length - 1));
  const displayIndex = hoverIndex >= 0 ? hoverIndex : activeIndex;
  const keyboardFocus = hoverIndex < 0 && activeIndex >= 0;

  useEffect(() => {
    onPanelStateChange?.({
      panel: state.panel,
      categoryId: state.categoryId,
      valueQuery: state.valueQuery,
    });
  }, [state.panel, state.categoryId, state.valueQuery, onPanelStateChange]);

  usePaletteListSelection({
    open,
    mode,
    categoryId: state.categoryId,
    valueQuery: state.valueQuery,
    query,
    chipsLength: chips.length,
    results,
    previewsMounted,
    openForPreviews: open,
    previewResults,
    categoryActionIds: categoryActions.map((action) => action.id),
    recentItemIds: recentItems.map((item) => item.id),
    items,
    dispatch,
    setHoverIndex,
  });

  useLayoutEffect(() => {
    if (!isControlled) return;
    if (openProp && state.panel === "closed") {
      seedOpeningSnapshot();
      dispatch({ type: "open" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, openProp, state.panel]);

  useEffect(() => {
    if (!isControlled) return;
    if (!openProp && state.panel !== "closed") closePanel();
    // closePanel is stable enough here — only runs on controlled openProp transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, openProp, state.panel]);

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

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest(
          '[data-palette-ignore-close], [data-pill-select-menu], [role="menuitem"], [role="menuitemradio"], [role="dialog"]',
        )
      ) {
        return;
      }
      closePanel();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (disabled || renderBarOverlay || state.panel === "closed") return;
    inputRef.current?.focus({ preventScroll: true });
  }, [state.panel, state.categoryId, disabled, renderBarOverlay]);

  function moveActive(delta: number) {
    setHoverIndex(-1);
    if (!open) {
      openPanel();
      return;
    }
    if (items.length === 0) return;
    const base = activeIndex < 0 ? (delta > 0 ? -1 : items.length) : activeIndex;
    const next = nextSelectableIndex(items, base, delta > 0 ? 1 : -1);
    dispatch({ type: "setActive", index: next });
  }

  function selectItem(item: PaletteItem) {
    if (item.kind === "section") return;
    if (item.kind === "category") {
      onQueryChange("");
      dispatch({ type: "drill", categoryId: item.category.id });
    } else if (item.kind === "action") {
      if (item.action.disabled) return;
      onQueryChange("");
      setBrowseFilters(false);
      if (!item.action.keepPanelOpen) closePanel();
      item.action.onSelect();
    } else if (item.kind === "chipSuggestion") {
      onAddChip(item.category.id, item.option);
      onQueryChange("");
      setBrowseFilters(false);
    } else if (item.kind === "recent") {
      onSelectRecent?.(item.recent.id);
      setBrowseFilters(false);
    } else if (item.kind === "value" && activeCategory) {
      onAddChip(activeCategory.id, item.option);
      onQueryChange("");
      setBrowseFilters(false);
      dispatch({ type: "back" });
    } else if (item.kind === "result") {
      saveResultsScroll();
      onSelectResult?.(item.result.id);
    }
  }

  const inputValue = state.panel === "values" ? state.valueQuery : query;

  function clearCurrentInput() {
    if (state.panel === "values") {
      dispatch({ type: "setValueQuery", value: "" });
    } else {
      onQueryChange("");
    }
    setHoverIndex(-1);
  }

  function applyProgressiveEscape() {
    switch (resolveEscapeStep(state.panel, state.valueQuery, query)) {
      case "clear":
        clearCurrentInput();
        break;
      case "back":
        dispatch({ type: "back" });
        setHoverIndex(-1);
        break;
      case "close":
        closePanel();
        break;
    }
  }

  function acceptGhostCompletion() {
    if (!ghostCompletion) return;
    if (state.panel === "values") {
      dispatch({ type: "setValueQuery", value: ghostCompletion });
    } else {
      onQueryChange(ghostCompletion);
    }
    dispatch({ type: "setActive", index: 0 });
    setHoverIndex(-1);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (input) {
        input.setSelectionRange(ghostCompletion.length, ghostCompletion.length);
      }
    });
  }

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
        if (ghostSuffix && ghostCompletion && !e.shiftKey) {
          e.preventDefault();
          acceptGhostCompletion();
        }
        break;
      case "Enter": {
        const item = open ? items[activeIndex] : undefined;
        if (item && isSelectableItem(item)) {
          e.preventDefault();
          selectItem(item);
        } else if (onSubmit) {
          e.preventDefault();
          onSubmit();
        } else {
          closePanel();
        }
        break;
      }
      case "Escape":
        if (!open) break;
        e.preventDefault();
        applyProgressiveEscape();
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

  function showFilterCategories() {
    setBrowseFilters(true);
    onQueryChange("");
    dispatch({ type: "back" });
    openPanel();
    inputRef.current?.focus();
  }

  const showAddMore = chips.length > 0 && state.panel !== "values" && !hideCategoryList;
  const drilling = state.panel === "values" && activeCategory != null;
  const isIdleBar =
    !open &&
    !disabled &&
    !drilling &&
    chips.length === 0 &&
    !query.trim() &&
    !renderBarOverlay;
  const effectivePlaceholder = showAddMore
    ? "Search…"
    : isIdleBar
      ? idlePlaceholder
      : placeholder;
  const inputCharCount =
    inputValue.length > 0 ? inputValue.length : effectivePlaceholder.length;
  const inputSize =
    inputValue.length > 0
      ? Math.max(12, Math.min(24, inputCharCount + 1))
      : Math.max(12, inputCharCount + 1);

  const hasTypedInput = inputValue.trim().length > 0;
  const showClearButton =
    !renderBarOverlay && (hasTypedInput || (chips.length > 0 && onClearChips != null));

  function handleClearBar() {
    if (state.panel === "values") {
      clearCurrentInput();
    } else {
      if (hasTypedInput) clearCurrentInput();
      if (chips.length > 0) onClearChips?.();
    }
    inputRef.current?.focus();
  }

  const clearBarLabel =
    chips.length > 0 && onClearChips != null && hasTypedInput
      ? "Clear search and filters"
      : chips.length > 0 && onClearChips != null
        ? "Clear all filters"
        : "Clear search";

  const renderMode = open
    ? (openingSnapshot?.mode ?? mode)
    : (closingSnapshot?.mode ?? null);
  const renderItems = open
    ? (openingSnapshot?.items ?? items)
    : (closingSnapshot?.items ?? []);

  const comboboxProps = {
    role: "combobox" as const,
    "aria-expanded": open,
    "aria-controls": open ? listId : undefined,
    "aria-autocomplete": "list" as const,
    "aria-activedescendant": open && displayIndex >= 0 && items[displayIndex]
      ? optionId(displayIndex)
      : undefined,
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "mx-auto w-full min-w-0 max-w-[calc(100vw-2rem)] sm:w-[600px]",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden border border-border shadow-[0_28px_56px_-2px_rgba(0,0,0,0.42),0_12px_24px_-4px_rgba(0,0,0,0.22)]",
          open ? "rounded-[12px]" : "rounded-[1.75rem]",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit]",
            frostedSurface("bar"),
          )}
          aria-hidden
        />
        <div className="relative flex flex-col">
          <PaletteInputBar
            open={open}
            disabled={disabled}
            renderBarOverlay={renderBarOverlay}
            leftAdornment={leftAdornment}
            rightAdornment={rightAdornment}
            chips={chips}
            onRemoveChip={onRemoveChip}
            getChipAppearance={getChipAppearance}
            drilling={drilling}
            activeCategory={activeCategory}
            inputRef={inputRef}
            valueQuery={state.valueQuery}
            onValueQueryChange={(value) => dispatch({ type: "setValueQuery", value })}
            onDrillBack={() => dispatch({ type: "back" })}
            handleKeyDown={handleKeyDown}
            comboboxProps={comboboxProps}
            onOpenPanel={openPanel}
            showAddMore={showAddMore}
            onShowFilterCategories={showFilterCategories}
            effectivePlaceholder={effectivePlaceholder}
            inputValue={inputValue}
            inputSize={inputSize}
            onQueryChange={onQueryChange}
            displayIndex={displayIndex}
            items={items}
            ghostSuffix={ghostSuffix}
            showClearButton={showClearButton}
            clearBarLabel={clearBarLabel}
            onClearBar={handleClearBar}
          />
          <PaletteList
            open={open}
            renderMode={renderMode}
            renderItems={renderItems}
            listId={listId}
            optionId={optionId}
            displayIndex={displayIndex}
            activeIndex={activeIndex}
            keyboardFocus={keyboardFocus}
            results={results}
            resultsHeader={resultsHeader}
            panelHeader={panelHeader}
            plainPanelHeader={plainPanelHeader}
            resultsEmpty={resultsEmpty}
            resultsFooter={resultsFooter}
            panelFooter={panelFooter}
            panelClosing={panelClosing}
            scrollRef={scrollRef}
            listScrollingRef={listScrollingRef}
            onScroll={handleListScroll}
            onHoverIndex={setHoverIndex}
            onClearHover={() => setHoverIndex(-1)}
            onSetActive={(index) => dispatch({ type: "setActive", index })}
            onSelectItem={selectItem}
            renderResult={renderResult}
          />
        </div>
      </div>
    </div>
  );
}

// Re-export suggestion helpers for app consumers.
export {
  availableCategories,
  categoryIsFull,
  scanValueSuggestions,
} from "../../lib/palette-suggestions";
