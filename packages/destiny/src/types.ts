/** A single perk option that can appear in a weapon's column. */
export interface PerkRef {
  hash: number;
  name: string;
  /** Bungie icon path; prefix with https://www.bungie.net to render. */
  icon?: string;
  /** Whether this perk can currently drop (vs. sunset/retired). */
  currentlyCanRoll: boolean;
  /** Bungie tooltip text for the base-tier plug. */
  description?: string;
  /** Bungie tooltip text for the enhanced-tier plug (if one exists). */
  enhancedDescription?: string;
  /** Other plug hashes for the same perk (e.g. enhanced tier) — not shown separately in the UI. */
  alternateHashes?: number[];
}

/** One perk column on a weapon (barrel, magazine, a trait slot, origin, …). */
export interface PerkColumn {
  /** Best-effort label: Intrinsic, Barrel, Magazine, Trait, Origin Trait, … */
  kind: string;
  perks: PerkRef[];
}

export interface WeaponStat {
  hash: number;
  name: string;
  value: number;
}

/** A flattened, searchable weapon record. */
export interface WeaponDoc {
  hash: number;
  name: string;
  icon?: string;
  watermark?: string;
  screenshot?: string;
  flavor?: string;
  /** itemTypeDisplayName, e.g. "Hand Cannon", "Fusion Rifle". */
  type: string;
  /** Default damage type / element, e.g. "Solar", "Arc", "Kinetic". */
  element: string;
  /** "Primary" | "Special" | "Heavy". */
  ammo: string;
  /** Tier name, e.g. "Legendary", "Exotic". */
  rarity: string;
  /** Equipment slot bucket: "Kinetic" | "Energy" | "Power". */
  slot: string;
  /** Intrinsic archetype name, e.g. "Adaptive Frame". */
  frame?: string;
  craftable: boolean;
  adept: boolean;
  /** Destiny season number when introduced (from manifest seasonHash). */
  seasonNumber?: number;
  /** Manifest investment-table index — proxy for add order when season is unknown. */
  releaseIndex: number;
  stats: WeaponStat[];
  columns: PerkColumn[];
  /** Every perk name across all columns (deduped) — powers reverse perk search. */
  perks: string[];
  /** Every perk hash across all columns (deduped). */
  perkHashes: number[];
}

export interface DamageTypeRef {
  hash: number;
  name: string;
  /** Bungie icon path; prefix with https://www.bungie.net to render. */
  icon?: string;
}

export interface WeaponIndex {
  /** Bungie manifest version this index was built from. */
  version: string;
  generatedAt: string;
  weapons: WeaponDoc[];
  /** Damage type catalog from DestinyDamageTypeDefinition (element filter icons). */
  damageTypes: DamageTypeRef[];
}

export type ArmorStat = WeaponStat;

/** A flattened, searchable armor record. */
export interface ArmorDoc {
  hash: number;
  name: string;
  icon?: string;
  watermark?: string;
  /** Helmet | Gauntlets | Chest | Legs | Class */
  slot: string;
  /** Titan | Hunter | Warlock | Any */
  classType: string;
  /** itemTypeDisplayName, e.g. "Helmet" */
  type: string;
  rarity: string;
  seasonNumber?: number;
  releaseIndex: number;
  stats: ArmorStat[];
  columns: PerkColumn[];
  /** Every mod/perk name across all columns (deduped). */
  mods: string[];
  modHashes: number[];
  /** Armor 3.0 equipable set hash, if any. */
  setHash?: number;
  /** Armor 3.0 equipable set display name, if any. */
  setName?: string;
  /** Edge of Fate armor with tier/masterwork system. */
  isArmor30?: boolean;
}

export interface ArmorArchetypeRef {
  hash: number;
  name: string;
}

export interface Armor30SetRef {
  hash: number;
  name: string;
  perkNames: string[];
}

export interface ArmorIndex {
  version: string;
  generatedAt: string;
  armor: ArmorDoc[];
  /** Global stat archetype plug catalog (Armor 3.0). */
  archetypes: ArmorArchetypeRef[];
  /** Armor 3.0 sets that have set bonus perks. */
  armor30Sets: Armor30SetRef[];
}
