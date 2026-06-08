import { describe, expect, it, vi } from "vitest";

import { ditherPixelSizeForViewport } from "./shader-dither-size";

describe("ditherPixelSizeForViewport", () => {
  it("scales from the 1920px baseline", () => {
    expect(ditherPixelSizeForViewport(1920)).toBe(5);
    expect(ditherPixelSizeForViewport(960)).toBe(3);
  });

  it("uses finer grain on native QHD panels", () => {
    vi.stubGlobal("window", { screen: { width: 2560, height: 1440 } });
    expect(ditherPixelSizeForViewport(2560)).toBe(4);
    vi.unstubAllGlobals();
  });

  it("clamps to configured bounds", () => {
    expect(ditherPixelSizeForViewport(480)).toBe(2);
    expect(ditherPixelSizeForViewport(6000)).toBe(12);
  });
});
