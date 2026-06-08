import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PANEL_TRANSITION_MS } from "./palette-reducer";
import { usePaletteAnimation } from "./use-palette-animation";

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
});
