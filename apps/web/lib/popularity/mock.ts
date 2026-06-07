import "server-only";

/** Dev-only flag to skip Redis reads/writes (e.g. when sharing a production Upstash DB locally). */
export function isPopularWeaponsMockEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.POPULAR_WEAPONS_MOCK === "true";
}
