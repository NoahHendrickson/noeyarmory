/** Slim, client-safe shape passed from the (server) vault page to the view. */
export interface VaultPerk {
  hash: number;
  name: string;
  icon?: string;
}

export interface VaultWeapon {
  /** Bungie item instance id — unique per owned copy. */
  instanceId: string;
  hash: number;
  name: string;
  icon?: string;
  watermark?: string;
  type: string;
  element: string;
  ammo: string;
  rarity: string;
  frame?: string;
  /** The perks actually rolled on this copy. */
  rolledPerks: VaultPerk[];
}
