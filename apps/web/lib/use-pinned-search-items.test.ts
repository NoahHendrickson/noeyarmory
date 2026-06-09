import { describe, expect, it } from "vitest";

import {
  emptyPinnedSearchItems,
  hasPinnedFilter,
  hasPinnedWeaponHash,
  normalizePinnedSearchItems,
  removePinnedFilter,
  removePinnedWeaponHash,
  togglePinnedFilter,
  togglePinnedWeaponHash,
  type PinnedFilter,
} from "./use-pinned-search-items";

const FILTER: PinnedFilter = {
  categoryId: "trait1",
  categoryLabel: "Trait 1",
  value: "Firefly",
  valueId: "firefly",
};

describe("normalizePinnedSearchItems", () => {
  it("keeps valid pins and drops malformed entries", () => {
    const normalized = normalizePinnedSearchItems({
      filters: [
        FILTER,
        FILTER,
        { categoryId: "", categoryLabel: "Trait 2", value: "Surrounded", valueId: "surrounded" },
        {
          categoryId: "type",
          categoryLabel: "Weapon type",
          value: "Hand Cannon",
          valueId: "hand cannon",
        },
      ],
      weaponHashes: [1, 1, 0, -4, 2, "3"],
    });

    expect(normalized).toEqual({
      filters: [
        FILTER,
        {
          categoryId: "type",
          categoryLabel: "Weapon type",
          value: "Hand Cannon",
          valueId: "hand cannon",
        },
      ],
      weaponHashes: [1, 2],
    });
  });

  it("returns empty pins for non-object input", () => {
    expect(normalizePinnedSearchItems(null)).toEqual(emptyPinnedSearchItems());
    expect(normalizePinnedSearchItems([])).toEqual(emptyPinnedSearchItems());
  });
});

describe("filter pin helpers", () => {
  it("toggles and removes filter pins by category/value", () => {
    const pinned = togglePinnedFilter(emptyPinnedSearchItems(), FILTER);
    expect(hasPinnedFilter(pinned.filters, FILTER)).toBe(true);

    const removedByToggle = togglePinnedFilter(pinned, FILTER);
    expect(removedByToggle.filters).toEqual([]);

    const removed = removePinnedFilter(pinned, FILTER);
    expect(removed.filters).toEqual([]);
  });
});

describe("weapon pin helpers", () => {
  it("toggles and removes weapon hash pins", () => {
    const pinned = togglePinnedWeaponHash(emptyPinnedSearchItems(), 1);
    expect(hasPinnedWeaponHash(pinned.weaponHashes, 1)).toBe(true);

    const removedByToggle = togglePinnedWeaponHash(pinned, 1);
    expect(removedByToggle.weaponHashes).toEqual([]);

    const removed = removePinnedWeaponHash(pinned, 1);
    expect(removed.weaponHashes).toEqual([]);
  });
});
