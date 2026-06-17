import { describe, expect, test } from "vitest";

import type { PaletteChip } from "@repo/ui";

import { DAMAGE_PERKS_LABEL, DAMAGE_PERKS_VALUE_ID, PERK_COMBO_CATEGORY_ID } from "./constants";
import { chipsToArmorFilters, chipsToWeaponFilters, withHypotheticalChip } from "./weapon-filters";

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

  test("maps the damage-perks sentinel chip to the boolean trait filter", () => {
    const chip = (categoryId: string): PaletteChip => ({
      id: `${categoryId}:${DAMAGE_PERKS_VALUE_ID}`,
      categoryId,
      categoryLabel: categoryId === "trait1" ? "Trait 1" : "Trait 2",
      value: DAMAGE_PERKS_LABEL,
      valueId: DAMAGE_PERKS_VALUE_ID,
    });
    expect(chipsToWeaponFilters([chip("trait1")], [])).toEqual({ trait1DamagePerks: true });
    expect(chipsToWeaponFilters([chip("trait2")], [])).toEqual({ trait2DamagePerks: true });
  });

  test("damage-perks sentinel does not leak into the trait name arrays", () => {
    const chips: PaletteChip[] = [
      {
        id: `trait1:${DAMAGE_PERKS_VALUE_ID}`,
        categoryId: "trait1",
        categoryLabel: "Trait 1",
        value: DAMAGE_PERKS_LABEL,
        valueId: DAMAGE_PERKS_VALUE_ID,
      },
      {
        id: "trait2:frenzy",
        categoryId: "trait2",
        categoryLabel: "Trait 2",
        value: "Frenzy",
        valueId: "frenzy",
      },
    ];
    expect(chipsToWeaponFilters(chips, [])).toEqual({
      trait1DamagePerks: true,
      trait2: ["Frenzy"],
    });
  });

  test("maps Perk Combo chips to the combo filter array", () => {
    const chips: PaletteChip[] = [
      {
        id: `${PERK_COMBO_CATEGORY_ID}:repulsor-brace`,
        categoryId: PERK_COMBO_CATEGORY_ID,
        categoryLabel: "Perk Combo",
        value: "Repulsor Brace",
        valueId: "repulsor-brace",
      },
      {
        id: `${PERK_COMBO_CATEGORY_ID}:destabilizing-rounds`,
        categoryId: PERK_COMBO_CATEGORY_ID,
        categoryLabel: "Perk Combo",
        value: "Destabilizing Rounds",
        valueId: "destabilizing-rounds",
      },
    ];

    expect(chipsToWeaponFilters(chips, [])).toEqual({
      perkCombo: ["Repulsor Brace", "Destabilizing Rounds"],
    });
  });
});

describe("withHypotheticalChip", () => {
  test("damage-perks sentinel sets the boolean filter instead of a name", () => {
    expect(
      withHypotheticalChip({}, "trait1", DAMAGE_PERKS_LABEL, DAMAGE_PERKS_VALUE_ID, []),
    ).toEqual({ trait1DamagePerks: true });
    expect(
      withHypotheticalChip(
        { trait1: ["Frenzy"] },
        "trait2",
        DAMAGE_PERKS_LABEL,
        DAMAGE_PERKS_VALUE_ID,
        [],
      ),
    ).toEqual({ trait1: ["Frenzy"], trait2DamagePerks: true });
  });

  test("regular perk values still append to the trait array", () => {
    expect(withHypotheticalChip({}, "trait1", "Frenzy", "frenzy", [])).toEqual({
      trait1: ["Frenzy"],
    });
  });

  test("Perk Combo preview appends to the combo filter array", () => {
    expect(
      withHypotheticalChip(
        { perkCombo: ["Repulsor Brace"] },
        PERK_COMBO_CATEGORY_ID,
        "Destabilizing Rounds",
        "destabilizing-rounds",
        [],
      ),
    ).toEqual({ perkCombo: ["Repulsor Brace", "Destabilizing Rounds"] });
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

  test("maps duplicate yes/no chips to the boolean filter", () => {
    expect(
      chipsToArmorFilters([
        {
          id: "duplicate:yes",
          categoryId: "duplicate",
          categoryLabel: "Duplicate",
          value: "Yes",
          valueId: "yes",
        },
      ]),
    ).toEqual({ isDupe: true });
    expect(
      chipsToArmorFilters([
        {
          id: "duplicate:no",
          categoryId: "duplicate",
          categoryLabel: "Duplicate",
          value: "No",
          valueId: "no",
        },
      ]),
    ).toEqual({ isDupe: false });
  });
});
