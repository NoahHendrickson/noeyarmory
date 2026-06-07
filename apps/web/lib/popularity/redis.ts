import "server-only";

import { Redis } from "@upstash/redis";

import { isPopularityPublishingEnabled } from "./enabled";

export const ROLLING_DAYS = 7;
export const MIN_TOTAL_VIEWS = 20;
export const MIN_DISTINCT_WEAPONS = 4;
export const TOP_N = 4;
const DAY_KEY_TTL_SECONDS = 8 * 24 * 60 * 60;

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redis = null;
    return redis;
  }

  redis = new Redis({ url, token });
  return redis;
}

export function isPopularityConfigured(): boolean {
  return getRedis() != null;
}

export function dayKeyForDate(date: Date): string {
  return `popular:day:${date.toISOString().slice(0, 10)}`;
}

export function rollingDayKeys(days = ROLLING_DAYS, now = new Date()): string[] {
  const keys: string[] = [];
  for (let offset = 0; offset < days; offset++) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    keys.push(dayKeyForDate(date));
  }
  return keys;
}

export interface PopularWeaponEntry {
  hash: number;
  views: number;
}

export interface PopularWeaponsResult {
  weapons: PopularWeaponEntry[];
  totalViews: number;
  distinctWeapons: number;
}

/** Apply visibility threshold and return the top-N weapons. */
export function applyPopularThreshold(
  entries: PopularWeaponEntry[],
  {
    minTotalViews = MIN_TOTAL_VIEWS,
    minDistinctWeapons = MIN_DISTINCT_WEAPONS,
    topN = TOP_N,
  }: {
    minTotalViews?: number;
    minDistinctWeapons?: number;
    topN?: number;
  } = {},
): PopularWeaponsResult {
  const totalViews = entries.reduce((sum, entry) => sum + entry.views, 0);
  const distinctWeapons = entries.length;

  if (totalViews < minTotalViews || distinctWeapons < minDistinctWeapons) {
    return { weapons: [], totalViews, distinctWeapons };
  }

  const weapons = [...entries].sort((a, b) => b.views - a.views).slice(0, topN);
  return { weapons, totalViews, distinctWeapons };
}

function parseUnionEntries(raw: unknown): PopularWeaponEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const entries: PopularWeaponEntry[] = [];

  if (typeof raw[0] === "object" && raw[0] != null && "member" in raw[0] && "score" in raw[0]) {
    for (const item of raw) {
      if (item == null || typeof item !== "object") continue;
      const member = (item as { member?: unknown; score?: unknown }).member;
      const score = (item as { member?: unknown; score?: unknown }).score;
      if (typeof score !== "number") continue;
      const hash = Number(member);
      if (!Number.isFinite(hash) || hash <= 0 || score <= 0) continue;
      entries.push({ hash, views: score });
    }
    return entries;
  }

  for (let index = 0; index + 1 < raw.length; index += 2) {
    const hash = Number(raw[index]);
    const views = Number(raw[index + 1]);
    if (!Number.isFinite(hash) || hash <= 0 || !Number.isFinite(views) || views <= 0) continue;
    entries.push({ hash, views });
  }

  return entries;
}

export async function recordWeaponView(weaponHash: number): Promise<void> {
  if (!isPopularityPublishingEnabled()) return;

  const client = getRedis();
  if (!client) return;

  const key = dayKeyForDate(new Date());
  await client.zincrby(key, 1, String(weaponHash));
  await client.expire(key, DAY_KEY_TTL_SECONDS);
}

export async function getPopularWeapons(): Promise<PopularWeaponsResult> {
  if (!isPopularityPublishingEnabled()) {
    return { weapons: [], totalViews: 0, distinctWeapons: 0 };
  }

  const client = getRedis();
  if (!client) {
    return { weapons: [], totalViews: 0, distinctWeapons: 0 };
  }

  const dayKeys = rollingDayKeys();
  const tempKey = `popular:rolling:tmp:${crypto.randomUUID()}`;

  try {
    await client.zunionstore(tempKey, dayKeys.length, dayKeys, { aggregate: "sum" });

    const raw = await client.zrange(tempKey, 0, -1, { rev: true, withScores: true });
    const entries = parseUnionEntries(raw);
    return applyPopularThreshold(entries);
  } finally {
    await client.del(tempKey);
  }
}

/** Test-only reset of the lazy Redis client. */
export function resetPopularityRedisForTests(): void {
  redis = undefined;
}
