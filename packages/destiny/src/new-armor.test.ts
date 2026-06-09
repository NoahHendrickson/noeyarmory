import { describe, expect, test } from "vitest";

import { buildNewArmorIndex, groupNewArmorBySet } from "./new-armor";
import type { Armor30SetRef, ArmorDoc, ArmorIndex } from "./types";

const rootSet: Armor30SetRef = {
  hash: 7001,
  name: "Root of Nightmares",
  perkNames: ["Nightmare Synergy", "Resonant Fury"],
  perks: [
    {
      name: "Nightmare Synergy",
      description: "Increases weapon damage against Tormentors.",
    },
    {
      name: "Resonant Fury",
      description: "Final blows grant bonus armor charge.",
    },
  ],
};

function armor(overrides: Partial<ArmorDoc> & Pick<ArmorDoc, "hash" | "name">): ArmorDoc {
  return {
    slot: "Helmet",
    classType: "Warlock",
    type: "Helmet",
    rarity: "Legendary",
    releaseIndex: 0,
    stats: [],
    columns: [],
    mods: [],
    modHashes: [],
    ...overrides,
  };
}

function index(overrides: Partial<ArmorIndex>): ArmorIndex {
  return {
    version: "current",
    generatedAt: "2026-06-09T17:00:00.000Z",
    armor: [],
    archetypes: [],
    armor30Sets: [],
    ...overrides,
  };
}

describe("buildNewArmorIndex", () => {
  test("returns no new armor when there is no previous index", () => {
    const current = index({
      armor: [armor({ hash: 1, name: "Abyssal Helm", isArmor30: true, setHash: rootSet.hash })],
      armor30Sets: [rootSet],
    });

    expect(buildNewArmorIndex(current)).toEqual({
      version: current.version,
      generatedAt: current.generatedAt,
      hasBaseline: false,
      newArmorHashes: [],
      newSetHashes: [],
      armor: [],
      armor30Sets: [],
    });
  });

  test("diffs against a committed hash-only baseline snapshot", () => {
    const oldPiece = armor({ hash: 1, name: "Abyssal Helm" });
    const newPiece = armor({ hash: 2, name: "Abyssal Gloves" });

    const result = buildNewArmorIndex(index({ armor: [oldPiece, newPiece] }), {
      version: "baseline",
      generatedAt: "2026-06-08T17:00:00.000Z",
      armorHashes: [1],
    });

    expect(result.hasBaseline).toBe(true);
    expect(result.newArmorHashes).toEqual([2]);
    expect(result.armor).toEqual([newPiece]);
  });

  test("includes current armor hashes that are missing from the previous index", () => {
    const oldPiece = armor({ hash: 1, name: "Abyssal Helm" });
    const newPiece = armor({ hash: 2, name: "Abyssal Gloves" });

    const result = buildNewArmorIndex(
      index({ armor: [oldPiece, newPiece] }),
      index({ version: "baseline", generatedAt: "2026-06-08T17:00:00.000Z", armor: [oldPiece] }),
    );

    expect(result.baselineVersion).toBe("baseline");
    expect(result.baselineGeneratedAt).toBe("2026-06-08T17:00:00.000Z");
    expect(result.hasBaseline).toBe(true);
    expect(result.newArmorHashes).toEqual([2]);
    expect(result.armor).toEqual([newPiece]);
  });

  test("includes set bonus metadata for new Armor 3.0 set pieces", () => {
    const newPiece = armor({
      hash: 2,
      name: "Root Vestments",
      isArmor30: true,
      setHash: rootSet.hash,
      setName: rootSet.name,
    });

    const result = buildNewArmorIndex(
      index({ armor: [newPiece], armor30Sets: [rootSet] }),
      index({ version: "baseline" }),
    );

    expect(result.newSetHashes).toEqual([rootSet.hash]);
    expect(result.armor30Sets).toEqual([rootSet]);
    expect(result.armor30Sets[0]?.perks).toEqual(rootSet.perks);
  });

  test("includes an existing Armor 3.0 set when one new piece is added to it", () => {
    const existingPiece = armor({
      hash: 1,
      name: "Root Hood",
      isArmor30: true,
      setHash: rootSet.hash,
      setName: rootSet.name,
    });
    const newPiece = armor({
      hash: 2,
      name: "Root Gloves",
      isArmor30: true,
      setHash: rootSet.hash,
      setName: rootSet.name,
    });

    const result = buildNewArmorIndex(
      index({ armor: [existingPiece, newPiece], armor30Sets: [rootSet] }),
      index({ armor: [existingPiece], armor30Sets: [rootSet] }),
    );

    expect(result.newArmorHashes).toEqual([2]);
    expect(result.newSetHashes).toEqual([rootSet.hash]);
    expect(result.armor30Sets).toEqual([rootSet]);
  });
});

describe("groupNewArmorBySet", () => {
  test("groups pieces by set hash and sorts by name", () => {
    const setPiece = armor({
      hash: 2,
      name: "Root Gloves",
      slot: "Gauntlets",
      isArmor30: true,
      setHash: rootSet.hash,
      setName: rootSet.name,
    });
    const standalone = armor({ hash: 3, name: "Zeta Helm" });

    const groups = groupNewArmorBySet({
      version: "current",
      generatedAt: "2026-06-09T17:00:00.000Z",
      hasBaseline: true,
      newArmorHashes: [2, 3],
      newSetHashes: [rootSet.hash],
      armor: [setPiece, standalone],
      armor30Sets: [rootSet],
    });

    expect(groups).toHaveLength(2);
    expect(groups[0]?.name).toBe("Root of Nightmares");
    expect(groups[0]?.pieces).toEqual([setPiece]);
    expect(groups[1]?.name).toBe("Zeta Helm");
    expect(groups[1]?.pieces).toEqual([standalone]);
  });

  test("merges multiple new pieces from the same set", () => {
    const hood = armor({
      hash: 2,
      name: "Root Hood",
      slot: "Helmet",
      isArmor30: true,
      setHash: rootSet.hash,
      setName: rootSet.name,
    });
    const gloves = armor({
      hash: 3,
      name: "Root Gloves",
      slot: "Gauntlets",
      isArmor30: true,
      setHash: rootSet.hash,
      setName: rootSet.name,
    });

    const groups = groupNewArmorBySet({
      version: "current",
      generatedAt: "2026-06-09T17:00:00.000Z",
      hasBaseline: true,
      newArmorHashes: [2, 3],
      newSetHashes: [rootSet.hash],
      armor: [gloves, hood],
      armor30Sets: [rootSet],
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.pieces.map((piece) => piece.hash)).toEqual([2, 3]);
  });
});
