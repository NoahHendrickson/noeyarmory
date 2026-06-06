import { describe, expect, test } from "vitest";

import { sampleWeapons } from "./fixtures/sample-weapons";
import {
  buildPerkMap,
  collectColumnPerks,
  collectFacets,
  collectPerks,
  filterWeapons,
  fuzzySearchWeapons,
  sortWeapons,
  weaponsWithPerk,
} from "./search";

const names = (ws: { name: string }[]) => ws.map((w) => w.name).sort();
const orderedNames = (ws: { name: string }[]) => ws.map((w) => w.name);

describe("filterWeapons", () => {
  test("element + type facets (all solar fusion rifles)", () => {
    const result = filterWeapons(sampleWeapons, {
      element: ["Solar"],
      type: ["Fusion Rifle"],
    });
    expect(names(result)).toEqual(["Sunlit Fusion"]);
  });

  test("single element facet (all solar weapons)", () => {
    const result = filterWeapons(sampleWeapons, { element: ["Solar"] });
    expect(names(result)).toEqual(["Sunlit Fusion", "Sunshot Scout"]);
  });

  test("requires all selected perks (AND semantics)", () => {
    const result = filterWeapons(sampleWeapons, {
      perks: ["Firefly", "Explosive Payload"],
    });
    // Both Fatebringer and Sunshot Scout can roll both perks.
    expect(names(result)).toEqual(["Fatebringer", "Sunshot Scout"]);
  });

  test("combines a facet with a perk", () => {
    const result = filterWeapons(sampleWeapons, {
      type: ["Fusion Rifle"],
      perks: ["Surrounded"],
    });
    expect(names(result)).toEqual(["Sunlit Fusion"]);
  });
});

describe("weaponsWithPerk", () => {
  test("reverse search by perk name (everything that can roll Surrounded)", () => {
    expect(names(weaponsWithPerk(sampleWeapons, "surrounded"))).toEqual([
      "Fatebringer",
      "Sunlit Fusion",
    ]);
  });

  test("reverse search by perk hash", () => {
    expect(names(weaponsWithPerk(sampleWeapons, 110))).toEqual(["Fatebringer"]);
  });
});

describe("fuzzySearchWeapons", () => {
  test("finds a weapon by partial name", () => {
    const result = fuzzySearchWeapons(sampleWeapons, "fate");
    expect(result[0]?.name).toBe("Fatebringer");
  });

  test("empty query returns everything", () => {
    expect(fuzzySearchWeapons(sampleWeapons, "")).toHaveLength(sampleWeapons.length);
  });
});

describe("facets + perks", () => {
  test("collectFacets counts elements", () => {
    const byValue = Object.fromEntries(
      collectFacets(sampleWeapons).element!.map((f) => [f.value, f.count]),
    );
    expect(byValue).toEqual({ Arc: 2, Solar: 2 });
  });

  test("collectPerks counts weapons per perk", () => {
    const firefly = collectPerks(sampleWeapons).find((p) => p.name === "Firefly");
    expect(firefly?.count).toBe(2); // Fatebringer + Sunshot Scout
  });
});

describe("position-aware trait, slot + origin filters", () => {
  test("trait2 matches only weapons whose SECOND trait column can roll it", () => {
    expect(names(filterWeapons(sampleWeapons, { trait2: ["Frenzy"] }))).toEqual(["Fatebringer"]);
  });

  test("trait1 does not match a perk that only appears in trait2", () => {
    // Frenzy is in Fatebringer's second trait column, so a trait1 filter excludes it.
    expect(filterWeapons(sampleWeapons, { trait1: ["Frenzy"] })).toEqual([]);
  });

  test("trait1 matches across weapons (Surrounded in the first trait column)", () => {
    expect(names(filterWeapons(sampleWeapons, { trait1: ["Surrounded"] }))).toEqual([
      "Fatebringer",
      "Sunlit Fusion",
    ]);
  });

  test("a single-trait weapon never matches a trait2 filter", () => {
    // Sunlit Fusion rolls Reservoir Burst in its only (first) trait column.
    expect(filterWeapons(sampleWeapons, { trait2: ["Reservoir Burst"] })).toEqual([]);
  });

  test("slot facet (all energy weapons)", () => {
    expect(names(filterWeapons(sampleWeapons, { slot: ["Energy"] }))).toEqual([
      "Stormcharge",
      "Sunlit Fusion",
    ]);
  });

  test("origin trait", () => {
    expect(names(filterWeapons(sampleWeapons, { originTrait: ["Vault of Glass"] }))).toEqual([
      "Fatebringer",
    ]);
  });
});

describe("collectColumnPerks", () => {
  test("splits trait1 vs trait2 by column position", () => {
    const { trait1, trait2, originTrait } = collectColumnPerks(sampleWeapons);
    const t1 = trait1.map((p) => p.name);
    const t2 = trait2.map((p) => p.name);
    expect(t2).toContain("Frenzy");
    expect(t2).not.toContain("Explosive Payload"); // Explosive Payload is a first-column perk
    expect(t1).toContain("Surrounded");
    expect(t1).toContain("Explosive Payload");
    expect(originTrait.map((p) => p.name)).toEqual(["Vault of Glass"]);
  });

  test("counts weapons per trait1 perk", () => {
    const { trait1 } = collectColumnPerks(sampleWeapons);
    // Firefly appears in Fatebringer + Sunshot Scout first trait columns.
    expect(trait1.find((p) => p.name === "Firefly")?.count).toBe(2);
  });
});

describe("sortWeapons", () => {
  test("alphabetical by name", () => {
    expect(orderedNames(sortWeapons(sampleWeapons, "name"))).toEqual([
      "Fatebringer",
      "Stormcharge",
      "Sunlit Fusion",
      "Sunshot Scout",
    ]);
  });

  test("newest season first", () => {
    expect(orderedNames(sortWeapons(sampleWeapons, "season-desc"))).toEqual([
      "Stormcharge",
      "Fatebringer",
      "Sunshot Scout",
      "Sunlit Fusion",
    ]);
  });

  test("oldest season first", () => {
    expect(orderedNames(sortWeapons(sampleWeapons, "season-asc"))).toEqual([
      "Sunlit Fusion",
      "Sunshot Scout",
      "Fatebringer",
      "Stormcharge",
    ]);
  });
});

describe("buildPerkMap", () => {
  test("maps each plug hash to its perk (used to resolve owned/instanced rolls)", () => {
    const map = buildPerkMap(sampleWeapons);
    expect(map.get(110)?.name).toBe("Surrounded");
    expect(map.get(106)?.name).toBe("Firefly");
    expect(map.get(100)?.name).toBe("Adaptive Frame");
    expect(map.size).toBeGreaterThan(10);
  });
});
