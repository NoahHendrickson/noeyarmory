import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { readArmorCatalogDiffSource } from "./armor-catalog-baseline";
import type { ArmorIndex } from "./types";

describe("readArmorCatalogDiffSource", () => {
  test("reads the generated armor index when it exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "armor-diff-"));
    const armorFile = join(dir, "armor.json");
    const armorIndex: ArmorIndex = {
      version: "local",
      generatedAt: "2026-06-09T18:00:00.000Z",
      armor: [],
      archetypes: [],
      armor30Sets: [],
    };
    writeFileSync(armorFile, JSON.stringify(armorIndex));

    expect(readArmorCatalogDiffSource(armorFile)).toEqual(armorIndex);
  });

  test("falls back to the committed baseline when armor.json is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "armor-diff-"));
    const armorFile = join(dir, "missing-armor.json");

    const baseline = readArmorCatalogDiffSource(armorFile);

    expect(baseline).toBeDefined();
    expect(baseline).toMatchObject({
      version: expect.any(String),
      generatedAt: expect.any(String),
      armorHashes: expect.any(Array),
    });
    expect(baseline && "armorHashes" in baseline && baseline.armorHashes.length).toBeGreaterThan(
      0,
    );
  });
});
