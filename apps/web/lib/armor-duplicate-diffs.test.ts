import { describe, expect, test } from "vitest";

import { buildArmorDuplicateDiffs } from "./armor-duplicate-diffs";
import type { OwnedArmorItem } from "./armor-types";

const baseArmor: OwnedArmorItem = {
  instanceId: "base",
  hash: 1,
  name: "Virtuous Helm",
  slot: "Helmet",
  classType: "Hunter",
  type: "Helmet",
  rarity: "Legendary",
  rolledMods: [],
  isArmor30: true,
  setName: "Virtuous",
  archetype: "Paragon",
  secondaryStat: "Weapons",
  tertiaryStat: "Melee",
  tunableStat: "Grenade",
  stats: [
    { hash: 1, name: "Weapons", value: 30 },
    { hash: 2, name: "Melee", value: 20 },
    { hash: 3, name: "Grenade", value: 10 },
  ],
  location: "vault",
};

function armor(overrides: Partial<OwnedArmorItem>): OwnedArmorItem {
  return { ...baseArmor, ...overrides };
}

describe("buildArmorDuplicateDiffs", () => {
  test("highlights differing displayed stats and tunings within same set and archetype", () => {
    const diffs = buildArmorDuplicateDiffs([
      baseArmor,
      armor({
        instanceId: "different-tertiary",
        tertiaryStat: "Class",
        tunableStat: "Class",
        stats: [
          { hash: 1, name: "Weapons", value: 30 },
          { hash: 4, name: "Class", value: 20 },
          { hash: 3, name: "Grenade", value: 10 },
        ],
      }),
      armor({
        instanceId: "other-set",
        setName: "Untouched",
        tertiaryStat: "Class",
        tunableStat: "Class",
        stats: [{ hash: 4, name: "Class", value: 20 }],
      }),
    ]);

    expect(diffs.get("base")).toEqual({
      highlightedStatHashes: new Set([2]),
      highlightTuning: true,
    });
    expect(diffs.get("different-tertiary")).toEqual({
      highlightedStatHashes: new Set([4]),
      highlightTuning: true,
    });
    expect(diffs.has("other-set")).toBe(false);
  });
});
