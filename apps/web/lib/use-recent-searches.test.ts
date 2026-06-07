import { describe, expect, test } from "vitest";

import {
  clearRecentSearchesForMode,
  createRecentSearchEntries,
  formatRecentSearchLabel,
  prependRecentSearches,
  removeRecentSearch,
  type RecentSearch,
  type RecentSearchChip,
} from "./use-recent-searches";

const trait2Surrounded: RecentSearchChip = {
  categoryId: "trait2",
  categoryLabel: "Trait 2",
  value: "Surrounded",
  valueId: "surrounded",
};

const weaponTypeFusion: RecentSearchChip = {
  categoryId: "weaponType",
  categoryLabel: "Weapon type",
  value: "Fusion Rifle",
  valueId: "fusion-rifle",
};

describe("createRecentSearchEntries", () => {
  test("creates one entry per filter chip", () => {
    const entries = createRecentSearchEntries("weapon", "", [trait2Surrounded, weaponTypeFusion], "t1");

    expect(entries).toHaveLength(2);
    expect(entries[0]?.chips).toEqual([trait2Surrounded]);
    expect(entries[1]?.chips).toEqual([weaponTypeFusion]);
    expect(entries.every((entry) => entry.query === "")).toBe(true);
  });

  test("creates a separate entry for text query", () => {
    const entries = createRecentSearchEntries("weapon", "fate", [trait2Surrounded], "t1");

    expect(entries).toHaveLength(2);
    expect(entries[0]?.chips).toEqual([trait2Surrounded]);
    expect(entries[1]?.query).toBe("fate");
    expect(entries[1]?.chips).toEqual([]);
  });

  test("returns nothing for empty search", () => {
    expect(createRecentSearchEntries("weapon", "", [])).toEqual([]);
  });
});

describe("formatRecentSearchLabel", () => {
  test("formats a single filter chip", () => {
    expect(formatRecentSearchLabel([trait2Surrounded], "")).toBe("Trait 2: Surrounded");
  });

  test("formats query-only search", () => {
    expect(formatRecentSearchLabel([], "fatebringer")).toBe("fatebringer");
  });
});

describe("prependRecentSearches", () => {
  test("dedupes and keeps one row per filter", () => {
    const existing: RecentSearch[] = [
      {
        id: "old",
        mode: "weapon",
        query: "",
        chips: [weaponTypeFusion],
        updatedAt: "t0",
      },
    ];
    const next = createRecentSearchEntries("weapon", "", [trait2Surrounded, weaponTypeFusion], "t1");
    const updated = prependRecentSearches(existing, next);

    expect(updated).toHaveLength(2);
    expect(updated[0]?.chips).toEqual([trait2Surrounded]);
    expect(updated[1]?.chips).toEqual([weaponTypeFusion]);
  });
});

describe("removeRecentSearch", () => {
  test("removes only the targeted entry", () => {
    const searches: RecentSearch[] = [
      {
        id: "a",
        mode: "weapon",
        query: "fate",
        chips: [],
        updatedAt: "t1",
      },
      {
        id: "b",
        mode: "weapon",
        query: "",
        chips: [trait2Surrounded],
        updatedAt: "t2",
      },
    ];

    expect(removeRecentSearch(searches, "a")).toEqual([searches[1]]);
  });
});

describe("clearRecentSearchesForMode", () => {
  test("removes only entries for the given mode", () => {
    const weaponSearch: RecentSearch = {
      id: "weapon",
      mode: "weapon",
      query: "fate",
      chips: [],
      updatedAt: "t1",
    };
    const armorSearch: RecentSearch = {
      id: "armor",
      mode: "armor",
      query: "helmet",
      chips: [],
      updatedAt: "t2",
    };

    expect(clearRecentSearchesForMode([weaponSearch, armorSearch], "weapon")).toEqual([
      armorSearch,
    ]);
    expect(clearRecentSearchesForMode([weaponSearch, armorSearch], "armor")).toEqual([
      weaponSearch,
    ]);
  });
});
