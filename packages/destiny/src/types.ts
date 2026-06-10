/** Raw investment-stat delta from a plug (pre stat-group scaling). */
export interface StatMod {
  hash: number;
  value: number;
}

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
  /** Non-conditional investment stat modifiers when this plug is selected. */
  statMods?: StatMod[];
}

/** One perk column on a weapon (barrel, magazine, a trait slot, origin, …). */
export interface PerkColumn {
  /** Best-effort label: Intrinsic, Barrel, Magazine, Trait, Origin Trait, … */
  kind: string;
  perks: PerkRef[];
}

/** Interned column — perk indices reference WeaponIndex.perks. */
export interface InternedPerkColumn {
  kind: string;
  perkIndices: number[];
}

export interface WeaponStat {
  hash: number;
  name: string;
  value: number;
}

/** Lightweight weapon record for browse/search (no screenshot, flavor, stats, or inline perk text). */
export interface WeaponSummary {
  hash: number;
  name: string;
  icon?: string;
  watermark?: string;
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
  /** Destiny season display name, e.g. "Season of the Wish". */
  seasonName?: string;
  /** Acquisition source from the collectible definition, e.g. "Root of Nightmares". */
  source?: string;
  /** Manifest investment-table index — proxy for add order when season is unknown. */
  releaseIndex: number;
  /** Legacy item hash superseded by a newer craftable twin (still kept for direct URL / vault). */
  superseded?: boolean;
  /** Base Ammo Generation display value (0–100); omitted when the weapon has no such stat. */
  ammoGeneration?: number;
  columns: InternedPerkColumn[];
  /** Every perk name across all columns (deduped) — powers reverse perk search. */
  perks: string[];
  /** Lowercase perk names (precomputed at build). */
  perksLower: string[];
  /** Every perk hash across all columns (deduped). */
  perkHashes: number[];
}

/** Piecewise-linear segment for stat-group scaling (manifest displayInterpolation). */
export interface StatInterpolationPoint {
  value: number;
  weight: number;
}

/** Scaled-stat entry from DestinyStatGroupDefinition — used to transform investment → display. */
export interface StatGroupScaledStat {
  statHash: number;
  maximumValue: number;
  displayInterpolation: StatInterpolationPoint[];
}

/** Compact stat-group definition shipped alongside weapon details. */
export interface StatGroupRef {
  hash: number;
  maximumValue: number;
  scaledStats: StatGroupScaledStat[];
}

/** Detail fields stored separately and loaded on demand. */
export interface WeaponDetailFields {
  hash: number;
  screenshot?: string;
  flavor?: string;
  stats: WeaponStat[];
  /** Base investment stats (pre stat-group scaling). */
  investmentStats?: WeaponStat[];
  statGroupHash?: number;
}

/** Full weapon with resolved columns — merged from summary + detail at runtime. */
export interface WeaponDoc extends Omit<WeaponSummary, "columns" | "perksLower"> {
  screenshot?: string;
  flavor?: string;
  stats: WeaponStat[];
  investmentStats?: WeaponStat[];
  statGroupHash?: number;
  columns: PerkColumn[];
}

export interface DamageTypeRef {
  hash: number;
  name: string;
  /** Bungie icon path; prefix with https://www.bungie.net to render. */
  icon?: string;
}

export interface WeaponTypeRef {
  name: string;
  /** Bungie icon path; prefix with https://www.bungie.net to render. */
  icon?: string;
}

export interface AmmoTypeRef {
  name: string;
  /** Bungie icon path from DestinyIconDefinition; prefix with https://www.bungie.net to render. */
  icon?: string;
}

export interface WeaponIndex {
  /** Bungie manifest version this index was built from. */
  version: string;
  generatedAt: string;
  /** Global interned perk catalog. */
  perks: PerkRef[];
  weapons: WeaponSummary[];
  /** Lowercase perk name → weapon hashes (precomputed at build). */
  weaponsByPerkName: Record<string, number[]>;
  /** Damage type catalog from DestinyDamageTypeDefinition (element filter icons). */
  damageTypes: DamageTypeRef[];
  /** Weapon type catalog from DestinyItemCategoryDefinition (type filter icons). */
  weaponTypes?: WeaponTypeRef[];
  /** Ammo type catalog from DestinyIconDefinition HUD icons (Primary / Special / Heavy). */
  ammoTypes?: AmmoTypeRef[];
}

export interface WeaponDetailIndex {
  version: string;
  /** Weapon hash (string key) → detail fields. */
  details: Record<string, WeaponDetailFields>;
  /** Stat groups referenced by weapon details (string key = statGroupHash). */
  statGroups?: Record<string, StatGroupRef>;
}

/** Committed hash snapshot used when no prior generated weapon index exists (e.g. CI builds). */
export interface WeaponCatalogBaseline {
  version: string;
  generatedAt: string;
  weaponHashes: number[];
}

export type WeaponCatalogDiffSource = WeaponIndex | WeaponCatalogBaseline;

/** Weapons newly introduced between two generated weapon indexes. */
export interface NewWeaponIndex {
  version: string;
  generatedAt: string;
  hasBaseline: boolean;
  baselineVersion?: string;
  baselineGeneratedAt?: string;
  newWeaponHashes: number[];
  weapons: WeaponSummary[];
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
  /** Acquisition source from the collectible definition, e.g. "Root of Nightmares". */
  source?: string;
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
  perks?: {
    name: string;
    description?: string;
    /** Pieces equipped to activate this tier (typically 2 or 4). */
    requiredSetCount?: number;
  }[];
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

/** Committed hash snapshot used when no prior generated armor index exists (e.g. CI builds). */
export interface ArmorCatalogBaseline {
  version: string;
  generatedAt: string;
  armorHashes: number[];
}

export type ArmorCatalogDiffSource = ArmorIndex | ArmorCatalogBaseline;

/** A new-armor catalog entry grouped by Armor 3.0 set (or standalone piece). */
export interface NewArmorSetGroup {
  key: string;
  name: string;
  source?: string;
  set?: Armor30SetRef;
  pieces: ArmorDoc[];
}

/** Armor newly introduced between two generated armor indexes. */
export interface NewArmorIndex {
  version: string;
  generatedAt: string;
  hasBaseline: boolean;
  baselineVersion?: string;
  baselineGeneratedAt?: string;
  newArmorHashes: number[];
  newSetHashes: number[];
  armor: ArmorDoc[];
  armor30Sets: Armor30SetRef[];
}
