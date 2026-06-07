import type { WeaponTypeRef } from "../types";
import { GENERIC_WEAPON_TYPE_ICONS } from "../weapon-type-icon-paths";

/** Bundled HUD-style weapon-type silhouettes for dev/sample fallback. */
export const sampleWeaponTypes: WeaponTypeRef[] = (
  ["Hand Cannon", "Fusion Rifle"] as const
).map((name) => ({ name, icon: GENERIC_WEAPON_TYPE_ICONS[name]! }));
