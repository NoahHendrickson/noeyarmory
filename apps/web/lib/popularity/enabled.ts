import "server-only";

import { isPopularWeaponsMockEnabled } from "./mock";

function isPopularityConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function isPopularityExplicitlyEnabled(): boolean {
  return process.env.POPULAR_WEAPONS_ENABLED === "true";
}

/** Whether popularity counters should be read/written and surfaced in the UI. */
export function isPopularityPublishingEnabled(): boolean {
  if (isPopularWeaponsMockEnabled()) return false;
  if (!isPopularityExplicitlyEnabled()) return false;
  return isPopularityConfigured();
}
