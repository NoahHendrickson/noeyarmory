import { describe, expect, test } from "vitest";

import {
  bestGhostSuffix,
  createPerkNameFuse,
  ghostSuffix,
  matchRank,
  rankLabeledOptions,
  suggestPerkNames,
} from "./suggest";

describe("matchRank", () => {
  test("exact match ranks 0", () => {
    expect(matchRank("Fatebringer", "fatebringer")).toBe(0);
  });

  test("prefix ranks 1", () => {
    expect(matchRank("Fatebringer", "fate")).toBe(1);
  });

  test("word-boundary prefix ranks 2", () => {
    expect(matchRank("Sunshot Scout", "scout")).toBe(2);
  });

  test("contains ranks 3", () => {
    expect(matchRank("Surrounded", "round")).toBe(3);
  });

  test("no match returns null", () => {
    expect(matchRank("Firefly", "xyz")).toBeNull();
  });
});

describe("rankLabeledOptions", () => {
  const items = [
    { label: "Surrounded", popularity: 50 },
    { label: "Fatebringer", popularity: 10 },
    { label: "Sunshot Scout", popularity: 5 },
  ];

  test("prefix weapon name beats substring perk match", () => {
    const ranked = rankLabeledOptions(items, "fate", 10);
    expect(ranked[0]?.label).toBe("Fatebringer");
  });

  test("respects popularity at equal rank", () => {
    const ranked = rankLabeledOptions(
      [
        { label: "Firefly", popularity: 100 },
        { label: "Fizzled", popularity: 1 },
      ],
      "fi",
      10,
    );
    expect(ranked[0]?.label).toBe("Firefly");
  });
});

describe("ghostSuffix", () => {
  test("returns tail after typed prefix", () => {
    expect(ghostSuffix("Fatebringer", "fate")).toBe("bringer");
  });

  test("returns undefined for non-prefix match", () => {
    expect(ghostSuffix("Sunshot Scout", "scout")).toBeUndefined();
  });

  test("bestGhostSuffix picks highest-ranked candidate", () => {
    expect(
      bestGhostSuffix("fate", [
        { label: "Surrounded", popularity: 100 },
        { label: "Fatebringer", popularity: 1 },
      ]),
    ).toBe("bringer");
  });
});

describe("suggestPerkNames", () => {
  const names = ["Surrounded", "Firefly", "Rampage"];

  test("substring matches", () => {
    const results = suggestPerkNames(names, "sur", null);
    expect(results.map((r) => r.label)).toEqual(["Surrounded"]);
  });

  test("fuzzy fallback for typos", () => {
    const fuse = createPerkNameFuse(names);
    const results = suggestPerkNames(names, "suround", fuse);
    expect(results.some((r) => r.label === "Surrounded")).toBe(true);
  });
});
