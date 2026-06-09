import { describe, expect, test } from "vitest";

import { sampleWeapons } from "./fixtures/sample-weapons";
import { internWeaponCatalog } from "./intern-weapons";
import { parseWeaponQuery } from "./query-language";
import { filterWeapons } from "./search";

describe("parseWeaponQuery", () => {
  test("plain text passes through with no filters", () => {
    expect(parseWeaponQuery("fatebringer")).toEqual({ filters: {}, text: "fatebringer" });
  });

  test("facet keywords map onto OR-within arrays", () => {
    const { filters, text } = parseWeaponQuery('element:solar type:"hand cannon" ammo:special');
    expect(filters.element).toEqual(["solar"]);
    expect(filters.ammo).toEqual(["special"]);
    expect(filters.type).toEqual(["hand cannon"]);
    expect(text).toBe("");
  });

  test("type alias expansion (hc → hand cannon)", () => {
    const { filters } = parseWeaponQuery("type:hc");
    expect(filters.type).toEqual(["hand cannon"]);
  });

  test("quoted multi-word values stay intact", () => {
    const { filters } = parseWeaponQuery('perk:"kill clip" trait1:"frenzy"');
    expect(filters.perks).toEqual(["kill clip"]);
    expect(filters.trait1).toEqual(["frenzy"]);
  });

  test("is: flags set adept, craftable, and rarity", () => {
    expect(parseWeaponQuery("is:adept").filters.adept).toBe(true);
    expect(parseWeaponQuery("not:adept").filters.adept).toBe(false);
    expect(parseWeaponQuery("is:craftable").filters.craftable).toEqual(["Yes"]);
    expect(parseWeaponQuery("is:exotic").filters.rarity).toEqual(["exotic"]);
  });

  test("craftable:yes/no normalizes", () => {
    expect(parseWeaponQuery("craftable:yes").filters.craftable).toEqual(["Yes"]);
    expect(parseWeaponQuery("craftable:no").filters.craftable).toEqual(["No"]);
  });

  test("repeated facet keys accumulate (OR within)", () => {
    const { filters } = parseWeaponQuery("element:solar element:arc");
    expect(filters.element).toEqual(["solar", "arc"]);
  });

  test("unknown keys fall through to free text", () => {
    const { filters, text } = parseWeaponQuery("foo:bar baz");
    expect(filters).toEqual({});
    expect(text).toBe("foo:bar baz");
  });

  test("parsed element filter drives filterWeapons against the sample catalog", () => {
    const { index } = internWeaponCatalog(sampleWeapons, "sample");
    const weapons = index.weapons;
    const { filters } = parseWeaponQuery("element:solar");
    const byElement = filterWeapons(weapons, { element: filters.element }, index.perks);
    expect(byElement.length).toBeGreaterThan(0);
    expect(byElement.every((w) => w.element.toLowerCase() === "solar")).toBe(true);
  });

  test("adept filter keeps only adept weapons", () => {
    const { index } = internWeaponCatalog(sampleWeapons, "sample");
    const weapons = index.weapons;
    const { filters } = parseWeaponQuery("is:adept");
    const adeptOnly = filterWeapons(weapons, filters, index.perks);
    expect(adeptOnly.every((w) => w.adept)).toBe(true);
  });
});
