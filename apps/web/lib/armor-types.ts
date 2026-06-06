/** Client-safe owned armor shape from GET /api/armor. */
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
  rolledMods: OwnedArmorMod[];
  isArmor30?: boolean;
  setName?: string;
  archetype?: string;
  tertiaryStat?: string;
  tunableStat?: string;
}
