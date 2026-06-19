import { describe, expect, it } from "vitest";

import type { PerkRef, WeaponDoc } from "./types";
import {
  collapseWeaponVersions,
  isCatalogWeapon,
  originTraitNamesForWeapons,
  primaryCatalogWeaponForHash,
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

  it("marks older non-craftable reprisals superseded and copies source onto the newest def", () => {
    const result = reconcileCraftableTwins([
      weapon(1664372054, "Threat Level", {
        source: "Scourge of the Past",
        seasonNumber: 5,
        releaseIndex: 29_444,
        columns: [{ kind: "Trait", perks: [perk("Rampage")] }],
        perks: ["Rampage"],
      }),
      weapon(1523151869, "Threat Level", {
        source: "Pantheon",
        releaseIndex: 35_273,
        columns: [{ kind: "Trait", perks: [perk("One-Two Punch")] }],
        perks: ["One-Two Punch"],
      }),
      weapon(950894542, "Threat Level", {
        releaseIndex: 35_285,
        columns: [{ kind: "Trait", perks: [perk("Bewildering Burst")] }],
        perks: ["Bewildering Burst"],
      }),
    ]);

    const legacy = result.find((w) => w.hash === 1664372054);
    const pantheon = result.find((w) => w.hash === 1523151869);
    const latest = result.find((w) => w.hash === 950894542);
    expect(legacy?.superseded).toBe(true);
    expect(pantheon?.superseded).toBe(true);
    expect(latest?.superseded).toBeUndefined();
    expect(latest?.source).toBe("Pantheon");
  });

  it("copies Arena Ops source onto the newest Kindled Orchid def without a collectible", () => {
    const result = reconcileCraftableTwins([
      weapon(2575506895, "Kindled Orchid", {
        source: "Crafted in a Black Armory forge",
        releaseIndex: 29_440,
        columns: [{ kind: "Trait", perks: [perk("Rampage")] }],
        perks: ["Rampage"],
      }),
      weapon(3961462214, "Kindled Orchid", {
        source: "Arena Ops",
        releaseIndex: 35_470,
        columns: [{ kind: "Trait", perks: [perk("Kill Clip")] }],
        perks: ["Kill Clip"],
      }),
      weapon(334964261, "Kindled Orchid", {
        releaseIndex: 35_490,
        columns: [{ kind: "Trait", perks: [perk("Kill Clip")] }],
        perks: ["Kill Clip"],
      }),
    ]);

    const blackArmory = result.find((w) => w.hash === 2575506895);
    const arenaOps = result.find((w) => w.hash === 3961462214);
    const latest = result.find((w) => w.hash === 334964261);
    expect(blackArmory?.superseded).toBe(true);
    expect(arenaOps?.superseded).toBe(true);
    expect(latest?.superseded).toBeUndefined();
    expect(latest?.source).toBe("Arena Ops");
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
      weapon(1, "Cynosure", { seasonNumber: 20, releaseIndex: 100 }),
      weapon(2, "Cynosure", { seasonNumber: 24, releaseIndex: 200 }),
      weapon(3, "Cynosure", { seasonNumber: 24, releaseIndex: 300 }),
    ]);

    expect(sorted.map((w) => w.hash)).toEqual([3, 2, 1]);
  });

  it("prefers higher releaseIndex over legacy season metadata (Threat Level)", () => {
    const primary = primaryWeaponVersion([
      weapon(1664372054, "Threat Level", {
        seasonNumber: 5,
        releaseIndex: 29_444,
        columns: [{ kind: "Trait", perks: [perk("Rampage")] }],
      }),
      weapon(1523151869, "Threat Level", {
        releaseIndex: 35_273,
        columns: [{ kind: "Trait", perks: [perk("One-Two Punch")] }],
      }),
      weapon(950894542, "Threat Level", {
        releaseIndex: 35_285,
        columns: [{ kind: "Trait", perks: [perk("Bewildering Burst")] }],
      }),
    ]);

    expect(primary?.hash).toBe(950894542);
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

  it("maps a raw legacy hash to the primary catalog version for saved hash surfaces", () => {
    const legacy = weapon(1664372054, "Threat Level", {
      superseded: true,
      seasonNumber: 5,
      releaseIndex: 29_444,
      columns: [{ kind: "Trait", perks: [perk("Rampage")] }],
    });
    const primary = weapon(950894542, "Threat Level", {
      releaseIndex: 35_285,
      columns: [{ kind: "Trait", perks: [perk("Bewildering Burst")] }],
    });
    const byHash = new Map([
      [legacy.hash, legacy],
      [primary.hash, primary],
    ]);
    const byName = new Map([["Threat Level", [legacy, primary]]]);

    expect(primaryCatalogWeaponForHash(1664372054, byHash, byName)?.hash).toBe(950894542);
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
