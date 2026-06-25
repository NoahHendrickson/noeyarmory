// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePaletteResultList } from "./use-palette-result-list";

type Item = { id: string; label: string };

describe("usePaletteResultList", () => {
  it("maps shown items to results ids", () => {
    const shown: Item[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    const { result } = renderHook(() =>
      usePaletteResultList({
        shown,
        previewItems: [],
        resultCount: 2,
        shownCount: 2,
        getId: (item) => item.id,
        renderRow: (item) => item.label,
        resetPaginationDeps: [],
        setShowAllResults: vi.fn(),
      }),
    );
    expect(result.current.results).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("shows footer when resultCount exceeds shownCount", () => {
    const setShowAllResults = vi.fn();
    const { result } = renderHook(() =>
      usePaletteResultList({
        shown: [{ id: "a", label: "A" }],
        previewItems: [],
        resultCount: 5,
        shownCount: 1,
        getId: (item) => item.id,
        renderRow: (item) => item.label,
        resetPaginationDeps: [],
        setShowAllResults,
      }),
    );
    expect(result.current.resultsFooter).not.toBeUndefined();
  });

  it("resets showAllResults when resetPaginationDeps change", () => {
    const setShowAllResults = vi.fn();
    const { rerender } = renderHook(
      ({ deps }) =>
        usePaletteResultList({
          shown: [],
          previewItems: [],
          resultCount: 0,
          shownCount: 0,
          getId: (item: Item) => item.id,
          renderRow: (item: Item) => item.label,
          resetPaginationDeps: deps,
          setShowAllResults,
        }),
      { initialProps: { deps: ["q1"] as readonly unknown[] } },
    );
    rerender({ deps: ["q2"] });
    expect(setShowAllResults).toHaveBeenCalledWith(false);
  });
});
