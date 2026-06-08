import { describe, expect, test } from "vitest";

import { isWeaponPerkFilterCategory, WEAPON_PERK_FILTER_CATEGORY_IDS } from "./weapon-categories";

describe("isWeaponPerkFilterCategory", () => {
  test("is true for the trait and origin perk columns", () => {
    expect(isWeaponPerkFilterCategory("trait1")).toBe(true);
    expect(isWeaponPerkFilterCategory("trait2")).toBe(true);
    expect(isWeaponPerkFilterCategory("originTrait")).toBe(true);
  });

  test("is false for non-perk facet and meta categories", () => {
    for (const id of ["type", "element", "slot", "ammo", "name", "customFilter"]) {
      expect(isWeaponPerkFilterCategory(id)).toBe(false);
    }
  });

  test("covers exactly the published perk-filter category ids", () => {
    expect([...WEAPON_PERK_FILTER_CATEGORY_IDS]).toEqual(["trait1", "trait2", "originTrait"]);
    for (const id of WEAPON_PERK_FILTER_CATEGORY_IDS) {
      expect(isWeaponPerkFilterCategory(id)).toBe(true);
    }
  });
});
