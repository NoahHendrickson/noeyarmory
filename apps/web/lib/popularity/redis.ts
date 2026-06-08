import "server-only";

import { Redis } from "@upstash/redis";

import { isPopularityConfigured as isPopularityEnvConfigured } from "./config";
import { isPopularityPublishingEnabled } from "./enabled";

export const ROLLING_DAYS = 7;
export const MIN_TOTAL_VIEWS = 20;
export const MIN_DISTINCT_WEAPONS = 4;
export const MIN_TOTAL_COMMITS = 20;
export const MIN_DISTINCT_PERKS = 4;
export const TOP_N = 4;
const DAY_KEY_TTL_SECONDS = 8 * 24 * 60 * 60;

const WEAPON_DAY_PREFIX = "popular:day";
const PERK_DAY_PREFIX = "popular:perk:day";

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
  return isPopularityEnvConfigured() && getRedis() != null;
}

function dayKey(prefix: string, date: Date): string {
  return `${prefix}:${date.toISOString().slice(0, 10)}`;
}

function rollingKeys(prefix: string, days: number, now: Date): string[] {
  const keys: string[] = [];
  for (let offset = 0; offset < days; offset++) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    keys.push(dayKey(prefix, date));
  }
  return keys;
}

export function dayKeyForDate(date: Date): string {
  return dayKey(WEAPON_DAY_PREFIX, date);
}

export function rollingDayKeys(days = ROLLING_DAYS, now = new Date()): string[] {
  return rollingKeys(WEAPON_DAY_PREFIX, days, now);
}

export function perkDayKeyForDate(date: Date): string {
  return dayKey(PERK_DAY_PREFIX, date);
}

export function rollingPerkDayKeys(days = ROLLING_DAYS, now = new Date()): string[] {
  return rollingKeys(PERK_DAY_PREFIX, days, now);
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

export interface PopularPerkEntry {
  name: string;
  commits: number;
}

export interface PopularPerksResult {
  perks: PopularPerkEntry[];
  totalCommits: number;
  distinctPerks: number;
}

/** Sort entries by score, returning the top-N only when both thresholds are met. */
function selectTop<T>(
  entries: T[],
  scoreOf: (entry: T) => number,
  minTotal: number,
  minDistinct: number,
  topN: number,
): { top: T[]; total: number; distinct: number } {
  const total = entries.reduce((sum, entry) => sum + scoreOf(entry), 0);
  const distinct = entries.length;

  if (total < minTotal || distinct < minDistinct) {
    return { top: [], total, distinct };
  }

  const top = [...entries].sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, topN);
  return { top, total, distinct };
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
  const { top, total, distinct } = selectTop(
    entries,
    (entry) => entry.views,
    minTotalViews,
    minDistinctWeapons,
    topN,
  );
  return { weapons: top, totalViews: total, distinctWeapons: distinct };
}

/** Apply visibility threshold and return the top-N perks. */
export function applyPopularPerkThreshold(
  entries: PopularPerkEntry[],
  {
    minTotalCommits = MIN_TOTAL_COMMITS,
    minDistinctPerks = MIN_DISTINCT_PERKS,
    topN = TOP_N,
  }: {
    minTotalCommits?: number;
    minDistinctPerks?: number;
    topN?: number;
  } = {},
): PopularPerksResult {
  const { top, total, distinct } = selectTop(
    entries,
    (entry) => entry.commits,
    minTotalCommits,
    minDistinctPerks,
    topN,
  );
  return { perks: top, totalCommits: total, distinctPerks: distinct };
}

/**
 * Parse a `zrange(..., { withScores: true })` reply into typed entries.
 *
 * Upstash returns either an array of `{ member, score }` objects or a flat
 * `[member, score, member, score, …]` array depending on client/runtime, so we
 * handle both shapes here. `parseMember` validates each (member, score) pair and
 * returns the typed entry, or `null` to skip it.
 */
function parseZRangeWithScores<T>(
  raw: unknown,
  parseMember: (member: unknown, score: number) => T | null,
): T[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const items = raw as unknown[];
  const entries: T[] = [];
  const first = items[0];

  if (typeof first === "object" && first != null && "member" in first && "score" in first) {
    for (const item of items) {
      if (item == null || typeof item !== "object") continue;
      const { member, score } = item as { member?: unknown; score?: unknown };
      if (typeof score !== "number") continue;
      const entry = parseMember(member, score);
      if (entry != null) entries.push(entry);
    }
    return entries;
  }

  for (let index = 0; index + 1 < items.length; index += 2) {
    const score = Number(items[index + 1]);
    if (!Number.isFinite(score)) continue;
    const entry = parseMember(items[index], score);
    if (entry != null) entries.push(entry);
  }

  return entries;
}

function parseUnionEntries(raw: unknown): PopularWeaponEntry[] {
  return parseZRangeWithScores(raw, (member, score) => {
    const hash = Number(member);
    if (!Number.isFinite(hash) || hash <= 0 || score <= 0) return null;
    return { hash, views: score };
  });
}

function parseUnionEntriesNamed(raw: unknown): PopularPerkEntry[] {
  return parseZRangeWithScores(raw, (member, score) => {
    if (typeof member !== "string" || !member || score <= 0) return null;
    return { name: member, commits: score };
  });
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

export async function recordPerkCommit(perkName: string): Promise<void> {
  if (!isPopularityPublishingEnabled()) return;

  const client = getRedis();
  if (!client) return;

  const key = perkDayKeyForDate(new Date());
  await client.zincrby(key, 1, perkName);
  await client.expire(key, DAY_KEY_TTL_SECONDS);
}

export async function getPopularPerks(): Promise<PopularPerksResult> {
  if (!isPopularityPublishingEnabled()) {
    return { perks: [], totalCommits: 0, distinctPerks: 0 };
  }

  const client = getRedis();
  if (!client) {
    return { perks: [], totalCommits: 0, distinctPerks: 0 };
  }

  const dayKeys = rollingPerkDayKeys();
  const tempKey = `popular:perk:rolling:tmp:${crypto.randomUUID()}`;

  try {
    await client.zunionstore(tempKey, dayKeys.length, dayKeys, { aggregate: "sum" });

    const raw = await client.zrange(tempKey, 0, -1, { rev: true, withScores: true });
    const entries = parseUnionEntriesNamed(raw);
    return applyPopularPerkThreshold(entries);
  } finally {
    await client.del(tempKey);
  }
}

/** Test-only reset of the lazy Redis client. */
export function resetPopularityRedisForTests(): void {
  redis = undefined;
}
