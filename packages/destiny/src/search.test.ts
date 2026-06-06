import { describe, expect, test } from "vitest";

import { sampleWeapons } from "./fixtures/sample-weapons";
import {
  buildPerkMap,
  collectFacets,
  collectPerks,
  filterWeapons,
  fuzzySearchWeapons,
  weaponsWithPerk,
} from "./search";

const names = (ws: { name: string }[]) => ws.map((w) => w.name).sort();

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

describe("buildPerkMap", () => {
  test("maps each plug hash to its perk (used to resolve owned/instanced rolls)", () => {
    const map = buildPerkMap(sampleWeapons);
    expect(map.get(110)?.name).toBe("Surrounded");
    expect(map.get(106)?.name).toBe("Firefly");
    expect(map.get(100)?.name).toBe("Adaptive Frame");
    expect(map.size).toBeGreaterThan(10);
  });
});
