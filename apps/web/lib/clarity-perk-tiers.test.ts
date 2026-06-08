import { describe, expect, it } from "vitest";

import type { ClarityLine } from "./clarity-types";
import { getClarityDisplayLines, getClarityPerkTiers } from "./clarity-perk-tiers";

const ENLIGHTENED_BASE = 3828510309;
const ENLIGHTENED_ENH = 1771736209;

const enlightenedEnhancedTail: ClarityLine = {
  linesContent: [
    { text: "", classNames: ["enhancedArrow"] },
    {
      text: " Maximum Stat Bonus is increased by 5. (50🠚55, breakdown by Stacks currently unknown)",
    },
  ],
};

describe("getClarityDisplayLines", () => {
  it("keeps enhanced-only lines with arrow markers when base and enhanced tiers merge", () => {
    const baseLines: ClarityLine[] = [{ linesContent: [{ text: "Base line" }] }];
    const enhancedLines: ClarityLine[] = [
      { linesContent: [{ text: "Base line" }] },
      { classNames: ["spacer"] },
      enlightenedEnhancedTail,
    ];

    const lines = getClarityDisplayLines({
      base: { hash: ENLIGHTENED_BASE, name: "Enlightened Action", descriptions: { en: baseLines } },
      enhanced: {
        hash: ENLIGHTENED_ENH,
        name: "Enlightened Action",
        descriptions: { en: enhancedLines },
      },
    });

    const tail = lines?.at(-1);
    expect(tail?.linesContent?.some((part) => part.classNames?.includes("enhancedArrow"))).toBe(
      true,
    );
    expect(tail?.linesContent?.some((part) => part.text?.includes("50🠚55"))).toBe(true);
  });

  it("resolves Enlightened Action enhanced insight when alternateHashes is set", async () => {
    const dim = (await fetch(
      "https://database-clarity.github.io/Live-Clarity-Database/descriptions/dim.json",
    ).then((r) => r.json())) as Record<string, { hash: number; name: string; descriptions: { en?: ClarityLine[] } }>;

    const tiers = getClarityPerkTiers(dim, {
      hash: ENLIGHTENED_BASE,
      alternateHashes: [ENLIGHTENED_ENH],
    });
    const lines = getClarityDisplayLines(tiers);
    const joined = lines?.map((line) => line.linesContent?.map((p) => p.text ?? "").join("")).join("\n");

    expect(lines?.length).toBeGreaterThan(9);
    expect(joined).toContain("Maximum Stat Bonus is increased by 5");
    expect(joined).toContain("50🠚55");
  });
});
