import { describe, expect, test } from "vitest";

import {
  formatPinnedFilterLabel,
  isFilterPinned,
  pinFilter,
  pinnedFilterFingerprint,
  unpinFilter,
  type PinnedFilterChip,
} from "./use-pinned-filters";

const trait1Firefly: PinnedFilterChip = {
  categoryId: "trait1",
  categoryLabel: "Trait 1",
  value: "Firefly",
  valueId: "firefly",
};

const trait2Surrounded: PinnedFilterChip = {
  categoryId: "trait2",
  categoryLabel: "Trait 2",
  value: "Surrounded",
  valueId: "surrounded",
};

describe("formatPinnedFilterLabel", () => {
  test("joins multiple chips", () => {
    expect(formatPinnedFilterLabel([trait1Firefly, trait2Surrounded])).toBe(
      "Trait 1: Firefly · Trait 2: Surrounded",
    );
  });
});

describe("pinFilter", () => {
  test("prepends and dedupes by fingerprint", () => {
    const existing = pinFilter([], "weapon", [trait1Firefly]);
    const updated = pinFilter(existing, "weapon", [trait2Surrounded, trait1Firefly]);

    expect(updated).toHaveLength(2);
    expect(updated[0]?.chips).toEqual([trait2Surrounded, trait1Firefly]);
    expect(updated[1]?.chips).toEqual([trait1Firefly]);
  });

  test("fingerprint is order-independent", () => {
    const a = pinnedFilterFingerprint("weapon", [trait1Firefly, trait2Surrounded]);
    const b = pinnedFilterFingerprint("weapon", [trait2Surrounded, trait1Firefly]);
    expect(a).toBe(b);
  });
});

describe("isFilterPinned", () => {
  test("detects pinned combo", () => {
    const filters = pinFilter([], "weapon", [trait1Firefly, trait2Surrounded]);
    expect(isFilterPinned(filters, "weapon", [trait2Surrounded, trait1Firefly])).toBe(true);
    expect(isFilterPinned(filters, "armor", [trait1Firefly, trait2Surrounded])).toBe(false);
  });
});

describe("unpinFilter", () => {
  test("removes by id", () => {
    const filters = pinFilter([], "weapon", [trait1Firefly]);
    const id = filters[0]!.id;
    expect(unpinFilter(filters, id)).toEqual([]);
  });
});
