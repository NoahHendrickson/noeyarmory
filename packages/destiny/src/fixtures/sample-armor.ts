import { ARMOR3_STAT_HASHES } from "../armor30-constants";
import type { Armor30SetRef, ArmorDoc, PerkRef } from "../types";

const p = (hash: number, name: string, currentlyCanRoll = true): PerkRef => ({
  hash,
  name,
  currentlyCanRoll,
});

/** Tiny deterministic armor dataset for tests and dev fallback. */
export const sampleArmor: ArmorDoc[] = [
  {
    hash: 101,
    name: "Virtuous Helm",
    slot: "Helmet",
    classType: "Hunter",
    type: "Helmet",
    rarity: "Legendary",
    seasonNumber: 20,
    releaseIndex: 50,
    stats: [
      { hash: 2996146975, name: "Weapons", value: 10 },
      { hash: 392767087, name: "Health", value: 15 },
    ],
    columns: [
      { kind: "Intrinsic", perks: [p(201, "Paragon", false)] },
      { kind: "Mod", perks: [p(202, "Harmonic Siphon"), p(203, "Better Already")] },
    ],
    mods: ["Paragon", "Harmonic Siphon", "Better Already"],
    modHashes: [201, 202, 203],
    setHash: 9001,
    setName: "Virtuous",
    isArmor30: true,
  },
  {
    hash: 102,
    name: "Iron Will Gauntlets",
    slot: "Gauntlets",
    classType: "Titan",
    type: "Gauntlets",
    rarity: "Legendary",
    seasonNumber: 19,
    releaseIndex: 40,
    stats: [
      { hash: ARMOR3_STAT_HASHES.Melee, name: "Melee", value: 20 },
      { hash: ARMOR3_STAT_HASHES.Grenade, name: "Grenade", value: 10 },
    ],
    columns: [
      { kind: "Intrinsic", perks: [p(204, "Iron Banner", false)] },
      { kind: "Mod", perks: [p(205, "Momentum Transfer"), p(206, "Grenade Kickstart")] },
    ],
    mods: ["Iron Banner", "Momentum Transfer", "Grenade Kickstart"],
    modHashes: [204, 205, 206],
  },
  {
    hash: 103,
    name: "Starfire Protocol",
    slot: "Chest",
    classType: "Warlock",
    type: "Chest Armor",
    rarity: "Exotic",
    seasonNumber: 1,
    releaseIndex: 10,
    stats: [
      { hash: ARMOR3_STAT_HASHES.Super, name: "Super", value: 30 },
      { hash: ARMOR3_STAT_HASHES.Grenade, name: "Grenade", value: 30 },
    ],
    columns: [
      { kind: "Perk", perks: [p(207, "Starfire Protocol", false)] },
      { kind: "Mod", perks: [p(208, "Ashes to Assets")] },
    ],
    mods: ["Starfire Protocol", "Ashes to Assets"],
    modHashes: [207, 208],
  },
];

/** Sample Armor 3.0 set bonuses for Virtuous (dev / test fallback). */
export const sampleArmor30Sets: Armor30SetRef[] = [
  {
    hash: 9001,
    name: "Virtuous",
    bonuses: [
      {
        requiredSetCount: 2,
        name: "Virtuous Synergy",
        description: "Rapidly defeating targets increases weapon damage.",
      },
      {
        requiredSetCount: 4,
        name: "Virtuous Purpose",
        description: "Defeating targets extends the duration of Virtuous Synergy.",
      },
    ],
  },
];
