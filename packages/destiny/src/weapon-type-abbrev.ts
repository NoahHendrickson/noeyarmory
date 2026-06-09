/** Destiny community shorthand for weapon itemTypeDisplayName values. */
const WEAPON_TYPE_ABBREV: Readonly<Record<string, string>> = {
  "Auto Rifle": "AR",
  "Pulse Rifle": "PR",
  "Scout Rifle": "Scout",
  "Fusion Rifle": "FR",
  "Hand Cannon": "HC",
  Shotgun: "SG",
  "Sniper Rifle": "Sniper",
  "Rocket Launcher": "RL",
  Sidearm: "Sidearm",
  "Submachine Gun": "SMG",
  "Machine Gun": "MG",
  "Combat Bow": "Bow",
  Sword: "Sword",
  Glaive: "Glaive",
  "Trace Rifle": "Trace",
  "Grenade Launcher": "GL",
  "Linear Fusion Rifle": "LFR",
};

/** Abbreviate a Bungie weapon type name for compact UI (e.g. "Hand Cannon" → "HC"). */
export function abbreviateWeaponType(type: string): string {
  return WEAPON_TYPE_ABBREV[type] ?? type;
}
