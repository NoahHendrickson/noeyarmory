/** Where an owned armor instance lives in the player's profile. */
export type ArmorLocation = "vault" | "inventory" | "equipped";

import type { Armor30SetBonus } from "@repo/destiny";

/** Client-safe owned armor shape from GET /api/armor. */
export interface OwnedArmorStat {
  hash: number;
  name: string;
  value: number;
}

export interface OwnedArmorMod {
  hash: number;
  name: string;
  icon?: string;
}

export interface OwnedArmorItem {
  instanceId: string;
  hash: number;
  name: string;
  icon?: string;
  watermark?: string;
  slot: string;
  classType: string;
  type: string;
  rarity: string;
  /** Raid or activity source, e.g. "Root of Nightmares". */
  source?: string;
  rolledMods: OwnedArmorMod[];
  isArmor30?: boolean;
  setName?: string;
  setBonuses?: Armor30SetBonus[];
  archetype?: string;
  secondaryStat?: string;
  tertiaryStat?: string;
  tunableStat?: string;
  /** Ranked Armor 3.0 stats (primary → tertiary, then the rest). */
  stats?: OwnedArmorStat[];
  location: ArmorLocation;
  /** Character that holds or wears the piece (inventory / equipped). */
  ownerCharacterId?: string;
}
