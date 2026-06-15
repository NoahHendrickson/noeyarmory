import { describe, expect, test } from "vitest";

import { buildNewWeaponIndex } from "./new-weapons";
import type { WeaponIndex, WeaponSummary } from "./types";

function weapon(
  overrides: Partial<WeaponSummary> & Pick<WeaponSummary, "hash" | "name">,
): WeaponSummary {
  return {
    type: "Hand Cannon",
    element: "Kinetic",
    ammo: "Primary",
    rarity: "Legendary",
    slot: "Kinetic",
    craftable: false,
    adept: false,
    releaseIndex: 0,
    columns: [],
    perks: [],
    perksLower: [],
    perkHashes: [],
    ...overrides,
  };
}

function index(overrides: Partial<WeaponIndex>): WeaponIndex {
  return {
    version: "current",
    generatedAt: "2026-06-09T17:00:00.000Z",
    perks: [],
    weapons: [],
    weaponsByPerkName: {},
    damageTypes: [],
    ...overrides,
  };
}

describe("buildNewWeaponIndex", () => {
  test("returns no new weapons when there is no previous index", () => {
    const current = index({
      weapons: [weapon({ hash: 1, name: "Fatebringer" })],
    });

    expect(buildNewWeaponIndex(current)).toEqual({
      version: current.version,
      generatedAt: current.generatedAt,
      hasBaseline: false,
      newWeaponHashes: [],
      weapons: [],
    });
  });

  test("diffs against a committed hash-only baseline snapshot", () => {
    const oldWeapon = weapon({ hash: 1, name: "Fatebringer" });
    const newWeapon = weapon({ hash: 2, name: "Bitter End" });

    const result = buildNewWeaponIndex(index({ weapons: [oldWeapon, newWeapon] }), {
      version: "baseline",
      generatedAt: "2026-06-08T17:00:00.000Z",
      weaponHashes: [1],
    });

    expect(result.hasBaseline).toBe(true);
    expect(result.newWeaponHashes).toEqual([2]);
    expect(result.weapons).toEqual([newWeapon]);
  });

  test("includes current weapon hashes that are missing from the previous index", () => {
    const oldWeapon = weapon({ hash: 1, name: "Fatebringer" });
    const newWeapon = weapon({ hash: 2, name: "Bitter End" });

    const result = buildNewWeaponIndex(
      index({ weapons: [oldWeapon, newWeapon] }),
      index({ version: "baseline", generatedAt: "2026-06-08T17:00:00.000Z", weapons: [oldWeapon] }),
    );

    expect(result.baselineVersion).toBe("baseline");
    expect(result.baselineGeneratedAt).toBe("2026-06-08T17:00:00.000Z");
    expect(result.hasBaseline).toBe(true);
    expect(result.newWeaponHashes).toEqual([2]);
    expect(result.weapons).toEqual([newWeapon]);
  });
});
