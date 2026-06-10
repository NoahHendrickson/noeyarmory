import { bench, describe } from "vitest";

import { internWeaponCatalog } from "./intern-weapons";
import type { PerkColumn, PerkRef, WeaponDoc, WeaponSummary } from "./types";
import {
  filterWeapons,
  rankWeaponResults,
  weaponsMatchingTextQuery,
  type WeaponFilters,
} from "./search";
import { buildWeaponIndexLookups } from "./weapon-index-lookups";

// ---------------------------------------------------------------------------
// Synthetic catalog — deterministic, sized like the real manifest (~1500 weapons,
// ~300 distinct perks) so numbers are comparable across runs and machines.
// ---------------------------------------------------------------------------

const CATALOG_SIZE = 1500;

const ADJECTIVES = [
  "Fatebringer", "Sunshot", "Stormcharge", "Hollow", "Gilded", "Wretched",
  "Umbral", "Radiant", "Vexed", "Sovereign", "Feral", "Ashen", "Lunar",
  "Tempest", "Ruinous", "Pale", "Brazen", "Silent", "Crimson", "Forsaken",
];
const NOUNS = [
  "Promise", "Verdict", "Oath", "Lament", "Hymn", "Reckoner", "Vigil",
  "Cadence", "Requiem", "Edge", "Warden", "Echo", "Harbinger", "Sting",
  "Truth",
];
const TYPES = [
  "Hand Cannon", "Fusion Rifle", "Scout Rifle", "Pulse Rifle", "Auto Rifle",
  "Submachine Gun", "Sniper Rifle", "Shotgun", "Rocket Launcher", "Sword",
  "Sidearm", "Bow", "Glaive", "Machine Gun", "Grenade Launcher",
];
const ELEMENTS = ["Kinetic", "Arc", "Solar", "Void", "Stasis", "Strand"];
const AMMO = ["Primary", "Special", "Heavy"];
const SLOTS = ["Kinetic", "Energy", "Power"];
const FRAMES = [
  "Adaptive Frame", "Rapid-Fire Frame", "Lightweight Frame", "Precision Frame",
  "Aggressive Frame", "High-Impact Frame",
];
const SOURCES = [
  "Vault of Glass", "Root of Nightmares", "Last Wish", "Deep Stone Crypt",
  "King's Fall", "World Loot Pool", "Crucible", "Gambit", "Vanguard Ops",
  "Duality", "Warlord's Ruin", undefined,
];

const PERK_POOL_SIZE = 300;
const perkPool: PerkRef[] = Array.from({ length: PERK_POOL_SIZE }, (_, i) => ({
  hash: 10_000 + i,
  name: `${ADJECTIVES[i % ADJECTIVES.length]} ${NOUNS[(i * 7) % NOUNS.length]} ${Math.floor(i / 20)}`,
  currentlyCanRoll: i % 5 !== 4,
}));
// A few well-known perk names players actually filter by.
perkPool[0] = { hash: 10_000, name: "Demolitionist", currentlyCanRoll: true };
perkPool[1] = { hash: 10_001, name: "Firefly", currentlyCanRoll: true };
perkPool[2] = { hash: 10_002, name: "Explosive Payload", currentlyCanRoll: true };
perkPool[3] = { hash: 10_003, name: "Frenzy", currentlyCanRoll: true };

function pick(offset: number, stride: number, count: number): PerkRef[] {
  const out: PerkRef[] = [];
  for (let i = 0; i < count; i++) {
    out.push(perkPool[(offset + i * stride) % PERK_POOL_SIZE]!);
  }
  return out;
}

