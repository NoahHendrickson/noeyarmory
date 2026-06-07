import "server-only";

import { isPopularWeaponsMockEnabled } from "./mock";

function isPopularityConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** Whether popularity counters should be read/written and surfaced in the UI. */
export function isPopularityPublishingEnabled(): boolean {
  if (isPopularWeaponsMockEnabled()) return false;
  return isPopularityConfigured();
}
