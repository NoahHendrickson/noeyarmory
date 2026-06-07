import "server-only";

import { isPopularWeaponsMockEnabled } from "./mock";

/** Whether popularity counters should be read/written and surfaced in the UI. */
export function isPopularityPublishingEnabled(): boolean {
  if (isPopularWeaponsMockEnabled()) return false;

  if (process.env.NODE_ENV === "development") return true;

  return process.env.POPULAR_WEAPONS_ENABLED === "true";
}
