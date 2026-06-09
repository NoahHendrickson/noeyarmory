import { describe, expect, test } from "vitest";

import type { PaletteCategory } from "../components/command-palette/types";
import { scanValueSuggestions } from "./palette-suggestions";

describe("scanValueSuggestions", () => {
  test("skips categories with inlineSuggestions false", () => {
    const hidden: PaletteCategory = {
      id: "name",
      label: "Exact Weapon",
      inlineSuggestions: false,
      getValues: () => [{ id: "fatebringer", label: "Fatebringer", hint: "2" }],
    };
    const visible: PaletteCategory = {
      id: "frame",
      label: "Frame",
      getValues: () => [{ id: "fate-frame", label: "Fate Frame", hint: "10" }],
    };

    const suggestions = scanValueSuggestions([hidden, visible], "fate", []);

    expect(suggestions.some((s) => s.categoryId === "name")).toBe(false);
    expect(suggestions.some((s) => s.categoryId === "frame")).toBe(true);
  });

  test("omits weak inline frame matches when omitWeakInlineMatches is set", () => {
    const frame: PaletteCategory = {
      id: "frame",
      label: "Frame",
      omitWeakInlineMatches: true,
      getValues: () => [
        { id: "fate-of-fools", label: "The Fate of All Fools", hint: "1" },
        { id: "fate-frame", label: "Fate Frame", hint: "2" },
      ],
    };
    const trait: PaletteCategory = {
      id: "trait1",
      label: "Trait 1",
      getValues: () => [{ id: "fatebringer", label: "Fatebringer", hint: "3" }],
    };

    const suggestions = scanValueSuggestions([frame, trait], "fate", []);

    expect(suggestions.map((s) => s.value)).toEqual(["Fatebringer", "Fate Frame"]);
    expect(suggestions.some((s) => s.value === "The Fate of All Fools")).toBe(false);
  });

  test("hidden category getValues still works for drill-down", () => {
    const hidden: PaletteCategory = {
      id: "name",
      label: "Exact Weapon",
      inlineSuggestions: false,
      getValues: (q) =>
        q.toLowerCase().includes("fate")
          ? [{ id: "fatebringer", label: "Fatebringer", hint: "2" }]
          : [],
    };

    expect(hidden.getValues("fate")).toEqual([
      { id: "fatebringer", label: "Fatebringer", hint: "2" },
    ]);
  });

  test("maxRank 2 allows word-boundary prefix but not contains matches", () => {
    const trait: PaletteCategory = {
      id: "trait1",
      label: "Trait 1",
      getValues: () => [
        { id: "rewind-rounds", label: "Rewind Rounds", hint: "50" },
        { id: "surrounded", label: "Surrounded", hint: "100" },
      ],
    };

    const suggestions = scanValueSuggestions([trait], "round", [], { maxRank: 2 });

    expect(suggestions.map((s) => s.value)).toEqual(["Rewind Rounds"]);
  });

  test("maxRank 2 excludes fuzzy-only matches", () => {
    const trait: PaletteCategory = {
      id: "trait1",
      label: "Trait 1",
      getValues: () => [{ id: "surrounded", label: "Surrounded", hint: "50", searchRank: 4 }],
    };

    const suggestions = scanValueSuggestions([trait], "suround", [], { maxRank: 2 });

    expect(suggestions).toEqual([]);
  });

  test("passes a per-category limit to predictive value scans", () => {
    const seenLimits: Array<number | undefined> = [];
    const trait: PaletteCategory = {
      id: "trait1",
      label: "Trait 1",
      getValues: (_query, options) => {
        seenLimits.push(options?.limit);
        return [
          { id: "firefly", label: "Firefly", hint: "30" },
          { id: "firing-line", label: "Firing Line", hint: "10" },
          { id: "frenzy", label: "Frenzy", hint: "20" },
        ].slice(0, options?.limit);
      },
    };

    const suggestions = scanValueSuggestions([trait], "fi", [], {
      limit: 5,
      perCategoryLimit: 2,
    });

    expect(seenLimits).toEqual([2]);
    expect(suggestions.map((s) => s.value)).toEqual(["Firefly", "Firing Line"]);
  });
});
