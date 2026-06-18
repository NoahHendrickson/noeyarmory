import { describe, expect, test } from "vitest";

import type { PaletteCategory } from "../components/command-palette/types";
import { categoryIsFull, filterCategories, scanValueSuggestions } from "./palette-suggestions";

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

  test("category priority beats popularity for equal-rank matches", () => {
    const trait1: PaletteCategory = {
      id: "trait1",
      label: "Trait 1",
      inlineSuggestionPriority: 0,
      getValues: () => [{ id: "destabilizing-rounds", label: "Destabilizing Rounds", hint: "32" }],
    };
    const trait2: PaletteCategory = {
      id: "trait2",
      label: "Trait 2",
      inlineSuggestionPriority: 1,
      getValues: () => [{ id: "destabilizing-rounds", label: "Destabilizing Rounds", hint: "146" }],
    };
    const combo: PaletteCategory = {
      id: "perkCombo",
      label: "Perk Combo",
      inlineSuggestionPriority: 3,
      getValues: () => [{ id: "destabilizing-rounds", label: "Destabilizing Rounds", hint: "178" }],
    };

    const suggestions = scanValueSuggestions([combo, trait2, trait1], "destabilizing", []);

    expect(suggestions.map((s) => s.categoryId)).toEqual(["trait1", "trait2", "perkCombo"]);
  });

  test("matchCategoryListByValues keeps facet categories visible while typing", () => {
    const source: PaletteCategory = {
      id: "source",
      label: "Source",
      matchCategoryListByValues: true,
      getValues: (q) =>
        q.toLowerCase().includes("root")
          ? [{ id: "ron", label: "Root of Nightmares", hint: "13" }]
          : [],
    };
    const element: PaletteCategory = {
      id: "element",
      label: "Element",
      getValues: () => [{ id: "arc", label: "Arc", hint: "10" }],
    };

    expect(filterCategories([source, element], "root").map((c) => c.id)).toEqual(["source"]);
  });

  test("per-category inlineMaxRank allows contains matches for raids", () => {
    const source: PaletteCategory = {
      id: "source",
      label: "Source",
      inlineMaxRank: 3,
      getValues: () => [{ id: "ron", label: "Root of Nightmares", hint: "13" }],
    };

    const suggestions = scanValueSuggestions([source], "nightmares", [], { maxRank: 2 });

    expect(suggestions.map((s) => s.value)).toEqual(["Root of Nightmares"]);
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
});

describe("categoryIsFull", () => {
  test("maxSelections keeps a category available until its selection limit", () => {
    const category: PaletteCategory = {
      id: "perkCombo",
      label: "Perk Combo",
      maxSelections: 2,
      getValues: () => [],
    };

    expect(
      categoryIsFull(category, [
        {
          id: "perkCombo:repulsor-brace",
          categoryId: "perkCombo",
          categoryLabel: "Perk Combo",
          value: "Repulsor Brace",
          valueId: "repulsor-brace",
        },
      ]),
    ).toBe(false);
    expect(
      categoryIsFull(category, [
        {
          id: "perkCombo:repulsor-brace",
          categoryId: "perkCombo",
          categoryLabel: "Perk Combo",
          value: "Repulsor Brace",
          valueId: "repulsor-brace",
        },
        {
          id: "perkCombo:destabilizing-rounds",
          categoryId: "perkCombo",
          categoryLabel: "Perk Combo",
          value: "Destabilizing Rounds",
          valueId: "destabilizing-rounds",
        },
      ]),
    ).toBe(true);
  });
});
