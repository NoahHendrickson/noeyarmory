import { describe, expect, it } from "vitest";

import type { PerkRef, WeaponDoc } from "./types";
import { isCatalogWeapon, reconcileCraftableTwins } from "./weapon-variants";

const perk = (name: string): PerkRef => ({
  hash: name.length,
  name,
  currentlyCanRoll: true,
});

function weapon(
  hash: number,
  name: string,
  extra: Partial<WeaponDoc> = {},
): WeaponDoc {
  return {
    hash,
    name,
    type: "Auto Rifle",
    element: "Kinetic",
    ammo: "Primary",
    rarity: "Legendary",
    slot: "Kinetic",
    craftable: false,
    adept: false,
    releaseIndex: hash,
    columns: [{ kind: "Trait", perks: [perk("Old Perk")] }],
    perks: ["Old Perk"],
    perkHashes: [1],
    stats: [],
    ...extra,
  };
}

describe("reconcileCraftableTwins", () => {
  it("marks legacy raid defs superseded and copies source onto the craftable twin", () => {
    const result = reconcileCraftableTwins([
      weapon(1, "Transfiguration", {
        source: "Last Wish",
        releaseIndex: 100,
        columns: [{ kind: "Trait", perks: [perk("Rampage")] }],
        perks: ["Rampage"],
      }),
      weapon(2, "Transfiguration", {
        craftable: true,
        releaseIndex: 200,
        columns: [{ kind: "Trait", perks: [perk("Discord")] }],
        perks: ["Discord"],
      }),
    ]);

    const legacy = result.find((w) => w.hash === 1);
    const modern = result.find((w) => w.hash === 2);
    expect(legacy?.superseded).toBe(true);
    expect(modern?.superseded).toBeUndefined();
    expect(modern?.source).toBe("Last Wish");
  });

  it("leaves unrelated duplicates untouched", () => {
    const result = reconcileCraftableTwins([
      weapon(1, "Fatebringer", { source: "Vault of Glass", releaseIndex: 100 }),
      weapon(2, "Fatebringer (Adept)", { releaseIndex: 200 }),
    ]);
    expect(result.every((w) => w.superseded !== true)).toBe(true);
  });
});

describe("isCatalogWeapon", () => {
  it("excludes superseded legacy hashes from browse surfaces", () => {
    expect(isCatalogWeapon({ superseded: true })).toBe(false);
    expect(isCatalogWeapon({})).toBe(true);
  });
});
