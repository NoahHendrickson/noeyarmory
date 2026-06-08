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
      getValues: () => [{ id: "adaptive", label: "Adaptive Frame", hint: "10" }],
    };

    const suggestions = scanValueSuggestions([hidden, visible], "fate", []);

    expect(suggestions.some((s) => s.categoryId === "name")).toBe(false);
    expect(suggestions.some((s) => s.categoryId === "frame")).toBe(true);
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
});
