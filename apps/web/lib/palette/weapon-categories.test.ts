import { describe, expect, test } from "vitest";

import type { PerkOption } from "@repo/destiny";

import { DAMAGE_PERKS_LABEL, DAMAGE_PERKS_VALUE_ID, PERK_COMBO_CATEGORY_ID } from "./constants";
import {
  buildWeaponCategories,
  isWeaponPerkFilterCategory,
  perkCategory,
  WEAPON_PERK_FILTER_CATEGORY_IDS,
} from "./weapon-categories";

describe("isWeaponPerkFilterCategory", () => {
  test("is true for the trait and origin perk columns", () => {
    expect(isWeaponPerkFilterCategory("trait1")).toBe(true);
    expect(isWeaponPerkFilterCategory("trait2")).toBe(true);
    expect(isWeaponPerkFilterCategory("trait")).toBe(true);
    expect(isWeaponPerkFilterCategory(PERK_COMBO_CATEGORY_ID)).toBe(true);
    expect(isWeaponPerkFilterCategory("originTrait")).toBe(true);
  });

  test("is false for non-perk facet and meta categories", () => {
    for (const id of ["type", "element", "slot", "ammo", "name", "customFilter"]) {
      expect(isWeaponPerkFilterCategory(id)).toBe(false);
    }
  });

  test("covers exactly the published perk-filter category ids", () => {
    expect([...WEAPON_PERK_FILTER_CATEGORY_IDS]).toEqual([
      "trait1",
      "trait2",
      "trait",
      PERK_COMBO_CATEGORY_ID,
      "originTrait",
    ]);
    for (const id of WEAPON_PERK_FILTER_CATEGORY_IDS) {
      expect(isWeaponPerkFilterCategory(id)).toBe(true);
    }
  });
});

describe("buildWeaponCategories", () => {
  test("orders trait suggestions before perk combo and exposes a merged Trait category", () => {
    const categories = buildWeaponCategories(
      [],
      {
        trait1: [{ name: "Repulsor Brace", hash: 1, count: 4, currentlyCanRoll: true }],
        trait2: [{ name: "Destabilizing Rounds", hash: 2, count: 3, currentlyCanRoll: true }],
        originTrait: [],
      },
      [],
    );

    expect(categories.slice(0, 4).map((category) => category.id)).toEqual([
      "trait1",
      "trait2",
      "trait",
      PERK_COMBO_CATEGORY_ID,
    ]);

    const trait = categories.find((category) => category.id === "trait");
    expect(trait).toMatchObject({ label: "Trait", single: true, inlineSuggestionPriority: 2 });
    expect(trait?.getValues("").map((value) => value.label)).toEqual([
      "Repulsor Brace",
      "Destabilizing Rounds",
    ]);
  });

  test("adds a two-selection Perk Combo category from both trait columns", () => {
    const categories = buildWeaponCategories(
      [],
      {
        trait1: [{ name: "Repulsor Brace", hash: 1, count: 4, currentlyCanRoll: true }],
        trait2: [{ name: "Destabilizing Rounds", hash: 2, count: 3, currentlyCanRoll: true }],
        originTrait: [],
      },
      [],
    );

    const combo = categories.find((category) => category.id === PERK_COMBO_CATEGORY_ID);
    expect(combo).toMatchObject({ label: "Perk Combo", maxSelections: 2 });
    expect(combo?.getValues("").map((value) => value.label)).toEqual([
      "Repulsor Brace",
      "Destabilizing Rounds",
    ]);
  });

  test("lists known dungeon sources even before generated data has matching weapons", () => {
    const categories = buildWeaponCategories(
      [],
      {
        trait1: [],
        trait2: [],
        originTrait: [],
      },
      [],
    );

    const source = categories.find((category) => category.id === "source");
    expect(source?.getValues("shattered")).toContainEqual(
      expect.objectContaining({
        label: "The Shattered Throne",
        hint: "0",
      }),
    );
  });
});

describe("perkCategory damage-perks option", () => {
  const options: PerkOption[] = [
    { name: "Frenzy", hash: 1, count: 12, currentlyCanRoll: true },
    { name: "Outlaw", hash: 2, count: 30, currentlyCanRoll: true },
    { name: "Kill Clip", hash: 3, count: 8, currentlyCanRoll: true },
  ];
  const damageNames = new Set(["frenzy", "kill clip"]);

  test("prepends the pseudo-option with a per-column damage perk count", () => {
    const category = perkCategory("trait1", "Trait 1", options, null, damageNames);
    const values = category.getValues("");
    expect(values[0]).toMatchObject({
      id: DAMAGE_PERKS_VALUE_ID,
      label: DAMAGE_PERKS_LABEL,
      hint: "2 perks",
    });
    expect(values).toHaveLength(options.length + 1);
  });

  test("surfaces the pseudo-option when the query matches its label", () => {
    const category = perkCategory("trait1", "Trait 1", options, null, damageNames);
    expect(category.getValues("damage")[0]?.id).toBe(DAMAGE_PERKS_VALUE_ID);
    expect(category.getValues("outlaw").some((value) => value.id === DAMAGE_PERKS_VALUE_ID)).toBe(
      false,
    );
  });

  test("omitted when no damage perk names are provided or none match", () => {
    const withoutSet = perkCategory("trait1", "Trait 1", options, null);
    expect(withoutSet.getValues("").some((value) => value.id === DAMAGE_PERKS_VALUE_ID)).toBe(
      false,
    );
    const noMatches = perkCategory("trait1", "Trait 1", options, null, new Set(["vorpal weapon"]));
    expect(noMatches.getValues("").some((value) => value.id === DAMAGE_PERKS_VALUE_ID)).toBe(false);
  });
});
