import type { AmmoTypeRef } from "../types";

/**
 * Bundled ammo-type HUD icons for dev/sample fallback.
 * Paths match DestinyIconDefinition order_icon_ammo_* entries from the live manifest.
 */
export const sampleAmmoTypes: AmmoTypeRef[] = [
  {
    name: "Primary",
    icon: "/common/destiny2_content/icons/30436order_icon_ammo_primary.v2.png",
  },
  {
    name: "Special",
    icon: "/common/destiny2_content/icons/30435order_icon_ammo_special.v2.png",
  },
  {
    name: "Heavy",
    icon: "/common/destiny2_content/icons/30434order_icon_ammo_heavy.v2.png",
  },
];
