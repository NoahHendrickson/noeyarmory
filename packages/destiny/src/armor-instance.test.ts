import { describe, expect, test } from "vitest";

import { ARMOR3_STAT_HASHES } from "./armor30-constants";
import {
  findTuningSocketIndex,
  isArmor30ItemDef,
  resolveArchetypeFromSockets,
  resolveTertiaryStat,
  resolveTunableStat,
  resolveTunableStatForInstance,
} from "./armor-instance";

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
