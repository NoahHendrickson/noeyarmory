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
import { cn } from "../../lib/utils";
import { PaletteInputBar } from "./palette-input-bar";
import { PaletteList } from "./palette-list";
import { resolveEscapeStep } from "./progressive-escape";
import {
  buildPaletteItems,
  dormantSnapshotMatches,
  firstSelectableIndex,
  isSelectableItem,
  listMode,
  nextSelectableIndex,
  PANEL_TRANSITION_MS,
  paletteReducer,
  searchValueSuggestions,
  stripPreviewItems,
} from "./palette-reducer";
import type {
  ClosingSnapshot,
  CommandPaletteProps,
  DormantSnapshot,
  ListMode,
  PaletteCategory,
  PaletteItem,
} from "./types";

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

export { PANEL_TRANSITION_MS, searchValueSuggestions } from "./palette-reducer";

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
  const [closingSnapshot, setClosingSnapshot] = useState<ClosingSnapshot | null>(null);
  const [openingSnapshot, setOpeningSnapshot] = useState<ClosingSnapshot | null>(null);
  const [previewsMounted, setPreviewsMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeAnimationTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const openAnimationTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dormantSnapshotRef = useRef<DormantSnapshot | null>(null);
  const openingFingerprintRef = useRef<Pick<DormantSnapshot, "query" | "chipsLength"> | null>(
    null,
  );
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
  useEffect(() => () => clearTimeout(closeAnimationTimerRef.current), []);

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

  function clearOpenAnimationTimer() {
    clearTimeout(openAnimationTimerRef.current);
    openAnimationTimerRef.current = undefined;
  }

  function clearOpeningSnapshot() {
    setOpeningSnapshot(null);
    openingFingerprintRef.current = null;
  }

  function finishOpenAnimation(deferPreviews: boolean) {
    clearOpenAnimationTimer();
    clearOpeningSnapshot();
    if (deferPreviews) setPreviewsMounted(true);
  }

  function startPreviewDeferTimer() {
    const deferPreviews = query.trim().length > 0 && chips.length === 0;
    if (!deferPreviews) return;
    clearOpenAnimationTimer();
    openAnimationTimerRef.current = setTimeout(
      () => finishOpenAnimation(true),
      PANEL_TRANSITION_MS,
    );
  }

  function invalidateDormantSnapshot() {
    const dormant = dormantSnapshotRef.current;
    if (dormant && !dormantSnapshotMatches(dormant, query, chips.length)) {
      dormantSnapshotRef.current = null;
    }
  }

  function seedOpeningSnapshot() {
    invalidateDormantSnapshot();
    const dormant = dormantSnapshotRef.current;
    if (!dormant || !dormantSnapshotMatches(dormant, query, chips.length)) {
      dormantSnapshotRef.current = null;
      return;
    }
    setOpeningSnapshot({ mode: dormant.mode, items: [...dormant.items] });
    openingFingerprintRef.current = { query: dormant.query, chipsLength: dormant.chipsLength };
    const deferPreviews = query.trim().length > 0 && chips.length === 0;
    if (deferPreviews) setPreviewsMounted(false);
    startPreviewDeferTimer();
  }

  useEffect(() => {
    if (!open) return;
    clearTimeout(closeAnimationTimerRef.current);
    setClosingSnapshot(null);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPreviewsMounted(false);
      clearOpeningSnapshot();
      clearOpenAnimationTimer();
      return;
    }
    const deferPreviews = query.trim().length > 0 && chips.length === 0;
    if (!deferPreviews) {
      setPreviewsMounted(true);
      return;
    }
    if (!previewsMounted && openAnimationTimerRef.current === undefined) {
      startPreviewDeferTimer();
    }
  }, [open, query, chips.length, previewsMounted]);

  useEffect(() => {
    invalidateDormantSnapshot();
    const fingerprint = openingFingerprintRef.current;
    if (
      fingerprint &&
      !dormantSnapshotMatches(fingerprint, query, chips.length)
    ) {
      clearOpeningSnapshot();
      clearOpenAnimationTimer();
    }
  }, [query, chips.length]);

  useEffect(() => {
    if (!open) setBrowseFilters(false);
  }, [open]);

  useEffect(() => {
    if (chips.length === 0) setBrowseFilters(false);
  }, [chips.length]);

  function openPanel() {
    seedOpeningSnapshot();
    dispatch({ type: "open" });
    onOpenChange?.(true);
  }

  function beginCloseAnimation(currentMode: ListMode | null, currentItems: PaletteItem[]) {
    if (!currentMode) return;
    setClosingSnapshot({ mode: currentMode, items: [...currentItems] });
    if (query.trim().length > 0 && chips.length === 0) {
      dormantSnapshotRef.current = {
        mode: currentMode,
        items: stripPreviewItems(currentItems),
        query: query.trim(),
        chipsLength: chips.length,
      };
    }
    clearTimeout(closeAnimationTimerRef.current);
    closeAnimationTimerRef.current = setTimeout(() => {
      setClosingSnapshot(null);
    }, PANEL_TRANSITION_MS);
  }

  function closePanel() {
    beginCloseAnimation(mode, items);
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

  const previewResultsForItems =
    open && previewsMounted ? previewResults : [];

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

  const activeIndex =
    state.activeIndex < 0 ? -1 : Math.min(state.activeIndex, Math.max(0, items.length - 1));
  const displayIndex = hoverIndex >= 0 ? hoverIndex : activeIndex;
  const keyboardFocus = hoverIndex < 0 && activeIndex >= 0;
  const resultsOrderKey =
    mode === "results" ? results.map((result) => result.id).join("\u0000") : "";
  const previewOrderKey =
    previewsMounted && open
      ? previewResults.map((result) => result.id).join("\u0000")
      : "";
  const actionsOrderKey = categoryActions.map((action) => action.id).join("\u0000");
  const recentOrderKey = recentItems.map((item) => item.id).join("\u0000");

  useEffect(() => {
    onPanelStateChange?.({
      panel: state.panel,
      categoryId: state.categoryId,
      valueQuery: state.valueQuery,
    });
  }, [state.panel, state.categoryId, state.valueQuery, onPanelStateChange]);

  useEffect(() => {
    if (!open) return;
    dispatch({ type: "setActive", index: firstSelectableIndex(items) });
    setHoverIndex(-1);
  }, [
    open,
    mode,
    state.categoryId,
    state.valueQuery,
    query,
    results.length,
    chips.length,
    resultsOrderKey,
    previewOrderKey,
    actionsOrderKey,
    recentOrderKey,
    items,
  ]);

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

  const panelClosing = closingSnapshot != null;
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
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-card/55 backdrop-blur-xl"
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
