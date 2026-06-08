import { describe, expect, it } from "vitest";

import {
  dormantSnapshotMatches,
  shouldDeferPreviews,
  splitPreviewTail,
  stripPreviewItems,
  valueSuggestionsToChipItems,
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

describe("shouldDeferPreviews", () => {
  it("returns true for draft query with no chips", () => {
    expect(shouldDeferPreviews(" surr ", 0)).toBe(true);
  });

  it("returns false when query is empty or chips are present", () => {
    expect(shouldDeferPreviews("", 0)).toBe(false);
    expect(shouldDeferPreviews("surr", 1)).toBe(false);
  });
});

describe("valueSuggestionsToChipItems", () => {
  it("maps suggestions to chipSuggestion rows", () => {
    const category = { id: "trait1", label: "Trait 1", getValues: () => [] };
    const items = valueSuggestionsToChipItems(
      [{ categoryId: "trait1", valueId: "surrounded", value: "Surrounded", hint: "50" }],
      [category],
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "chipSuggestion",
      category,
      option: { id: "surrounded", label: "Surrounded", hint: "50" },
    });
  });

  it("drops suggestions for unknown categories", () => {
    expect(
      valueSuggestionsToChipItems(
        [{ categoryId: "missing", valueId: "x", value: "X" }],
        [{ id: "trait1", label: "Trait 1", getValues: () => [] }],
      ),
    ).toEqual([]);
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
