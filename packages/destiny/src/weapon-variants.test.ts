import { describe, expect, it } from "vitest";

import type { PerkRef, WeaponDoc } from "./types";
import {
  collapseWeaponVersions,
  isCatalogWeapon,
  originTraitNamesForWeapons,
  primaryWeaponVersion,
  reconcileCraftableTwins,
  sortWeaponVersions,
} from "./weapon-variants";

const perk = (name: string): PerkRef => ({
  hash: name.length,
  name,
  currentlyCanRoll: true,
});

function weapon(hash: number, name: string, extra: Partial<WeaponDoc> = {}): WeaponDoc {
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

describe("weapon version grouping", () => {
  it("sorts same-name catalog versions newest first", () => {
    const sorted = sortWeaponVersions([
      weapon(1, "Cynosure", { seasonNumber: 20, releaseIndex: 500 }),
      weapon(2, "Cynosure", { seasonNumber: 24, releaseIndex: 100 }),
      weapon(3, "Cynosure", { seasonNumber: 24, releaseIndex: 200 }),
    ]);

    expect(sorted.map((w) => w.hash)).toEqual([3, 2, 1]);
  });

  it("picks a craftable version when recency is otherwise tied", () => {
    const primary = primaryWeaponVersion([
      weapon(1, "Uncivil Discourse", { seasonNumber: 25, releaseIndex: 100 }),
      weapon(2, "Uncivil Discourse", {
        craftable: true,
        seasonNumber: 25,
        releaseIndex: 100,
      }),
    ]);

    expect(primary?.hash).toBe(2);
  });

  it("collapses exact-name catalog versions to the latest primary", () => {
    const oldOrigin = weapon(1, "Uncivil Discourse", {
      seasonNumber: 24,
      releaseIndex: 100,
      columns: [{ kind: "Origin Trait", perks: [perk("Accelerated Assault")] }],
    });
    const latestOrigin = weapon(2, "Uncivil Discourse", {
      seasonNumber: 25,
      releaseIndex: 200,
      columns: [{ kind: "Origin Trait", perks: [perk("Air-Cooled Core")] }],
    });
    const adept = weapon(3, "Uncivil Discourse (Adept)", {
      seasonNumber: 25,
      releaseIndex: 300,
    });

    expect(collapseWeaponVersions([oldOrigin, latestOrigin, adept]).map((w) => w.hash)).toEqual([
      2, 3,
    ]);
  });

  it("uses the full name group primary when only an older matching variant is present", () => {
    const oldOrigin = weapon(1, "Uncivil Discourse", {
      seasonNumber: 24,
      releaseIndex: 100,
      columns: [{ kind: "Origin Trait", perks: [perk("Accelerated Assault")] }],
    });
    const latestOrigin = weapon(2, "Uncivil Discourse", {
      seasonNumber: 25,
      releaseIndex: 200,
      columns: [{ kind: "Origin Trait", perks: [perk("Air-Cooled Core")] }],
    });
    const byName = new Map([["Uncivil Discourse", [oldOrigin, latestOrigin]]]);

    expect(collapseWeaponVersions([oldOrigin], byName).map((w) => w.hash)).toEqual([2]);
  });

  it("excludes superseded versions and aggregates origin trait options", () => {
    const legacy = weapon(1, "Cynosure", {
      superseded: true,
      releaseIndex: 100,
      columns: [{ kind: "Origin Trait", perks: [perk("Old Origin")] }],
    });
    const middle = weapon(2, "Cynosure", {
      releaseIndex: 200,
      columns: [{ kind: "Origin Trait", perks: [perk("Accelerated Assault")] }],
    });
    const latest = weapon(3, "Cynosure", {
      releaseIndex: 300,
      columns: [{ kind: "Origin Trait", perks: [perk("Air-Cooled Core")] }],
    });

    expect(collapseWeaponVersions([legacy, middle, latest]).map((w) => w.hash)).toEqual([3]);
    expect(originTraitNamesForWeapons(sortWeaponVersions([legacy, middle, latest]))).toEqual([
      "Air-Cooled Core",
      "Accelerated Assault",
    ]);
  });
});
