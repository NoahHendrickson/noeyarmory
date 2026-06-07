import "server-only";

import { getWeaponIndex } from "../weapon-index-server";
import { TOP_N, type PopularWeaponsResult } from "./redis";

/** Dev-only preview data — never enabled in production builds. */
export function isPopularWeaponsMockEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.POPULAR_WEAPONS_MOCK === "true";
}

const MOCK_VIEW_COUNTS = [48, 36, 27, 21];

/** Four weapons from the local index with fake view counts (no Redis). */
export function getMockPopularWeapons(): PopularWeaponsResult {
  const { weapons } = getWeaponIndex();
  const picks = [...weapons].sort((a, b) => a.name.localeCompare(b.name)).slice(0, TOP_N);

  const ranked = picks.map((weapon, index) => ({
    hash: weapon.hash,
    views: MOCK_VIEW_COUNTS[index] ?? 1,
  }));

  const totalViews = ranked.reduce((sum, entry) => sum + entry.views, 0);

  return {
    weapons: ranked,
    totalViews,
    distinctWeapons: ranked.length,
  };
}
