import { describe, expect, test } from "vitest";

import { createPerkNameFuse, filterPerkNames, rankPerkNames } from "./suggest";

describe("filterPerkNames", () => {
  const names = ["Surrounded", "Firefly", "Rampage"];

  test("substring matches", () => {
    const results = filterPerkNames(names, "sur", null);
    expect(results.map((r) => r.name)).toEqual(["Surrounded"]);
  });

  test("fuzzy fallback for typos", () => {
    const fuse = createPerkNameFuse(names);
    const results = filterPerkNames(names, "suround", fuse);
    expect(results.some((r) => r.name === "Surrounded")).toBe(true);
    expect(results.find((r) => r.name === "Surrounded")?.searchRank).toBe(4);
  });

  test("does not fuzzy-pad when substring matches exist", () => {
    const demoPerks = [
      "Demolitionist",
      "Demoralize",
      "Deconstruct",
      "Kinetic Tremors",
      "Detonator Beam",
      "Threat Remover",
      "Remote Shield",
      "Soul Devourer",
    ];
    const fuse = createPerkNameFuse(demoPerks);
    const results = filterPerkNames(demoPerks, "demo", fuse);
    expect(results.map((r) => r.name)).toEqual(["Demolitionist", "Demoralize"]);
  });

  test("fuzzy matches typos with zero substring hits", () => {
    const demoPerks = ["Demolitionist", "Demoralize", "Deconstruct"];
    const fuse = createPerkNameFuse(demoPerks);
    const results = filterPerkNames(demoPerks, "deml", fuse);
    expect(results.some((r) => r.name === "Demolitionist")).toBe(true);
    expect(results.find((r) => r.name === "Demolitionist")?.searchRank).toBe(4);
  });
});

describe("rankPerkNames", () => {
  test("orders prefix matches before fuzzy", () => {
    const fuse = createPerkNameFuse(["Surrounded", "Sunshot"]);
    const ranked = rankPerkNames(["Surrounded", "Sunshot"], "su", fuse);
    expect(ranked[0]?.label).toBe("Sunshot");
  });
});
