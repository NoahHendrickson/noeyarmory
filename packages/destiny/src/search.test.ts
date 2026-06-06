import { describe, expect, test } from "vitest";

import { sampleWeapons } from "./fixtures/sample-weapons";
import { buildPerkMapFromCatalog, internWeaponCatalog } from "./intern-weapons";
import {
  collectColumnPerks,
  collectFacets,
  collectPerks,
  filterWeapons,
  fuzzySearchWeapons,
  sortWeapons,
  weaponsWithPerk,
} from "./search";

const { index: sampleIndex } = internWeaponCatalog(sampleWeapons, "sample");
const sampleSummaries = sampleIndex.weapons;
const samplePerks = sampleIndex.perks;

const names = (ws: { name: string }[]) => ws.map((w) => w.name).sort();
const orderedNames = (ws: { name: string }[]) => ws.map((w) => w.name);

describe("filterWeapons", () => {
  test("element + type facets (all solar fusion rifles)", () => {
    const result = filterWeapons(
      sampleSummaries,
      { element: ["Solar"], type: ["Fusion Rifle"] },
      samplePerks,
    );
    expect(names(result)).toEqual(["Sunlit Fusion"]);
  });

  test("single element facet (all solar weapons)", () => {
    const result = filterWeapons(sampleSummaries, { element: ["Solar"] }, samplePerks);
    expect(names(result)).toEqual(["Sunlit Fusion", "Sunshot Scout"]);
  });

  test("requires all selected perks (AND semantics)", () => {
    const result = filterWeapons(
      sampleSummaries,
      { perks: ["Firefly", "Explosive Payload"] },
      samplePerks,
    );
    expect(names(result)).toEqual(["Fatebringer", "Sunshot Scout"]);
  });

  test("combines a facet with a perk", () => {
    const result = filterWeapons(
      sampleSummaries,
      { type: ["Fusion Rifle"], perks: ["Surrounded"] },
      samplePerks,
    );
    expect(names(result)).toEqual(["Sunlit Fusion"]);
  });
});

describe("weaponsWithPerk", () => {
  test("reverse search by perk name (everything that can roll Surrounded)", () => {
    expect(names(weaponsWithPerk(sampleSummaries, "surrounded"))).toEqual([
      "Fatebringer",
      "Sunlit Fusion",
    ]);
  });

  test("reverse search by perk hash", () => {
    expect(names(weaponsWithPerk(sampleSummaries, 110))).toEqual(["Fatebringer"]);
  });
});

describe("buildWeaponsByPerkName", () => {
  test("precomputed map on interned index matches runtime lookup", () => {
    expect(
      names(
        (sampleIndex.weaponsByPerkName.surrounded ?? [])
          .map((hash) => sampleSummaries.find((w) => w.hash === hash))
          .filter((w): w is (typeof sampleSummaries)[number] => w != null),
      ),
    ).toEqual(["Fatebringer", "Sunlit Fusion"]);
  });
});

describe("fuzzySearchWeapons", () => {
  test("finds a weapon by partial name", () => {
    const result = fuzzySearchWeapons(sampleSummaries, "fate");
    expect(result[0]?.name).toBe("Fatebringer");
  });

  test("empty query returns everything", () => {
    expect(fuzzySearchWeapons(sampleSummaries, "")).toHaveLength(sampleSummaries.length);
  });
});

describe("facets + perks", () => {
  test("collectFacets counts elements", () => {
    const byValue = Object.fromEntries(
      collectFacets(sampleSummaries).element!.map((f) => [f.value, f.count]),
    );
    expect(byValue).toEqual({ Arc: 2, Solar: 2 });
  });

  test("collectPerks counts weapons per perk", () => {
    const firefly = collectPerks(sampleSummaries, samplePerks).find((p) => p.name === "Firefly");
    expect(firefly?.count).toBe(2);
  });
});

describe("position-aware trait, slot + origin filters", () => {
  test("trait2 matches only weapons whose SECOND trait column can roll it", () => {
    expect(names(filterWeapons(sampleSummaries, { trait2: ["Frenzy"] }, samplePerks))).toEqual([
      "Fatebringer",
    ]);
  });

  test("trait1 does not match a perk that only appears in trait2", () => {
    expect(filterWeapons(sampleSummaries, { trait1: ["Frenzy"] }, samplePerks)).toEqual([]);
  });

  test("trait1 matches across weapons (Surrounded in the first trait column)", () => {
    expect(names(filterWeapons(sampleSummaries, { trait1: ["Surrounded"] }, samplePerks))).toEqual([
      "Fatebringer",
      "Sunlit Fusion",
    ]);
  });

  test("a single-trait weapon never matches a trait2 filter", () => {
    expect(filterWeapons(sampleSummaries, { trait2: ["Reservoir Burst"] }, samplePerks)).toEqual(
      [],
    );
  });

  test("slot facet (all energy weapons)", () => {
    expect(names(filterWeapons(sampleSummaries, { slot: ["Energy"] }, samplePerks))).toEqual([
      "Stormcharge",
      "Sunlit Fusion",
    ]);
  });

  test("origin trait", () => {
    expect(
      names(filterWeapons(sampleSummaries, { originTrait: ["Vault of Glass"] }, samplePerks)),
    ).toEqual(["Fatebringer"]);
  });
});

describe("collectColumnPerks", () => {
  test("splits trait1 vs trait2 by column position", () => {
    const { trait1, trait2, originTrait } = collectColumnPerks(sampleSummaries, samplePerks);
    const t1 = trait1.map((p) => p.name);
    const t2 = trait2.map((p) => p.name);
    expect(t2).toContain("Frenzy");
    expect(t2).not.toContain("Explosive Payload");
    expect(t1).toContain("Surrounded");
    expect(t1).toContain("Explosive Payload");
    expect(originTrait.map((p) => p.name)).toEqual(["Vault of Glass"]);
  });

  test("counts weapons per trait1 perk", () => {
    const { trait1 } = collectColumnPerks(sampleSummaries, samplePerks);
    expect(trait1.find((p) => p.name === "Firefly")?.count).toBe(2);
  });
});

describe("sortWeapons", () => {
  test("alphabetical by name", () => {
    expect(orderedNames(sortWeapons(sampleSummaries, "name"))).toEqual([
      "Fatebringer",
      "Stormcharge",
      "Sunlit Fusion",
      "Sunshot Scout",
    ]);
  });

  test("newest season first", () => {
    expect(orderedNames(sortWeapons(sampleSummaries, "season-desc"))).toEqual([
      "Stormcharge",
      "Fatebringer",
      "Sunshot Scout",
      "Sunlit Fusion",
    ]);
  });

  test("oldest season first", () => {
    expect(orderedNames(sortWeapons(sampleSummaries, "season-asc"))).toEqual([
      "Sunlit Fusion",
      "Sunshot Scout",
      "Fatebringer",
      "Stormcharge",
    ]);
  });
});

describe("buildPerkMapFromCatalog", () => {
  test("maps each plug hash to its perk (used to resolve owned/instanced rolls)", () => {
    const map = buildPerkMapFromCatalog(samplePerks);
    expect(map.get(110)?.name).toBe("Surrounded");
    expect(map.get(106)?.name).toBe("Firefly");
    expect(map.get(100)?.name).toBe("Adaptive Frame");
    expect(map.size).toBeGreaterThan(10);
  });
});
