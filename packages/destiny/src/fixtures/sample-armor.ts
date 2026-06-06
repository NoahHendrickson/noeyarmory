import type { ArmorDoc, PerkRef } from "../types";

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
      { hash: 3, name: "Strength", value: 20 },
      { hash: 4, name: "Discipline", value: 10 },
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
      { hash: 5, name: "Intellect", value: 30 },
      { hash: 6, name: "Discipline", value: 30 },
    ],
    columns: [
      { kind: "Perk", perks: [p(207, "Starfire Protocol", false)] },
      { kind: "Mod", perks: [p(208, "Ashes to Assets")] },
    ],
    mods: ["Starfire Protocol", "Ashes to Assets"],
    modHashes: [207, 208],
  },
];
