import { describe, expect, test } from "vitest";

import {
  collectOwnedArmorFacets,
  filterOwnedArmor,
  searchOwnedArmor,
  sortOwnedArmor,
  type OwnedArmorSearchItem,
} from "./owned-armor-search";

const sampleOwned: OwnedArmorSearchItem[] = [
  {
    name: "Virtuous Helm",
    classType: "Hunter",
    setName: "Virtuous",
    archetype: "Paragon",
    tertiaryStat: "Melee",
    tunableStat: "Grenade",
    isArmor30: true,
  },
  {
    name: "Iron Will Gauntlets",
    classType: "Titan",
    isArmor30: false,
  },
  {
    name: "Starfire Protocol",
    classType: "Warlock",
    isArmor30: false,
  },
];

describe("filterOwnedArmor", () => {
  test("class facet", () => {
    expect(filterOwnedArmor(sampleOwned, { classType: ["Hunter"] }).map((a) => a.name)).toEqual([
      "Virtuous Helm",
    ]);
  });

  test("archetype facet requires Armor 3.0 match path in facets only", () => {
    expect(
      filterOwnedArmor(sampleOwned, { archetype: ["Paragon"] }).map((a) => a.name),
    ).toEqual(["Virtuous Helm"]);
  });
});

describe("searchOwnedArmor", () => {
  test("finds by partial name", () => {
    expect(searchOwnedArmor(sampleOwned, "starfire")[0]?.name).toBe("Starfire Protocol");
  });

  test("finds by class", () => {
    expect(searchOwnedArmor(sampleOwned, "titan")[0]?.name).toBe("Iron Will Gauntlets");
  });
});

describe("sortOwnedArmor", () => {
  test("sorts by name", () => {
    expect(sortOwnedArmor(sampleOwned).map((a) => a.name)).toEqual([
      "Iron Will Gauntlets",
      "Starfire Protocol",
      "Virtuous Helm",
    ]);
  });
});

describe("collectOwnedArmorFacets", () => {
  test("counts class types", () => {
    const byValue = Object.fromEntries(
      collectOwnedArmorFacets(sampleOwned).classType!.map((f) => [f.value, f.count]),
    );
    expect(byValue).toEqual({ Hunter: 1, Titan: 1, Warlock: 1 });
  });
});
