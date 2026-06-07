import "server-only";

import { isPopularWeaponsMockEnabled } from "./mock";
import { isPopularityConfigured } from "./config";

function isPopularityExplicitlyEnabled(): boolean {
  return process.env.POPULAR_WEAPONS_ENABLED === "true";
}

/** Whether popularity counters should be read/written and surfaced in the UI. */
export function isPopularityPublishingEnabled(): boolean {
  if (isPopularWeaponsMockEnabled()) return false;
  if (!isPopularityExplicitlyEnabled()) return false;
  return isPopularityConfigured();
}
