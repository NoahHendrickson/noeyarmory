"use client";

import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";

export interface UsePaletteResultListParams<T> {
  /** Full result set (already filtered/sorted by palette state hook). */
  shown: readonly T[];
  /** Preview subset while panel is open but results pane hidden. */
  previewItems: readonly T[];
  /** Total match count (may exceed shown.length when paginated). */
  resultCount: number;
  /** Count currently displayed (before "show all"). */
  shownCount: number;
  /** Stable id for each item. */
  getId: (item: T) => string;
  /** Row renderer; hook passes resolved item or null. */
  renderRow: (item: T) => ReactNode;
  /** When true, keep last non-empty preview map for transition stability (weapon palette). */
  stickyPreview?: boolean;
  /** Reset pagination when search inputs change. */
  resetPaginationDeps: readonly unknown[];
  showAllResults: boolean;
  setShowAllResults: (value: boolean) => void;
}

export interface UsePaletteResultListResult {
  results: { id: string }[];
  previewResults: { id: string }[];
  renderResult: (id: string) => ReactNode;
  resultsFooter: ReactNode | undefined;
}

export function usePaletteResultList<T>({
  shown,
  previewItems,
  resultCount,
  shownCount,
  getId,
  renderRow,
  stickyPreview = false,
  resetPaginationDeps,
  setShowAllResults,
}: UsePaletteResultListParams<T>): UsePaletteResultListResult {
  const resultIds = useMemo(() => shown.map(getId), [shown, getId]);
  const previewIds = useMemo(() => previewItems.map(getId), [previewItems, getId]);

  const byId = useMemo(
    () => new Map(shown.map((item) => [getId(item), item] as const)),
    [shown, getId],
  );
  const previewById = useMemo(
    () => new Map(previewItems.map((item) => [getId(item), item] as const)),
    [previewItems, getId],
  );

  const lastPreviewByIdRef = useRef<ReadonlyMap<string, T>>(new Map());

  useEffect(() => {
    if (stickyPreview && previewById.size > 0) {
      lastPreviewByIdRef.current = previewById;
    }
  }, [stickyPreview, previewById]);

  const renderResult = useCallback(
    (id: string) => {
      const item =
        byId.get(id) ??
        previewById.get(id) ??
        (stickyPreview ? lastPreviewByIdRef.current.get(id) : undefined);
      if (!item) return null;
      return renderRow(item);
    },
    [byId, previewById, stickyPreview, renderRow],
  );

  useEffect(() => {
    setShowAllResults(false);
    // resetPaginationDeps is the dependency list from the caller (chips, query, sort, etc.)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional spread from caller
  }, resetPaginationDeps);

  const results = useMemo(() => resultIds.map((id) => ({ id })), [resultIds]);
  const previewResults = useMemo(() => previewIds.map((id) => ({ id })), [previewIds]);

  const resultsFooter =
    resultCount > shownCount
      ? createElement(
          "button",
          {
            type: "button",
            "data-palette-ignore-close": true,
            className: "w-full cursor-pointer transition-colors hover:text-foreground",
            onClick: (event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              setShowAllResults(true);
            },
          },
          `Showing ${shownCount} of ${resultCount}`,
        )
      : undefined;

  return { results, previewResults, renderResult, resultsFooter };
}
