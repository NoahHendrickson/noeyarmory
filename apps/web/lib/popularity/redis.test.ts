import { afterEach, describe, expect, test } from "vitest";

import {
  applyPopularThreshold,
  dayKeyForDate,
  isPopularityConfigured,
  resetPopularityRedisForTests,
  rollingDayKeys,
  ROLLING_DAYS,
} from "./redis";

describe("dayKeyForDate", () => {
  test("uses UTC YYYY-MM-DD", () => {
    expect(dayKeyForDate(new Date("2026-06-07T15:30:00.000Z"))).toBe("popular:day:2026-06-07");
  });
});

describe("rollingDayKeys", () => {
  test("returns consecutive UTC day keys ending at today", () => {
    const now = new Date("2026-06-07T12:00:00.000Z");
    expect(rollingDayKeys(3, now)).toEqual([
      "popular:day:2026-06-07",
      "popular:day:2026-06-06",
      "popular:day:2026-06-05",
    ]);
  });

  test("defaults to ROLLING_DAYS keys", () => {
    expect(rollingDayKeys(undefined, new Date("2026-06-07T00:00:00.000Z"))).toHaveLength(
      ROLLING_DAYS,
    );
  });
});

describe("applyPopularThreshold", () => {
  const entries = [
    { hash: 1, views: 10 },
    { hash: 2, views: 6 },
    { hash: 3, views: 3 },
    { hash: 4, views: 2 },
  ];

  test("returns empty weapons when total views are below threshold", () => {
    const result = applyPopularThreshold([
      { hash: 1, views: 5 },
      { hash: 2, views: 4 },
      { hash: 3, views: 3 },
      { hash: 4, views: 2 },
    ]);
    expect(result.weapons).toEqual([]);
    expect(result.totalViews).toBe(14);
    expect(result.distinctWeapons).toBe(4);
  });

  test("returns empty weapons when distinct weapons are below threshold", () => {
    const result = applyPopularThreshold([
      { hash: 1, views: 12 },
      { hash: 2, views: 8 },
      { hash: 3, views: 5 },
    ]);
    expect(result.weapons).toEqual([]);
    expect(result.totalViews).toBe(25);
    expect(result.distinctWeapons).toBe(3);
  });

  test("returns top four weapons when both thresholds are met", () => {
    const result = applyPopularThreshold(entries);
    expect(result.weapons).toEqual(entries);
    expect(result.totalViews).toBe(21);
    expect(result.distinctWeapons).toBe(4);
  });

  test("sorts by views descending before slicing", () => {
    const result = applyPopularThreshold(
      [
        { hash: 10, views: 2 },
        { hash: 11, views: 8 },
        { hash: 12, views: 5 },
        { hash: 13, views: 3 },
        { hash: 14, views: 4 },
      ],
      { topN: 2 },
    );
    expect(result.weapons).toEqual([
      { hash: 11, views: 8 },
      { hash: 12, views: 5 },
    ]);
  });
});

describe("isPopularityConfigured", () => {
  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetPopularityRedisForTests();
  });

  test("is false when env vars are missing", () => {
    expect(isPopularityConfigured()).toBe(false);
  });

  test("is true when both env vars are set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    expect(isPopularityConfigured()).toBe(true);
  });
});
