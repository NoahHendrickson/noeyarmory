import { describe, expect, test } from "vitest";

import { sampleArmor } from "./fixtures/sample-armor";
import {
  buildModMap,
  collectArmorFacets,
  collectArmorMods,
  filterArmor,
  fuzzySearchArmor,
  sortArmor,
} from "./armor-search";

const names = (items: { name: string }[]) => items.map((a) => a.name).sort();

describe("filterArmor", () => {
  test("slot facet (all helmets)", () => {
    expect(names(filterArmor(sampleArmor, { slot: ["Helmet"] }))).toEqual(["Virtuous Helm"]);
  });

  test("class facet (all hunter armor)", () => {
    expect(names(filterArmor(sampleArmor, { classType: ["Hunter"] }))).toEqual(["Virtuous Helm"]);
  });

  test("requires all selected mods (AND semantics)", () => {
    expect(names(filterArmor(sampleArmor, { mods: ["Harmonic Siphon", "Better Already"] }))).toEqual(
      ["Virtuous Helm"],
    );
  });
});

describe("fuzzySearchArmor", () => {
  test("finds armor by partial name", () => {
    expect(fuzzySearchArmor(sampleArmor, "starfire")[0]?.name).toBe("Starfire Protocol");
  });

  test("empty query returns everything", () => {
    expect(fuzzySearchArmor(sampleArmor, "")).toHaveLength(sampleArmor.length);
  });
});

describe("sortArmor", () => {
  test("sorts by name A–Z", () => {
    expect(names(sortArmor(sampleArmor, "name"))).toEqual([
      "Iron Will Gauntlets",
      "Starfire Protocol",
      "Virtuous Helm",
    ]);
  });
});

describe("armor facets + mods", () => {
  test("collectArmorFacets counts slots", () => {
    const byValue = Object.fromEntries(
      collectArmorFacets(sampleArmor).slot!.map((f) => [f.value, f.count]),
    );
    expect(byValue).toEqual({ Chest: 1, Gauntlets: 1, Helmet: 1 });
  });

  test("collectArmorMods counts armor per mod", () => {
    const mod = collectArmorMods(sampleArmor).find((m) => m.name === "Harmonic Siphon");
    expect(mod?.count).toBe(1);
  });

  test("buildModMap resolves mod hashes", () => {
    const map = buildModMap(sampleArmor);
    expect(map.get(202)?.name).toBe("Harmonic Siphon");
  });
});
