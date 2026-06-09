import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PANEL_TRANSITION_MS } from "./palette-reducer";
import { usePaletteAnimation } from "./use-palette-animation";
import type { PaletteCategory, PaletteItem } from "./types";

describe("usePaletteAnimation", () => {
  it("fires onPreviewsReadyChange when open without deferral", () => {
    const onPreviewsReadyChange = vi.fn();

    renderHook(() =>
      usePaletteAnimation({
        open: true,
        query: "",
        chipsLength: 0,
        onPreviewsReadyChange,
      }),
    );

    expect(onPreviewsReadyChange).toHaveBeenCalledWith(true);
  });

  it("defers previews for draft query until the panel transition elapses", () => {
    vi.useFakeTimers();
    const onPreviewsReadyChange = vi.fn();

    const { result } = renderHook(() =>
      usePaletteAnimation({
        open: true,
        query: "surr",
        chipsLength: 0,
        onPreviewsReadyChange,
      }),
    );

    expect(result.current.previewResultsForItems).toBe(false);
    expect(onPreviewsReadyChange).toHaveBeenCalledWith(false);

    act(() => {
      vi.advanceTimersByTime(PANEL_TRANSITION_MS);
    });

    expect(result.current.previewResultsForItems).toBe(true);
    expect(onPreviewsReadyChange).toHaveBeenLastCalledWith(true);

    vi.useRealTimers();
  });

  it("preserves preview rows in the dormant reopen snapshot", () => {
    vi.useFakeTimers();
    const category: PaletteCategory = {
      id: "trait1",
      label: "Trait 1",
      getValues: () => [],
    };
    const items: PaletteItem[] = [
      {
        kind: "chipSuggestion",
        category,
        option: { id: "demolitionist", label: "Demolitionist" },
      },
      { kind: "section", id: "preview-divider", divider: true },
      { kind: "section", id: "preview", label: "Results" },
      { kind: "result", result: { id: "song-of-ir-yut" } },
    ];

    const { result } = renderHook(() =>
      usePaletteAnimation({
        open: false,
        query: "demolitionist",
        chipsLength: 0,
      }),
    );

    act(() => {
      result.current.beginCloseAnimation("categories", items);
      result.current.seedOpeningSnapshot();
    });

    expect(result.current.openingSnapshot?.items).toEqual(items);

    vi.useRealTimers();
  });

  it("keeps previews ready when reopening a dormant snapshot with preview rows", () => {
    vi.useFakeTimers();
    const onPreviewsReadyChange = vi.fn();
    const category: PaletteCategory = {
      id: "trait1",
      label: "Trait 1",
      getValues: () => [],
    };
    const items: PaletteItem[] = [
      {
        kind: "chipSuggestion",
        category,
        option: { id: "surrounded", label: "Surrounded" },
      },
      { kind: "section", id: "preview-divider", divider: true },
      { kind: "section", id: "preview", label: "Results" },
      { kind: "result", result: { id: "menotti-c" } },
    ];

    const { result, rerender } = renderHook(
      ({ open }) =>
        usePaletteAnimation({
          open,
          query: "surrounded",
          chipsLength: 0,
          onPreviewsReadyChange,
        }),
      { initialProps: { open: false } },
    );

    act(() => {
      result.current.beginCloseAnimation("categories", items);
      result.current.seedOpeningSnapshot();
    });
    rerender({ open: true });

    expect(result.current.previewResultsForItems).toBe(true);
    expect(result.current.openingSnapshot?.items).toEqual(items);

    act(() => {
      vi.advanceTimersByTime(PANEL_TRANSITION_MS);
    });

    expect(result.current.previewResultsForItems).toBe(true);
    expect(onPreviewsReadyChange).toHaveBeenLastCalledWith(true);

    vi.useRealTimers();
  });
});
