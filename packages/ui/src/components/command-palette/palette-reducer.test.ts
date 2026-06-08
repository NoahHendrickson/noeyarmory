import { describe, expect, it } from "vitest";

import {
  dormantSnapshotMatches,
  draftListMode,
  splitPreviewTail,
  stripPreviewItems,
} from "./palette-reducer";
import type { PaletteItem } from "./types";

describe("dormantSnapshotMatches", () => {
  it("returns true when query and chipsLength match", () => {
    expect(dormantSnapshotMatches({ query: "surr", chipsLength: 0 }, " surr ", 0)).toBe(true);
  });

  it("returns false when query differs", () => {
    expect(dormantSnapshotMatches({ query: "surr", chipsLength: 0 }, "", 0)).toBe(false);
    expect(dormantSnapshotMatches({ query: "surr", chipsLength: 0 }, "sur", 0)).toBe(false);
  });

  it("returns false when chipsLength differs", () => {
    expect(dormantSnapshotMatches({ query: "surr", chipsLength: 0 }, "surr", 1)).toBe(false);
  });
});

describe("draftListMode", () => {
  it("returns categories when draft query only", () => {
    expect(draftListMode(true, false, "demo", false)).toBe("categories");
  });

  it("returns null when not draft query only (idle or chip-only at call site)", () => {
    expect(draftListMode(false, false, "demo", false)).toBeNull();
    expect(draftListMode(false, false, "", false)).toBeNull();
  });
});

describe("splitPreviewTail", () => {
  it("splits preview tail from body items", () => {
    const items = [
      { kind: "chipSuggestion" as const, category: { id: "p", label: "Perk", getValues: () => [] }, option: { id: "1", label: "Demo" } },
      { kind: "section" as const, id: "preview-divider", divider: true },
      { kind: "section" as const, id: "preview", label: "Results" },
      { kind: "result" as const, result: { id: "w1" } },
    ] satisfies PaletteItem[];

    const { baseItems, previewItems } = splitPreviewTail(items);
    expect(baseItems).toHaveLength(1);
    expect(previewItems).toHaveLength(3);
  });
});

describe("stripPreviewItems", () => {
  it("removes preview section and trailing result rows", () => {
    const items = [
      { kind: "chipSuggestion" as const, category: { id: "p", label: "Perk", getValues: () => [] }, option: { id: "1", label: "Demo" } },
      { kind: "section" as const, id: "preview-divider", divider: true },
      { kind: "section" as const, id: "preview", label: "Results" },
      { kind: "result" as const, result: { id: "w1" } },
    ] satisfies PaletteItem[];

    expect(stripPreviewItems(items)).toHaveLength(1);
    expect(stripPreviewItems(items)[0]?.kind).toBe("chipSuggestion");
  });
});
