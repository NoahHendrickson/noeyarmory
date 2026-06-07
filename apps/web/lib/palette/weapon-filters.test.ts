import { describe, expect, test } from "vitest";

import type { PaletteChip } from "@repo/ui";

import { chipsToArmorFilters, chipsToWeaponFilters } from "./weapon-filters";

describe("chipsToWeaponFilters", () => {
  test("maps facet chips to filter record", () => {
    const chips: PaletteChip[] = [
      {
        id: "element:arc",
        categoryId: "element",
        categoryLabel: "Element",
        value: "Arc",
        valueId: "arc",
      },
    ];
    expect(chipsToWeaponFilters(chips, [])).toEqual({ element: ["Arc"] });
  });

  test("expands custom filter chips into perk groups", () => {
    const chips: PaletteChip[] = [
      {
        id: "customFilter:reload",
        categoryId: "customFilter",
        categoryLabel: "Custom filters",
        value: "Reload perks",
        valueId: "reload",
      },
    ];
    expect(
      chipsToWeaponFilters(chips, [
        { id: "reload", name: "Reload perks", perkNames: ["Outlaw", "Feeding Frenzy"], createdAt: "", updatedAt: "" },
      ]),
    ).toEqual({ customPerkGroups: [["Outlaw", "Feeding Frenzy"]] });
  });
});

describe("chipsToArmorFilters", () => {
  test("maps armor facet chips", () => {
    const chips: PaletteChip[] = [
      {
        id: "classType:hunter",
        categoryId: "classType",
        categoryLabel: "Class",
        value: "Hunter",
        valueId: "hunter",
      },
    ];
    expect(chipsToArmorFilters(chips)).toEqual({ classType: ["Hunter"] });
  });
});
