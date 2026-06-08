import { useEffect } from "react";

import { firstSelectableIndex } from "./palette-reducer";
import type { ListMode, PaletteItem, PaletteReducerAction, PaletteResultItem } from "./types";

export interface UsePaletteListSelectionParams {
  open: boolean;
  mode: ListMode | null;
  categoryId: string | null;
  valueQuery: string;
  query: string;
  chipsLength: number;
  results: PaletteResultItem[];
  previewsMounted: boolean;
  openForPreviews: boolean;
  previewResults: PaletteResultItem[];
  categoryActionIds: string[];
  recentItemIds: string[];
  items: PaletteItem[];
  dispatch: React.Dispatch<PaletteReducerAction>;
  setHoverIndex: (index: number) => void;
}

/** Reset keyboard/hover selection when list semantics change — not when `items` reference churns. */
export function usePaletteListSelection({
  open,
  mode,
  categoryId,
  valueQuery,
  query,
  chipsLength,
  results,
  previewsMounted,
  openForPreviews,
  previewResults,
  categoryActionIds,
  recentItemIds,
  items,
  dispatch,
  setHoverIndex,
}: UsePaletteListSelectionParams) {
  const resultsOrderKey =
    mode === "results" ? results.map((result) => result.id).join("\u0000") : "";
  const previewOrderKey =
    previewsMounted && openForPreviews
      ? previewResults.map((result) => result.id).join("\u0000")
      : "";
  const actionsOrderKey = categoryActionIds.join("\u0000");
  const recentOrderKey = recentItemIds.join("\u0000");

  useEffect(() => {
    if (!open) return;
    dispatch({ type: "setActive", index: firstSelectableIndex(items) });
    setHoverIndex(-1);
    // Intentionally omit `items` — its reference churns when unrelated palette deps
    // change (e.g. preview rows while in results mode), which would reset selection
    // on every render and break arrow-key / hover navigation.
  }, [
    open,
    mode,
    categoryId,
    valueQuery,
    query,
    results.length,
    chipsLength,
    resultsOrderKey,
    previewOrderKey,
    actionsOrderKey,
    recentOrderKey,
    dispatch,
    setHoverIndex,
  ]);
}
