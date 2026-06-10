import { describe, expect, test } from "vitest";

import { sampleWeapons } from "./fixtures/sample-weapons";
import { internWeaponCatalog } from "./intern-weapons";
import { createWeaponSearcher } from "./search";

const { index } = internWeaponCatalog(sampleWeapons, "sample");
const weapons = index.weapons;
const searcher = createWeaponSearcher(weapons);

const names = (query: string, limit = 20) => searcher.search(query, limit).map((w) => w.name);

describe("createWeaponSearcher", () => {
  test("exact and prefix name queries rank the weapon first", () => {
    expect(names("fatebringer")[0]).toBe("Fatebringer");
    expect(names("fate")[0]).toBe("Fatebringer");
  });

  test("tolerates a single typo in a name term", () => {
    expect(names("fatebrnger")).toContain("Fatebringer"); // missing letter
    expect(names("stromcharge")).toContain("Stormcharge"); // transposition
    expect(names("stormchrge")).toContain("Stormcharge"); // missing letter
  });

  test("matches weapon type text", () => {
    const hits = names("fusion rifle");
    expect(hits).toContain("Sunlit Fusion");
    expect(hits).toContain("Stormcharge");
  });

  test("name hits rank above type/perk-only hits", () => {
    // "fusion" appears in the name "Sunlit Fusion" and the type of Stormcharge.
    const hits = names("fusion");
    expect(hits.indexOf("Sunlit Fusion")).toBeLessThan(hits.indexOf("Stormcharge"));
  });

  test("matches perk text", () => {
    const hits = names("firefly");
    expect(hits).toContain("Fatebringer");
    expect(hits).toContain("Sunshot Scout");
  });

  test("multi-term queries match out of order", () => {
    expect(names("rifle fusion")).toContain("Sunlit Fusion");
  });

  test("respects the result limit", () => {
    expect(searcher.search("e", 2)).toHaveLength(2);
  });

  test("empty query returns nothing (callers gate short queries)", () => {
    expect(searcher.search("", 20)).toEqual([]);
    expect(searcher.search("   ", 20)).toEqual([]);
  });

  test("excludes superseded legacy twins like the shipped catalog index did", () => {
    const withLegacy = [...weapons, { ...weapons[0]!, hash: 999, superseded: true }];
    const hits = createWeaponSearcher(withLegacy).search("fatebringer", 20);
    expect(hits.map((w) => w.hash)).not.toContain(999);
  });

  test("no match returns an empty list", () => {
    expect(names("zzzzqqqq")).toEqual([]);
  });
});
