"use client";

import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import type { CommandPaletteProps, PaletteChip, PaletteRecentItem } from "@repo/ui";
import { PANEL_TRANSITION_MS } from "@repo/ui";

import type { PaletteResultsMode } from "../lib/palette/results-mode";
import {
  excludeCurrentRecentSearch,
  filterRecentSearches,
  formatRecentSearchLabel,
  useRecentSearches,
} from "../lib/use-recent-searches";

type PaletteSearchMode = "weapon" | "armor";

export type PaletteSearchRecents = ReturnType<typeof useRecentSearches> & {
  recentValues: ReadonlySet<string>;
};

type SharedPaletteProps = Pick<
  CommandPaletteProps,
  | "chips"
  | "open"
  | "onOpenChange"
  | "recentItems"
  | "onSelectRecent"
  | "onRemoveRecent"
  | "onClearRecent"
  | "query"
  | "onQueryChange"
  | "showResults"
  | "resultsWhileFiltering"
  | "recentValues"
>;

export interface UsePaletteSearchChromeParams {
  mode: PaletteSearchMode;
  recents: PaletteSearchRecents;
  query: string;
  chips: PaletteChip[];
  paletteChips: PaletteChip[];
  paletteOpen: boolean;
  setQuery: (query: string) => void;
  setChips: Dispatch<SetStateAction<PaletteChip[]>>;
  setPaletteOpen: (open: boolean) => void;
  resultsMode: PaletteResultsMode | null;
  suppressRecent?: boolean;
  suppressResults?: boolean;
  onBeforeSelectRecent?: () => void;
  onBeforeClose?: () => void;
}

export function usePaletteSearchRecents(mode: PaletteSearchMode): PaletteSearchRecents {
  const recentSearches = useRecentSearches();
  const { getRecentForMode } = recentSearches;

  const recentValues = useMemo(() => {
    const values = new Set<string>();
    for (const search of getRecentForMode(mode)) {
      for (const chip of search.chips) {
        values.add(chip.value.toLowerCase());
      }
      const trimmed = search.query.trim();
      if (trimmed) values.add(trimmed.toLowerCase());
    }
    return values;
  }, [getRecentForMode, mode]);

  return { ...recentSearches, recentValues };
}

export function usePaletteSearchChrome({
  mode,
  recents,
  query,
  chips,
  paletteChips,
  paletteOpen,
  setQuery,
  setChips,
  setPaletteOpen,
  resultsMode,
  suppressRecent = false,
  suppressResults = false,
  onBeforeSelectRecent,
  onBeforeClose,
}: UsePaletteSearchChromeParams) {
  const { recordSearch, getRecentForMode, findById, removeRecent, clearRecentForMode } = recents;

  const recordCurrentSearch = useCallback(() => {
    if (suppressRecent) return;
    if (chips.length === 0 && !query.trim()) return;
    recordSearch(
      mode,
      query,
      chips.map((chip) => ({
        categoryId: chip.categoryId,
        categoryLabel: chip.categoryLabel,
        value: chip.value,
        valueId: chip.valueId,
      })),
    );
  }, [suppressRecent, chips, query, recordSearch, mode]);

  const recordSearchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(recordSearchTimerRef.current), []);

  const handleSelectRecent = useCallback(
    (id: string) => {
      const recent = findById(id);
      if (!recent) return;
      onBeforeSelectRecent?.();
      setChips(
        recent.chips.map((chip) => ({
          id: `${chip.categoryId}:${chip.valueId}`,
          categoryId: chip.categoryId,
          categoryLabel: chip.categoryLabel,
          value: chip.value,
          valueId: chip.valueId,
        })),
      );
      setQuery(recent.query);
    },
    [findById, onBeforeSelectRecent, setChips, setQuery],
  );

  const handleClearRecent = useCallback(() => clearRecentForMode(mode), [clearRecentForMode, mode]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        clearTimeout(recordSearchTimerRef.current);
        recordSearchTimerRef.current = setTimeout(recordCurrentSearch, PANEL_TRANSITION_MS);
        onBeforeClose?.();
      }
      setPaletteOpen(open);
    },
    [recordCurrentSearch, onBeforeClose, setPaletteOpen],
  );

  const recentPaletteItems = useMemo<PaletteRecentItem[]>(() => {
    if (suppressRecent) return [];
    const recents = query.trim()
      ? filterRecentSearches(getRecentForMode(mode), query)
      : getRecentForMode(mode);
    return excludeCurrentRecentSearch(recents, mode, query, chips).map((search) => ({
      id: search.id,
      label: formatRecentSearchLabel(search.chips, search.query),
    }));
  }, [suppressRecent, getRecentForMode, mode, query, chips]);

  const hasFilters = paletteChips.length > 0;
  const isFiltering = query.trim().length > 0;
  const showFilterResults = hasFilters && !isFiltering && !suppressResults;
  const showTextResults = resultsMode === "text" && isFiltering && !suppressResults;
  const showResults = showFilterResults || showTextResults;
  const resultsWhileFiltering = showTextResults;

  const paletteProps: SharedPaletteProps = {
    chips: paletteChips,
    open: paletteOpen,
    onOpenChange: handleOpenChange,
    recentItems: recentPaletteItems,
    onSelectRecent: handleSelectRecent,
    onRemoveRecent: removeRecent,
    onClearRecent: handleClearRecent,
    query,
    onQueryChange: setQuery,
    showResults,
    resultsWhileFiltering,
    recentValues: recents.recentValues,
  };

  return {
    recordSearch,
    recordCurrentSearch,
    recentValues: recents.recentValues,
    hasFilters,
    isFiltering,
    showResults,
    resultsWhileFiltering,
    paletteProps,
  };
}
