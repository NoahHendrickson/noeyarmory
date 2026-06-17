import { describe, expect, test } from "vitest";

import { ARMOR3_STAT_HASHES } from "./armor30-constants";
import {
  findTuningSocketIndex,
  isArmor30ItemDef,
  resolveArchetypeFromSockets,
  resolveArmor30Stats,
  resolveTertiaryStat,
  resolveTunableStat,
  resolveTunableStatForInstance,
  subtractEquippedPlugStatBonuses,
  collectArmorStatAdjustingPlugHashes,
} from "./armor-instance";

describe("subtractEquippedPlugStatBonuses", () => {
  const plugStatMap = new Map([
    [
      9001,
      [
        { hash: ARMOR3_STAT_HASHES.Health, value: -5 },
        { hash: ARMOR3_STAT_HASHES.Weapons, value: 5 },
      ],
    ],
    [9002, [{ hash: ARMOR3_STAT_HASHES.Melee, value: 10 }]],
  ]);

  test("reverses tuning and stat mod bonuses", () => {
    const stats = subtractEquippedPlugStatBonuses(
      [
        { statHash: ARMOR3_STAT_HASHES.Weapons, value: 25 },
        { statHash: ARMOR3_STAT_HASHES.Health, value: 15 },
        { statHash: ARMOR3_STAT_HASHES.Melee, value: 30 },
      ],
      [9001, 9002],
      plugStatMap,
    );

    expect(stats).toEqual([
      { statHash: ARMOR3_STAT_HASHES.Weapons, value: 20 },
      { statHash: ARMOR3_STAT_HASHES.Health, value: 20 },
      { statHash: ARMOR3_STAT_HASHES.Melee, value: 20 },
    ]);
  });

  test("returns stats unchanged when no equipped plugs match the map", () => {
    const input = [{ statHash: ARMOR3_STAT_HASHES.Weapons, value: 20 }];
    expect(subtractEquippedPlugStatBonuses(input, [123], plugStatMap)).toEqual(input);
  });
});

describe("collectArmorStatAdjustingPlugHashes", () => {
  test("includes rolled mod hashes and the equipped tuning plug only", () => {
    expect(
      collectArmorStatAdjustingPlugHashes(
        [{ plugHash: 100 }, { plugHash: 673231129 }, { plugHash: 200 }],
        [9002, 9003],
        { 1: [{ plugItemHash: 673231129 }] },
      ),
    ).toEqual(expect.arrayContaining([9002, 9003, 673231129]));
  });
});

describe("resolveArmor30Stats", () => {
  test("orders nonzero stats by value, then zero stats", () => {
    const stats = resolveArmor30Stats([
      { statHash: ARMOR3_STAT_HASHES.Weapons, value: 50 },
      { statHash: ARMOR3_STAT_HASHES.Health, value: 40 },
      { statHash: ARMOR3_STAT_HASHES.Melee, value: 30 },
      { statHash: ARMOR3_STAT_HASHES.Grenade, value: 0 },
      { statHash: ARMOR3_STAT_HASHES.Super, value: 0 },
      { statHash: ARMOR3_STAT_HASHES.Class, value: 0 },
    ]);

    expect(stats.slice(0, 3).map((s) => s.name)).toEqual(["Weapons", "Health", "Melee"]);
    expect(stats.slice(0, 3).map((s) => s.value)).toEqual([50, 40, 30]);
    expect(stats.slice(3).every((s) => s.value === 0)).toBe(true);
  });
});

describe("resolveTertiaryStat", () => {
  test("returns 3rd highest armor 3.0 stat", () => {
    const stats = [
      { statHash: ARMOR3_STAT_HASHES.Weapons, value: 50 },
      { statHash: ARMOR3_STAT_HASHES.Health, value: 40 },
      { statHash: ARMOR3_STAT_HASHES.Melee, value: 30 },
      { statHash: ARMOR3_STAT_HASHES.Grenade, value: 20 },
      { statHash: ARMOR3_STAT_HASHES.Super, value: 10 },
      { statHash: ARMOR3_STAT_HASHES.Class, value: 5 },
    ];
    expect(resolveTertiaryStat(stats)).toBe("Melee");
  });

  test("returns undefined with fewer than 3 nonzero stats", () => {
    expect(
      resolveTertiaryStat([
        { statHash: ARMOR3_STAT_HASHES.Weapons, value: 50 },
        { statHash: ARMOR3_STAT_HASHES.Health, value: 40 },
      ]),
    ).toBeUndefined();
  });
});

describe("resolveTunableStat", () => {
  test("maps +5 tuning mod hash to stat name", () => {
    expect(resolveTunableStat([{ plugItemHash: 673231129 }])).toBe("Super");
  });

  test("ignores balanced tuning and returns first +5 mod stat", () => {
    expect(
      resolveTunableStat([
        { plugItemHash: 3122197216 },
        { plugItemHash: 4116389173 },
      ]),
    ).toBe("Grenade");
  });

  test("returns undefined when no +5 mods present", () => {
    expect(resolveTunableStat([{ plugItemHash: 3122197216 }])).toBeUndefined();
  });
});

describe("resolveArchetypeFromSockets", () => {
  test("finds archetype plug by category hash", () => {
    const items = {
      100: {
        hash: 100,
        plug: { plugCategoryHash: 778194869 },
        displayProperties: { name: "Paragon" },
      },
    };
    const map = new Map<number, string>();
    expect(resolveArchetypeFromSockets([{ plugHash: 100 }], map, items)).toBe("Paragon");
  });
});

describe("resolveTunableStatForInstance", () => {
  test("reads +5 stat from tuning socket reusable plugs", () => {
    expect(
      resolveTunableStatForInstance(
        [{ plugHash: 3122197216 }],
        { 7: [{ plugItemHash: 3122197216 }, { plugItemHash: 673231129 }] },
      ),
    ).toBe("Super");
  });
});

describe("findTuningSocketIndex", () => {
  test("finds tuning socket by plug category", () => {
    const items = {
      200: { hash: 200, plug: { plugCategoryHash: 3481777685 } },
    };
    expect(findTuningSocketIndex([{ plugHash: 999 }, { plugHash: 200 }], items)).toBe(1);
  });
});

describe("isArmor30ItemDef", () => {
  test("detects armor 3.0 masterwork socket in plug set", () => {
    const item = {
      sockets: {
        socketEntries: [{ reusablePlugSetHash: 1 }],
      },
    };
    const items = {
      50: { hash: 50, plug: { plugCategoryHash: 2198080209 } },
    };
    const plugSets = { 1: { reusablePlugItems: [{ plugItemHash: 50 }] } };
    expect(isArmor30ItemDef(item, items, plugSets)).toBe(true);
  });

  test("returns false for legacy armor", () => {
    expect(isArmor30ItemDef({ sockets: { socketEntries: [] } }, {}, {})).toBe(false);
  });
});
