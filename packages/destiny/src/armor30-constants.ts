/** Plug category hashes for Armor 3.0 (Edge of Fate). */
export const PLUG_CATEGORY_ARMOR_ARCHETYPES = 778194869;
export const PLUG_CATEGORY_TUNING_MODS = 3481777685;
export const PLUG_CATEGORY_ARMOR3_MASTERWORKS = 2198080209;

/** Armor 3.0 stat hashes (renamed stats, same API hashes). */
export const ARMOR3_STAT_HASHES = {
  Weapons: 2996146975,
  Health: 392767087,
  Melee: 4244567218,
  Grenade: 1735777505,
  Super: 144602215,
  Class: 1943323491,
} as const;

export const ARMOR3_STAT_NAME_BY_HASH: Record<number, string> = {
  [ARMOR3_STAT_HASHES.Weapons]: "Weapons",
  [ARMOR3_STAT_HASHES.Health]: "Health",
  [ARMOR3_STAT_HASHES.Melee]: "Melee",
  [ARMOR3_STAT_HASHES.Grenade]: "Grenade",
  [ARMOR3_STAT_HASHES.Super]: "Super",
  [ARMOR3_STAT_HASHES.Class]: "Class",
};

/** Bungie manifest icon paths for Armor 3.0 stats (DestinyStatDefinition). */
export const ARMOR3_STAT_ICON_BY_HASH: Record<number, string> = {
  [ARMOR3_STAT_HASHES.Weapons]: "/common/destiny2_content/icons/bc69675acdae9e6b9a68a02fb4d62e07.png",
  [ARMOR3_STAT_HASHES.Health]: "/common/destiny2_content/icons/717b8b218cc14325a54869bef21d2964.png",
  [ARMOR3_STAT_HASHES.Melee]: "/common/destiny2_content/icons/fa534aca76d7f2d7e7b4ba4df4271b42.png",
  [ARMOR3_STAT_HASHES.Grenade]: "/common/destiny2_content/icons/065cdaabef560e5808e821cefaeaa22c.png",
  [ARMOR3_STAT_HASHES.Super]: "/common/destiny2_content/icons/585ae4ede9c3da96b34086fccccdc8cd.png",
  [ARMOR3_STAT_HASHES.Class]: "/common/destiny2_content/icons/7eb845acb5b3a4a9b7e0b2f05f5c43f1.png",
};

/** Balanced Tuning — present on every tuning socket alongside the +5/-5 mods. */
export const BALANCED_TUNING_PLUG_HASH = 3122197216;

/** Plug categories whose stat deltas should be stripped from owned armor display stats. */
export const ARMOR_STAT_PLUG_CATEGORIES = new Set([
  PLUG_CATEGORY_TUNING_MODS,
  2912171003, // EnhancementsV2Head
  3422420680, // EnhancementsV2Arms
  1526202480, // EnhancementsV2Chest
  2111701510, // EnhancementsV2Legs
  912441879, // EnhancementsV2ClassItem
  2487827355, // EnhancementsV2General
  4062965806, // ArmorModsGameplay (activity mods)
]);

/** +5/-5 tuning mod plug hashes → tuned stat hash (from DIM d2-known-values). */
export const TUNING_MOD_TO_STAT_HASH: Record<number, number> = {
  309000506: ARMOR3_STAT_HASHES.Grenade,
  311164277: ARMOR3_STAT_HASHES.Melee,
  323635379: ARMOR3_STAT_HASHES.Class,
  388618952: ARMOR3_STAT_HASHES.Health,
  455024236: ARMOR3_STAT_HASHES.Grenade,
  534630542: ARMOR3_STAT_HASHES.Melee,
  673231129: ARMOR3_STAT_HASHES.Super,
  691392383: ARMOR3_STAT_HASHES.Weapons,
  891771298: ARMOR3_STAT_HASHES.Weapons,
  957763733: ARMOR3_STAT_HASHES.Class,
  1510949672: ARMOR3_STAT_HASHES.Class,
  1672416975: ARMOR3_STAT_HASHES.Grenade,
  1879022254: ARMOR3_STAT_HASHES.Class,
  1918710127: ARMOR3_STAT_HASHES.Weapons,
  1922571986: ARMOR3_STAT_HASHES.Grenade,
  2125798995: ARMOR3_STAT_HASHES.Health,
  2244422610: ARMOR3_STAT_HASHES.Super,
  3121760799: ARMOR3_STAT_HASHES.Weapons,
  3284443097: ARMOR3_STAT_HASHES.Weapons,
  3310526732: ARMOR3_STAT_HASHES.Health,
  3554800389: ARMOR3_STAT_HASHES.Super,
  3681082702: ARMOR3_STAT_HASHES.Health,
  3946669007: ARMOR3_STAT_HASHES.Super,
  4020349587: ARMOR3_STAT_HASHES.Melee,
  4026414261: ARMOR3_STAT_HASHES.Super,
  4030660414: ARMOR3_STAT_HASHES.Class,
  4088823605: ARMOR3_STAT_HASHES.Health,
  4116389173: ARMOR3_STAT_HASHES.Grenade,
  4164883102: ARMOR3_STAT_HASHES.Melee,
  4210715468: ARMOR3_STAT_HASHES.Melee,
};
