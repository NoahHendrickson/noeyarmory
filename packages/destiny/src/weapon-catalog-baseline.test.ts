import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { readWeaponCatalogDiffSource } from "./weapon-catalog-baseline";
import type { WeaponIndex } from "./types";

describe("readWeaponCatalogDiffSource", () => {
  test("reads the generated weapon index when it exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "weapon-diff-"));
    const weaponsFile = join(dir, "weapons.json");
    const weaponIndex: WeaponIndex = {
      version: "local",
      generatedAt: "2026-06-09T18:00:00.000Z",
      perks: [],
      weapons: [],
      weaponsByPerkName: {},
      damageTypes: [],
    };
    writeFileSync(weaponsFile, JSON.stringify(weaponIndex));

    expect(readWeaponCatalogDiffSource(weaponsFile)).toEqual(weaponIndex);
  });

  test("falls back to the committed baseline when weapons.json is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "weapon-diff-"));
    const weaponsFile = join(dir, "missing-weapons.json");

    const baseline = readWeaponCatalogDiffSource(weaponsFile);

    expect(baseline).toBeDefined();
    expect(baseline).toMatchObject({
      version: expect.any(String),
      generatedAt: expect.any(String),
      weaponHashes: expect.any(Array),
    });
    expect(baseline && "weaponHashes" in baseline && baseline.weaponHashes.length).toBeGreaterThan(
      0,
    );
  });
});