function makeWeapon(i: number): WeaponDoc {
  const name = `${ADJECTIVES[i % ADJECTIVES.length]} ${NOUNS[(i * 3) % NOUNS.length]}${
    i >= ADJECTIVES.length * NOUNS.length ? ` ${Math.floor(i / (ADJECTIVES.length * NOUNS.length)) + 1}` : ""
  }`;
  const columns: PerkColumn[] = [
    { kind: "Intrinsic", perks: [{ hash: 90_000 + (i % FRAMES.length), name: FRAMES[i % FRAMES.length]!, currentlyCanRoll: false }] },
    { kind: "Barrel", perks: pick(i, 3, 4) },
    { kind: "Magazine", perks: pick(i + 40, 5, 4) },
    { kind: "Trait", perks: pick(i % 4 === 0 ? 0 : i + 80, 7, 7) },
    { kind: "Trait", perks: pick(i % 4 === 1 ? 2 : i + 160, 11, 7) },
    { kind: "Origin Trait", perks: pick(i + 240, 1, 1) },
  ];
  const allPerks = columns.flatMap((c) => c.perks);
  const seasonNumber = (i % 27) + 1;
  return {
    hash: 100_000 + i,
    name,
    type: TYPES[i % TYPES.length]!,
    element: ELEMENTS[i % ELEMENTS.length]!,
    ammo: AMMO[i % AMMO.length]!,
    rarity: i % 50 === 0 ? "Exotic" : "Legendary",
    slot: SLOTS[i % SLOTS.length]!,
    frame: FRAMES[i % FRAMES.length],
    craftable: i % 3 === 0,
    adept: i % 10 === 0,
    seasonNumber,
    seasonName: `Season ${seasonNumber}`,
    source: SOURCES[i % SOURCES.length],
    releaseIndex: i,
    stats: [],
    columns,
    perks: [...new Set(allPerks.map((p) => p.name))],
    perkHashes: allPerks.map((p) => p.hash),
  };
}

const docs = Array.from({ length: CATALOG_SIZE }, (_, i) => makeWeapon(i));
const { index } = internWeaponCatalog(docs, "bench");
const lookups = buildWeaponIndexLookups(index);
const { weapons, perks, weaponFuse, nameIndex } = lookups;

const sink = (value: WeaponSummary[]) => {
  if (value.length < 0) throw new Error("unreachable");
};

// ---------------------------------------------------------------------------
// filterWeapons — the per-keystroke catalog scan, with the filter shapes that
// exercise each hot path (facets, source canonicalization, season aliases,
// required perks + custom groups).
// ---------------------------------------------------------------------------

describe("filterWeapons", () => {
  bench("facets only (element + type + rarity)", () => {
    sink(filterWeapons(weapons, { element: ["Solar"], type: ["Fusion Rifle"], rarity: ["Legendary"] }, perks));
  });

  bench("facets + source (raid)", () => {
    sink(filterWeapons(weapons, { element: ["Arc"], source: ["Root of Nightmares"] }, perks));
  });

  bench("facets + season", () => {
    sink(filterWeapons(weapons, { type: ["Hand Cannon"], season: ["23"] }, perks));
  });

  bench("required perks + custom groups (worst case)", () => {
    sink(
      filterWeapons(
        weapons,
        {
          perks: ["Demolitionist"],
          customPerkGroups: [["Firefly", "Explosive Payload", "Frenzy"]],
          trait1: ["Demolitionist"],
        },
        perks,
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Text search + ranking — what runs on every (deferred) keystroke.
// ---------------------------------------------------------------------------

const FILTERED_300 = weapons.slice(0, 300);

describe("text search pipeline", () => {
  bench("weaponsMatchingTextQuery (short query)", () => {
    sink(weaponsMatchingTextQuery(weapons, weaponFuse, "gilded", 200, nameIndex));
  });

  bench("weaponsMatchingTextQuery (typo query)", () => {
    sink(weaponsMatchingTextQuery(weapons, weaponFuse, "gilded promse", 200, nameIndex));
  });

  bench("rankWeaponResults (300 results, name sort)", () => {
    sink(rankWeaponResults(FILTERED_300, "gilded", "name", undefined, nameIndex));
  });

  bench("full keystroke (text -> filter -> rank)", () => {
    const base = weaponsMatchingTextQuery(weapons, weaponFuse, "gilded", 200, nameIndex);
    const filtered = filterWeapons(base, { element: ["Solar"] }, perks);
    sink(rankWeaponResults(filtered, "gilded", "name", undefined, nameIndex));
  });
});

// ---------------------------------------------------------------------------
// Palette preview burst — up to ~20 hypothetical one-chip-different filter
// sets are each run through filterWeapons per keystroke.
// ---------------------------------------------------------------------------

const PREVIEW_FILTER_SETS: WeaponFilters[] = Array.from({ length: 20 }, (_, i) => ({
  element: ["Solar"],
  trait1: [perkPool[(i * 13) % PERK_POOL_SIZE]!.name],
}));

describe("preview burst", () => {
  bench("20x filterWeapons (hypothetical chips)", () => {
    for (const filters of PREVIEW_FILTER_SETS) {
      sink(filterWeapons(weapons, filters, perks));
    }
  });
});
