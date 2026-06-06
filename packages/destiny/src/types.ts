/** A single perk option that can appear in a weapon's column. */
export interface PerkRef {
  hash: number;
  name: string;
  /** Bungie icon path; prefix with https://www.bungie.net to render. */
  icon?: string;
  /** Whether this perk can currently drop (vs. sunset/retired). */
  currentlyCanRoll: boolean;
  enhanced?: boolean;
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
  stats: WeaponStat[];
  columns: PerkColumn[];
  /** Every perk name across all columns (deduped) — powers reverse perk search. */
  perks: string[];
  /** Every perk hash across all columns (deduped). */
  perkHashes: number[];
}

export interface WeaponIndex {
  /** Bungie manifest version this index was built from. */
  version: string;
  generatedAt: string;
  weapons: WeaponDoc[];
}
